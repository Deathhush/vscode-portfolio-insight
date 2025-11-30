import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Category } from '../../data/category';
import { Account } from '../../data/account';
import { Asset } from '../../data/asset';
import { AssetDailyRecordData, AssetNetValueData } from '../../data/interfaces';

// Generic collection interface for anything that can calculate value history
interface Collection {
    name: string;
    calculateCurrentValue?(): Promise<AssetNetValueData>;
    calculateTotalValue?(): Promise<AssetNetValueData>; // For Account
    calculateValueHistory(): Promise<AssetDailyRecordData[]>;
    getAssets?(): Promise<Asset[]>; // Optional - for getting asset count
    getAllAssets?(): Promise<Asset[]>; // Optional - for categories
}

export class CollectionPageView {
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _onDisposeEmitter = new vscode.EventEmitter<void>();
    public readonly onDispose = this._onDisposeEmitter.event;

    constructor(
        extensionUri: vscode.Uri,
        private collection: Collection,
        private collectionType: 'category' | 'account' | 'tag' | 'portfolio' = 'category'
    ) {
        this._extensionUri = extensionUri;

        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // Create a new panel
        this._panel = vscode.window.createWebviewPanel(
            'collectionPageView',
            `${this.getTypeLabel()}: ${this.collection.name}`,
            column || vscode.ViewColumn.One,
            {
                // Enable javascript in the webview
                enableScripts: true,
                // Restrict the webview to only loading content from our extension's directory
                localResourceRoots: [extensionUri],
                retainContextWhenHidden: true
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
        this.sendCollectionData();
    }

    private getTypeLabel(): string {
        switch (this.collectionType) {
            case 'category': return 'Category';
            case 'account': return 'Account';
            case 'tag': return 'Tag';
            case 'portfolio': return 'Portfolio';
            default: return 'Collection';
        }
    }

    // Data synchronization
    private async refreshData(): Promise<void> {
        try {
            // Send fresh data to webview
            await this.sendCollectionData();

            console.log(`Refreshed data for ${this.collectionType}: ${this.collection.name}`);
        } catch (error) {
            console.error('Error refreshing collection data:', error);
            vscode.window.showErrorMessage(`Failed to refresh collection data: ${error}`);
        }
    }

    private async sendCollectionData(): Promise<void> {
        try {
            // Calculate current value - handle both Account and Category
            let currentValue: AssetNetValueData;
            if (this.collection.calculateCurrentValue) {
                currentValue = await this.collection.calculateCurrentValue();
            } else if (this.collection.calculateTotalValue) {
                currentValue = await this.collection.calculateTotalValue();
            } else {
                throw new Error('Collection does not have a value calculation method');
            }

            const valueHistory = await this.collection.calculateValueHistory();

            // Get asset count - try both methods for compatibility
            let assetCount = 0;
            if (this.collection.getAllAssets) {
                const allAssets = await this.collection.getAllAssets();
                assetCount = allAssets.length;
            } else if (this.collection.getAssets) {
                const assets = await this.collection.getAssets();
                assetCount = assets.length;
            }

            const message = {
                type: 'COLLECTION_DATA',
                data: {
                    name: this.collection.name,
                    type: this.collectionType,
                    assetCount,
                    currentValue,
                    valueHistory
                }
            };

            this._panel.webview.postMessage(message);
            console.log('Collection data sent to webview:', this.collection.name);
        } catch (error) {
            console.error('Error sending collection data:', error);

            // Send error state to webview
            const errorMessage = {
                type: 'ERROR',
                data: {
                    message: `Failed to load collection data: ${error}`,
                    collectionName: this.collection.name
                }
            };

            this._panel.webview.postMessage(errorMessage);
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
        this._panel.title = `${this.getTypeLabel()}: ${this.collection.name}`;
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        try {
            // Try to load HTML from file
            const htmlPath = path.join(this._extensionUri.fsPath, 'src', 'views', 'collectionPage', 'collectionPage.html');

            if (fs.existsSync(htmlPath)) {
                let htmlContent = fs.readFileSync(htmlPath, 'utf8');

                // Replace resource URIs for scripts
                htmlContent = htmlContent.replace(
                    /src="\.\/libs\/([^"]+)"/g,
                    (match, filename) => {
                        const resourceUri = webview.asWebviewUri(
                            vscode.Uri.joinPath(this._extensionUri, 'src', 'views', 'assetPage', 'libs', filename)
                        );
                        return `src="${resourceUri}"`;
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
                throw new Error(`Collection page HTML file not found at ${htmlPath}`);
            }
        } catch (error) {
            console.error('Error loading collection page HTML:', error);
            // Return a basic error page instead of undefined
            return `
                <!DOCTYPE html>
                <html>
                <head><title>Error</title></head>
                <body>
                    <h1>Error loading collection page</h1>
                    <p>${error}</p>
                </body>
                </html>
            `;
        }
    }
}
