import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Asset } from '../../data/asset';
import { AssetActivityData } from '../../data/interfaces';
import { AssetNode } from '../../providers/assetNode';

export class AssetPageView {
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _onDisposeEmitter = new vscode.EventEmitter<void>();
    public readonly onDispose = this._onDisposeEmitter.event;
    
    constructor(
        extensionUri: vscode.Uri,
        private assetNode: AssetNode
    ) {
        this._extensionUri = extensionUri;
        
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // Create a new panel
        this._panel = vscode.window.createWebviewPanel(
            'assetPageView',
            `Asset: ${this.assetNode.asset.fullName}`,
            column || vscode.ViewColumn.One,
            {
                // Enable javascript in the webview
                enableScripts: true,
                // Restrict the webview to only loading content from our extension's directory
                localResourceRoots: [extensionUri],
                retainContextWhenHidden: true,
                // Enable modals for better user interaction
                enableForms: true
            }
        );

        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            message => {
                console.log('Received message from webview:', message.type, message.data);
                
                switch (message.type) {
                    case 'REFRESH_DATA':
                        this.refreshData();
                        return;
                    case 'GET_ALL_ASSETS':
                        this.onGetAllAssets();
                        return;
                    case 'SAVE_ACTIVITIES':
                        console.log('SAVE_ACTIVITIES message received with data:', message.data);
                        this.onSaveActivities(message.data);
                        return;
                    case 'error':
                        vscode.window.showErrorMessage(message.message);
                        return;
                }
            },
            null,
            this._disposables
        );

        // Listen for theme changes
        vscode.window.onDidChangeActiveColorTheme(() => {
            this._update(); // Refresh webview with new theme
        }, null, this._disposables);

