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
                        this.onSaveActivities();
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

            // Add to pending activities (will be saved when user clicks save)
            this.pendingActivities.push({
                ...data,
                date: data.date || new Date().toISOString().split('T')[0],
                id: `temp-${Date.now()}-${Math.random()}`
            });

            console.log('Activity added to pending list:', data);
            
            // Notify the webview that activity was added
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

    private pendingActivities: any[] = [];

    private async onSaveActivities(): Promise<void> {
        try {
            if (this.pendingActivities.length === 0) {
                this._panel.webview.postMessage({
                    type: 'ACTIVITIES_SAVED'
                });
                return;
            }

            // Create a new portfolio update with the pending activities
            await this.saveActivitiesToPortfolioUpdate();
            
            // Clear pending activities
            this.pendingActivities = [];
            
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

    private async saveActivitiesToPortfolioUpdate(): Promise<void> {
        try {
            const dataStore = (this.asset as any).dataStore;
            if (!dataStore) {
                throw new Error('Data store not available');
            }

            // Group activities by date
            const activitiesByDate = new Map<string, any[]>();
            
            for (const activity of this.pendingActivities) {
                const date = activity.date || new Date().toISOString().split('T')[0];
                if (!activitiesByDate.has(date)) {
                    activitiesByDate.set(date, []);
                }
                activitiesByDate.get(date)!.push(activity);
            }

            // Create portfolio updates for each date
            for (const [date, activities] of activitiesByDate) {
                const portfolioUpdate: any = {
                    date: date,
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
                            date: activity.date,
                            description: activity.description
                        };
                        transfers.push(transfer);
                    } else {
                        // Convert to asset event format
                        const event: any = {
                            type: activity.type,
                            date: activity.date,
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
                        date: date,
                        events: assetEvents
                    });
                }

                // Add transfers if any
                if (transfers.length > 0) {
                    portfolioUpdate.transfers = transfers;
                }

                // Save the portfolio update
                await dataStore.saveAssetUpdate(portfolioUpdate);
                console.log(`Saved portfolio update for ${date}:`, portfolioUpdate);
            }
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
                // Fallback inline HTML if file doesn't exist
                return this._getInlineHtml(webview);
            }
        } catch (error) {
            console.error('Error loading asset page HTML:', error);
            return this._getInlineHtml(webview);
        }
    }

    private _getInlineHtml(webview: vscode.Webview): string {
        const themeKind = vscode.window.activeColorTheme.kind;
        const themeClass = themeKind === vscode.ColorThemeKind.Dark ? 'vscode-dark' : 
                          themeKind === vscode.ColorThemeKind.Light ? 'vscode-light' : 'vscode-high-contrast';

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Asset Details</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        font-size: var(--vscode-font-size);
                        color: var(--vscode-foreground);
                        background-color: var(--vscode-editor-background);
                        margin: 0;
                        padding: 20px;
                    }
                    
                    .asset-header {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        margin-bottom: 20px;
                        padding-bottom: 10px;
                        border-bottom: 1px solid var(--vscode-panel-border);
                    }
                    
                    .asset-name {
                        margin: 0;
                        font-size: 1.5em;
                        font-weight: bold;
                    }
                    
                    .asset-type-badge {
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        padding: 4px 8px;
                        border-radius: 4px;
                        font-size: 0.8em;
                        text-transform: uppercase;
                    }
                    
                    .asset-key-data {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                        gap: 20px;
                        margin-bottom: 30px;
                    }
                    
                    .data-item {
                        background: var(--vscode-editor-inactiveSelectionBackground);
                        padding: 15px;
                        border-radius: 8px;
                        border: 1px solid var(--vscode-panel-border);
                    }
                    
                    .data-item label {
                        display: block;
                        font-weight: bold;
                        margin-bottom: 5px;
                        color: var(--vscode-descriptionForeground);
                    }
                    
                    .data-item .value {
                        font-size: 1.2em;
                        font-weight: bold;
                    }
                    
                    .asset-activities {
                        margin-top: 30px;
                    }
                    
                    .activities-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 15px;
                    }
                    
                    .btn {
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 8px 16px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-family: inherit;
                    }
                    
                    .btn:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                    
                    .activities-list {
                        background: var(--vscode-editor-inactiveSelectionBackground);
                        border: 1px solid var(--vscode-panel-border);
                        border-radius: 8px;
                        padding: 15px;
                        min-height: 200px;
                    }
                    
                    .activity-item {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 10px;
                        border-bottom: 1px solid var(--vscode-panel-border);
                    }
                    
                    .activity-item:last-child {
                        border-bottom: none;
                    }
                    
                    .activity-type {
                        font-weight: bold;
                        text-transform: capitalize;
                    }
                    
                    .loading {
                        text-align: center;
                        color: var(--vscode-descriptionForeground);
                        font-style: italic;
                    }
                    
                    .error {
                        color: var(--vscode-errorForeground);
                        background: var(--vscode-inputValidation-errorBackground);
                        border: 1px solid var(--vscode-inputValidation-errorBorder);
                        padding: 15px;
                        border-radius: 4px;
                        margin: 10px 0;
                    }
                </style>
            </head>
            <body class="${themeClass}">
                <div class="asset-header">
                    <h1 class="asset-name" id="assetName">Loading...</h1>
                    <span class="asset-type-badge" id="assetType">-</span>
                </div>
                
                <div class="asset-key-data" id="assetKeyData">
                    <div class="data-item">
                        <label>Current Value</label>
                        <span class="value" id="currentValue">Loading...</span>
                    </div>
                    <div class="data-item" id="lastMonthIncome" style="display: none;">
                        <label>Last Month Income</label>
                        <span class="value" id="lastMonthIncomeValue">-</span>
                    </div>
                </div>
                
                <div class="asset-activities">
                    <div class="activities-header">
                        <h2>Activities</h2>
                        <button class="btn" onclick="addActivity()">Add Activity</button>
                    </div>
                    <div class="activities-list" id="activitiesList">
                        <div class="loading">Loading activities...</div>
                    </div>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                    
                    // Listen for messages from the extension
                    window.addEventListener('message', event => {
                        const message = event.data;
                        console.log('Received message:', message);
                        
                        switch (message.type) {
                            case 'ASSET_DATA':
                                updateAssetDisplay(message.data);
                                break;
                            case 'ERROR':
                                showError(message.data);
                                break;
                        }
                    });
                    
                    function updateAssetDisplay(assetSummary) {
                        // Update asset header
                        document.getElementById('assetName').textContent = assetSummary.definition.name;
                        document.getElementById('assetType').textContent = assetSummary.definition.type;
                        
                        // Update current value
                        const currency = assetSummary.currentValue.currency || 'CNY';
                        const currentValue = assetSummary.currentValue.currentValue;
                        const valueInCNY = assetSummary.currentValue.valueInCNY;
                        
                        let valueDisplay = '';
                        if (currency === 'CNY') {
                            valueDisplay = '¥' + currentValue.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        } else {
                            const originalValue = currentValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                            const cnyValue = valueInCNY.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                            valueDisplay = currency + ' ' + originalValue + ' (¥' + cnyValue + ')';
                        }
                        document.getElementById('currentValue').textContent = valueDisplay;
                        
                        // Update last month income for simple assets
                        if (assetSummary.definition.type === 'simple' && assetSummary.lastMonthIncome !== undefined) {
                            document.getElementById('lastMonthIncome').style.display = 'block';
                            document.getElementById('lastMonthIncomeValue').textContent = 
                                '¥' + assetSummary.lastMonthIncome.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        }
                        
                        // Update activities
                        updateActivitiesList(assetSummary.activities);
                    }
                    
                    function updateActivitiesList(activities) {
                        const activitiesList = document.getElementById('activitiesList');
                        
                        if (activities.length === 0) {
                            activitiesList.innerHTML = '<div class="loading">No activities found.</div>';
                            return;
                        }
                        
                        activitiesList.innerHTML = activities.map(activity => {
                            let typeDisplay = activity.type.replace('_', ' ');
                            let amountDisplay = '¥' + activity.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                            
                            return \`
                                <div class="activity-item">
                                    <div>
                                        <span class="activity-type">\${typeDisplay}</span>
                                        <span style="margin-left: 10px;">\${amountDisplay}</span>
                                        \${activity.relatedAsset ? ' (' + (activity.type.includes('in') ? 'from' : 'to') + ' ' + activity.relatedAsset + ')' : ''}
                                    </div>
                                    <div>
                                        <span style="color: var(--vscode-descriptionForeground);">\${activity.date}</span>
                                        \${activity.description ? '<br><small>' + activity.description + '</small>' : ''}
                                    </div>
                                </div>
                            \`;
                        }).join('');
                    }
                    
                    function showError(errorData) {
                        document.getElementById('assetName').textContent = errorData.assetName || 'Error';
                        document.getElementById('assetType').textContent = 'Error';
                        document.getElementById('currentValue').textContent = 'Error loading';
                        
                        const activitiesList = document.getElementById('activitiesList');
                        activitiesList.innerHTML = \`
                            <div class="error">
                                \${errorData.message}
                            </div>
                        \`;
                    }
                    
                    function addActivity() {
                        // TODO: Implement add activity modal
                        vscode.postMessage({
                            type: 'ADD_ACTIVITY',
                            data: {
                                type: 'income',
                                amount: 100,
                                date: new Date().toISOString().split('T')[0]
                            }
                        });
                    }
                    
                    function refreshData() {
                        vscode.postMessage({
                            type: 'REFRESH_DATA'
                        });
                    }
                </script>
            </body>
            </html>
        `;
    }
}
