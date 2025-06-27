import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Asset } from '../../data/asset';
import { AssetActivity } from '../../data/interfaces';

export class AssetPageView {
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    
    constructor(
        extensionUri: vscode.Uri,
        private asset: Asset
    ) {
        this._extensionUri = extensionUri;
        
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // Create a new panel
        this._panel = vscode.window.createWebviewPanel(
            'assetPageView',
            `Asset: ${this.asset.name}`,
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
                    case 'ADD_ACTIVITY':
                        this.onAddActivity(message.data);
                        return;
                    case 'UPDATE_ACTIVITY':
                        this.onUpdateActivity(message.data);
                        return;
                    case 'DELETE_ACTIVITY':
                        this.onDeleteActivity(message.data);
                        return;
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

    // Activity management
    private async onAddActivity(data: any): Promise<void> {
        try {
            // Validate the activity data
            if (!data.type) {
                throw new Error('Activity type is required');
            }

            console.log('Activity received from frontend:', data);
            
            // Notify the webview that activity was added (frontend will handle the storage)
            this._panel.webview.postMessage({
                type: 'ACTIVITY_ADDED'
            });
        } catch (error) {
            console.error('Error adding activity:', error);
            vscode.window.showErrorMessage(`Failed to add activity: ${error}`);
        }
    }

    private async onUpdateActivity(data: any): Promise<void> {
        try {
            // TODO: Implement activity update
            vscode.window.showInformationMessage(`Activity would be updated: ${JSON.stringify(data)}`);
            
            // Refresh the data after updating
            await this.refreshData();
        } catch (error) {
            console.error('Error updating activity:', error);
            vscode.window.showErrorMessage(`Failed to update activity: ${error}`);
        }
    }

    private async onDeleteActivity(data: any): Promise<void> {
        try {
            // TODO: Implement activity deletion
            vscode.window.showInformationMessage(`Activity would be deleted: ${data.activityId}`);
            
            // Refresh the data after deleting
            await this.refreshData();
        } catch (error) {
            console.error('Error deleting activity:', error);
            vscode.window.showErrorMessage(`Failed to delete activity: ${error}`);
        }
    }

    // Data synchronization
    private async refreshData(): Promise<void> {
        try {
            // Invalidate asset cache to force fresh data
            this.asset.invalidateCache();
            
            // Send fresh data to webview
            await this.sendAssetData();
            
            console.log(`Refreshed data for asset: ${this.asset.name}`);
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
                data: summary
            };
            
            this._panel.webview.postMessage(message);
            console.log('Asset data sent to webview:', summary.definition.name);
        } catch (error) {
            console.error('Error sending asset data:', error);
            
            // Send error state to webview
            const errorMessage = {
                type: 'ERROR',
                data: {
                    message: `Failed to load asset data: ${error}`,
                    assetName: this.asset.name
                }
            };
            
            this._panel.webview.postMessage(errorMessage);
        }
    }

    // Additional message handlers
    private async onGetAllAssets(): Promise<void> {
        try {
            // Get the portfolio explorer provider from the extension context
            const portfolioExplorer = vscode.extensions.getExtension('your-extension-id')?.exports?.portfolioExplorer;
            if (portfolioExplorer) {
                const portfolioData = await portfolioExplorer.getPortfolioData();
                if (portfolioData && portfolioData.assets) {
                    this._panel.webview.postMessage({
                        type: 'ALL_ASSETS',
                        data: portfolioData.assets
                    });
                    return;
                }
            }
            
            // Fallback: get assets from the data store directly
            const allAssets = await this.getAllAssetsFromDataStore();
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
            // Access the data store from the asset
            const dataStore = (this.asset as any).dataStore;
            if (dataStore) {
                const portfolioData = await dataStore.loadPortfolioData();
                return portfolioData?.assets || [];
            }
            return [];
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
            
            const dataStore = (this.asset as any).dataStore;
            if (!dataStore) {
                throw new Error('Data store not available');
            }

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
                if (activity.type === 'transfer_in' || activity.type === 'transfer_out') {
                    // Convert to transfer format
                    const transfer: any = {
                        from: activity.type === 'transfer_out' ? this.asset.name : activity.relatedAsset,
                        to: activity.type === 'transfer_in' ? this.asset.name : activity.relatedAsset,
                        amount: activity.amount,
                        date: activity.date || currentDate, // Preserve original activity date
                        description: activity.description
                    };
                    transfers.push(transfer);
                } else {
                    // Convert to asset event format
                    const event: any = {
                        type: activity.type,
                        date: activity.date || currentDate, // Preserve original activity date
                        description: activity.description
                    };

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
                    name: this.asset.name,
                    date: currentDate,
                    events: assetEvents
                });
            }

            // Add transfers if any
            if (transfers.length > 0) {
                portfolioUpdate.transfers = transfers;
            }

            // Save the single portfolio update file
            const filename = await dataStore.saveAssetUpdate(portfolioUpdate);
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

    public dispose(): void {
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
        this._panel.title = `Asset: ${this.asset.name}`;
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