        // Load and send initial data
        this.sendAssetData();
    }

    // Convenience getters for type-safe access
    private get asset(): Asset {
        return this.assetNode.asset;
    }

    private get provider() {
        return this.assetNode.provider;
    }

    private get dataAccess() {
        return this.provider.dataAccess;
    }

    // Data synchronization
    private async refreshData(): Promise<void> {
        try {
            // Send fresh data to webview (no cache to invalidate)
            await this.sendAssetData();
            
            console.log(`Refreshed data for asset: ${this.asset.fullName}`);
        } catch (error) {
            console.error('Error refreshing asset data:', error);
            vscode.window.showErrorMessage(`Failed to refresh asset data: ${error}`);
        }
    }

    private async sendAssetData(): Promise<void> {
        try {
            const summary = await this.asset.generateSummary();
            
            const message = {
                type: 'ASSET_DATA',
                data: {
                    ...summary,
                    // Add fullName to the data so frontend can use it for asset identification
                    fullName: this.asset.fullName
                }
            };
            
            this._panel.webview.postMessage(message);
            console.log('Asset data sent to webview:', this.asset.fullName);
        } catch (error) {
            console.error('Error sending asset data:', error);
            
            // Send error state to webview
            const errorMessage = {
                type: 'ERROR',
                data: {
                    message: `Failed to load asset data: ${error}`,
                    assetName: this.asset.fullName
                }
            };
            
            this._panel.webview.postMessage(errorMessage);
        }
    }

    // Additional message handlers
    private async onGetAllAssets(): Promise<void> {
        try {
            // Get all assets from both standalone and accounts for transfer operations
            const portfolioData = await this.provider.getPortfolioData();
            const allAssets: any[] = [];
            
            // Add standalone assets (these don't have accounts, so name = fullName)
            portfolioData.assets.forEach(asset => {
                allAssets.push({
                    name: asset.name, // For display purposes
                    fullName: asset.name, // For identification in transfers
                    type: asset.type,
                    currency: asset.currency
                });
            });
            
            // Add account assets (these have fullName = accountName.assetName)
            if (portfolioData.accounts) {
                portfolioData.accounts.forEach(account => {
                    if (account.assets) {
                        account.assets.forEach(asset => {
                            const fullName = `${account.name}.${asset.name}`;
                            allAssets.push({
                                name: fullName, // For display purposes, show fullName
                                fullName: fullName, // For identification in transfers
                                type: asset.type,
                                currency: asset.currency
                            });
                        });
                    }
                });
            }
            
            this._panel.webview.postMessage({
                type: 'ALL_ASSETS',
                data: allAssets
            });
        } catch (error) {
            console.error('Error getting all assets:', error);
            this._panel.webview.postMessage({
                type: 'ALL_ASSETS',
                data: []
            });
        }
    }

    private async getAllAssetsFromDataStore(): Promise<any[]> {
        try {
            // Use type-safe access to the data access
            const portfolioData = await this.dataAccess.getPortfolioData();
            return portfolioData.assets;
        } catch (error) {
            console.error('Error accessing data store:', error);
            return [];
        }
    }

    private async onSaveActivities(activitiesFromFrontend?: any[]): Promise<void> {
        try {
            console.log('onSaveActivities called with data:', activitiesFromFrontend);
            console.log('Number of activities received:', activitiesFromFrontend?.length || 0);
            
            // Activities must be provided from frontend
            if (!activitiesFromFrontend || activitiesFromFrontend.length === 0) {
                console.log('No activities to save, sending ACTIVITIES_SAVED message');
                this._panel.webview.postMessage({
                    type: 'ACTIVITIES_SAVED'
                });
                return;
            }

            console.log(`Saving ${activitiesFromFrontend.length} activities from frontend:`, activitiesFromFrontend);

            // Create a new portfolio update with the activities
            await this.saveActivitiesToPortfolioUpdate(activitiesFromFrontend);
            
            // Refresh data to show saved activities
            await this.refreshData();
            
            this._panel.webview.postMessage({
                type: 'ACTIVITIES_SAVED'
            });
        } catch (error) {
            console.error('Error saving activities:', error);
            this._panel.webview.postMessage({
                type: 'SAVE_ERROR',
                data: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    private async saveActivitiesToPortfolioUpdate(activities: any[]): Promise<void> {
        try {
            console.log(`Starting saveActivitiesToPortfolioUpdate with ${activities.length} activities:`, activities);
            
            // Use type-safe access to the data access
            const dataAccess = this.dataAccess;

            // Create a single portfolio update with current date that contains all activities
            const currentDate = new Date().toISOString().split('T')[0];
            const portfolioUpdate: any = {
                date: currentDate,
                assets: [],
                transfers: []
            };

            // Group activities by type
            const assetEvents: any[] = [];
            const transfers: any[] = [];

            for (const activity of activities) {
                if (activity.type === 'transfer_in' || activity.type === 'transfer_out' || activity.type === 'buy' || activity.type === 'sell') {
                    // Convert to transfer format
                    const transfer: any = {
                        date: activity.date || currentDate // Preserve original activity date
                    };
                    
                    // Handle buy/sell vs traditional transfers
                    if (activity.type === 'buy' || activity.type === 'sell') {
                        if (activity.type === 'buy') {
                            transfer.from = activity.relatedAsset; // Money comes from related asset
                            transfer.to = this.asset.fullName;        // Shares go to current asset
                        } else { // sell
                            transfer.from = this.asset.fullName;      // Shares come from current asset
                            transfer.to = activity.relatedAsset;  // Money goes to related asset
                        }
                        
                        // Include buy/sell specific data
                        if (activity.amount) {
                            transfer.amount = activity.amount; // Use amount as base amount for shares
                        }
                        if (activity.unitPrice) {
                            transfer.unitPrice = activity.unitPrice;
                        }
                        if (activity.totalValue) {
                            transfer.totalValue = activity.totalValue;
                        } else if (activity.amount && activity.unitPrice) {
                            // Calculate totalValue from amount * unitPrice if not provided
                            transfer.totalValue = activity.amount * activity.unitPrice;
                        }
                        if (!transfer.amount && activity.totalValue) {
                            transfer.amount = activity.totalValue; // Fallback if no amount
                        }
                    } else {
                        // Traditional transfer handling
                        transfer.from = activity.type === 'transfer_out' ? this.asset.fullName : activity.relatedAsset;
                        transfer.to = activity.type === 'transfer_in' ? this.asset.fullName : activity.relatedAsset;
                        transfer.amount = activity.amount;
                    }
                    
                    // Only include description if it's provided and not empty
                    if (activity.description && activity.description.trim() !== '') {
                        transfer.description = activity.description.trim();
                    }
                    
                    transfers.push(transfer);
                } else {
                    // Convert to asset event format
                    const event: any = {
                        type: activity.type,
                        date: activity.date || currentDate // Preserve original activity date
                    };

                    // Only include description if it's provided and not empty
                    if (activity.description && activity.description.trim() !== '') {
                        event.description = activity.description.trim();
                    }

                    if (activity.type === 'snapshot') {
                        if (activity.currentValue !== undefined) {
                            event.currentValue = activity.currentValue;
                        }
                        if (activity.marketValue !== undefined) {
                            event.marketValue = activity.marketValue;
                        }
                        if (activity.shares !== undefined) {
                            event.shares = activity.shares;
                        }
                        if (activity.price !== undefined) {
                            event.price = activity.price;
                        }
                    } else if (activity.type === 'income' || activity.type === 'expense') {
                        event.amount = activity.amount;
                    }

                    assetEvents.push(event);
                }
            }

            // Add asset events if any
            if (assetEvents.length > 0) {
                portfolioUpdate.assets.push({
                    name: this.asset.fullName,
                    date: currentDate,
                    events: assetEvents
                });
            }

            // Add transfers if any
            if (transfers.length > 0) {
                portfolioUpdate.transfers = transfers;
            }

            // Save the single portfolio update file
            const filename = await dataAccess.saveAssetUpdate(portfolioUpdate);
            console.log(`Saved portfolio update to ${filename} with ${activities.length} activities:`, portfolioUpdate);
            
            // Show success message
            vscode.window.showInformationMessage(
                `Successfully saved ${activities.length} activities to ${filename}`
            );
        } catch (error) {
            console.error('Error saving activities to portfolio update:', error);
            throw error;
        }
    }

    public reveal(): void {
        this._panel.reveal();
    }

    public dispose(): void {
        // Emit dispose event before cleaning up
        this._onDisposeEmitter.fire();
        this._onDisposeEmitter.dispose();
        
        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _update(): void {
        const webview = this._panel.webview;
        this._panel.title = `Asset: ${this.assetNode.asset.fullName}`;
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        try {
            // Try to load HTML from file
            const htmlPath = path.join(this._extensionUri.fsPath, 'src', 'views', 'assetPage', 'assetPage.html');
            
            if (fs.existsSync(htmlPath)) {
                let htmlContent = fs.readFileSync(htmlPath, 'utf8');
                
                // Replace resource URIs
                htmlContent = htmlContent.replace(
                    /src="([^"]+)"/g,
                    (match, src) => {
                        const resourceUri = webview.asWebviewUri(
                            vscode.Uri.joinPath(this._extensionUri, 'src', 'views', 'assetPage', src)
                        );
                        return `src="${resourceUri}"`;
                    }
                );

                htmlContent = htmlContent.replace(
                    /href="([^"]+\.css)"/g,
                    (match, href) => {
                        const resourceUri = webview.asWebviewUri(
                            vscode.Uri.joinPath(this._extensionUri, 'src', 'views', 'assetPage', href)
                        );
                        return `href="${resourceUri}"`;
                    }
                );

                // Inject theme class
                const themeKind = vscode.window.activeColorTheme.kind;
                const themeClass = themeKind === vscode.ColorThemeKind.Dark ? 'vscode-dark' : 
                                 themeKind === vscode.ColorThemeKind.Light ? 'vscode-light' : 'vscode-high-contrast';
                
                htmlContent = htmlContent.replace(
                    /<body[^>]*>/,
                    `<body class="${themeClass}">`
                );
                
                return htmlContent;
            } else {
                throw new Error(`Asset page HTML file not found at ${htmlPath}`);
            }
        } catch (error) {
            console.error('Error loading asset page HTML:', error);
            // Return a basic error page instead of undefined
            return `
                <!DOCTYPE html>
                <html>
                <head><title>Error</title></head>
                <body>
                    <h1>Error loading asset page</h1>
                    <p>${error}</p>
                </body>
                </html>
            `;
        }
    }

    
}
