import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { PortfolioData } from '../../data/interfaces';

export class AssetDefinitionEditorView {
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _onAssetDefinitionSubmitEmitter = new vscode.EventEmitter<PortfolioData>();
    private _getAllTagsCallback?: () => Promise<string[]>;
    private _getAllAccountsCallback?: () => Promise<any[]>;
    
    // Event that fires when asset definition is received
    public readonly onAssetDefinitionSubmit: vscode.Event<PortfolioData> = this._onAssetDefinitionSubmitEmitter.event;

    public constructor(extensionUri: vscode.Uri, getAllTagsCallback?: () => Promise<string[]>, getAllAccountsCallback?: () => Promise<any[]>) {
        this._extensionUri = extensionUri;
        this._getAllTagsCallback = getAllTagsCallback;
        this._getAllAccountsCallback = getAllAccountsCallback;
        
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // Create a new panel
        this._panel = vscode.window.createWebviewPanel(
            'assetDefinitionEditorView',
            'Edit Asset Definition',
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
        // This happens when the user closes the panel or when the panel is closed programmatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        
        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.type) {
                    case 'ASSET_DEFINITION_SUBMIT':
                        this._handleAssetDefinitionSubmit(message.data);
                        return;
                    case 'GET_ALL_TAGS':
                        this._handleGetAllTags();
                        return;
                    case 'GET_ALL_ACCOUNTS':
                        this._handleGetAllAccounts();
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
    }

    private _handleAssetDefinitionSubmit(data: PortfolioData) {
        // Fire the event to notify listeners
        this._onAssetDefinitionSubmitEmitter.fire(data);
    }

    private async _handleGetAllTags() {
        try {
            const tags = this._getAllTagsCallback ? await this._getAllTagsCallback() : [];
            this._panel.webview.postMessage({
                type: 'ALL_TAGS',
                data: tags
            });
        } catch (error) {
            console.error('Error getting all tags:', error);
            this._panel.webview.postMessage({
                type: 'ALL_TAGS',
                data: []
            });
        }
    }    

    private async _handleGetAllAccounts() {
        try {
            const accounts = this._getAllAccountsCallback ? await this._getAllAccountsCallback() : [];
            this._panel.webview.postMessage({
                type: 'INITIALIZE_ACCOUNTS',
                accounts: accounts
            });
        } catch (error) {
            console.error('Error getting all accounts:', error);
            this._panel.webview.postMessage({
                type: 'INITIALIZE_ACCOUNTS',
                accounts: []
            });
        }
    }

    public dispose() {
        // Clean up our resources
        this._panel.dispose();
        this._onAssetDefinitionSubmitEmitter.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.title = 'Edit Asset Definition';
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }    
    
    private _getHtmlForWebview(webview: vscode.Webview) {        try {
            // Get the path to the HTML file
            const htmlPath = path.join(this._extensionUri.fsPath, 'src', 'views', 'portfolioEdit', 'assetDefinitionEditor.html');
            
            // Read the HTML file
            let htmlContent = fs.readFileSync(htmlPath, 'utf8');
            
            // Detect current VS Code theme and inject appropriate class
            const currentTheme = vscode.window.activeColorTheme;
            let themeClass = 'vscode-light'; // default
            
            if (currentTheme.kind === vscode.ColorThemeKind.Dark) {
                themeClass = 'vscode-dark';
            } else if (currentTheme.kind === vscode.ColorThemeKind.HighContrast) {
                themeClass = 'vscode-high-contrast';
            } else if (currentTheme.kind === vscode.ColorThemeKind.HighContrastLight) {
                themeClass = 'vscode-high-contrast';
            }
            
            // Inject theme class into body element
            htmlContent = htmlContent.replace(
                '<body>',
                `<body class="${themeClass}">`
            );
            
            return htmlContent;
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to load Asset Definition Editor view: ${error}`);
            return `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Edit Asset Definition</title>
                </head>
                <body class="vscode-dark">
                    <h1>Error</h1>
                    <p>Failed to load the Asset Definition Editor view. Please check that assetDefinitionEditor.html exists.</p>
                </body>
                </html>
            `;
        }
    }    
    
    public sendInitializePortfolioData(portfolioData: PortfolioData) {
        if (this._panel && this._panel.webview) {
            // Send assets
            this._panel.webview.postMessage({
                type: 'INITIALIZE_ASSETS',
                assets: portfolioData.assets || []
            });
            
            // Send accounts if available
            if (portfolioData.accounts && portfolioData.accounts.length > 0) {
                this._panel.webview.postMessage({
                    type: 'INITIALIZE_ACCOUNTS',
                    accounts: portfolioData.accounts
                });
            }
            
            console.log('INITIALIZE_PORTFOLIO_DATA messages sent to webview');
        } else {
            console.warn('Cannot send INITIALIZE_PORTFOLIO_DATA: No active Asset Definition Editor panel');
        }
    }
    
    // Keep backward compatibility method
    public sendInitializeAssets(assets: any[]) {
        if (this._panel && this._panel.webview) {
            const message = {
                type: 'INITIALIZE_ASSETS',
                assets: assets
            };
            
            this._panel.webview.postMessage(message);
            console.log('INITIALIZE_ASSETS message sent to webview:', message);
        } else {
            console.warn('Cannot send INITIALIZE_ASSETS: No active Asset Definition Editor panel');
        }
    }
}
