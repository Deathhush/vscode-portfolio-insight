import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class PortfolioUpdateView {
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _onPortfolioUpdateEmitter = new vscode.EventEmitter<any>();
    
    // Event that fires when portfolio update is received
    public readonly onPortfolioUpdate: vscode.Event<any> = this._onPortfolioUpdateEmitter.event;

    public constructor(extensionUri: vscode.Uri) {
        this._extensionUri = extensionUri;
        
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // Create a new panel
        this._panel = vscode.window.createWebviewPanel(
            'portfolioUpdateView',
            'Portfolio Update',
            column || vscode.ViewColumn.One,
            {
                // Enable javascript in the webview
                enableScripts: true,
                // Restrict the webview to only loading content from our extension's directory
                localResourceRoots: [extensionUri]
            }
        );

        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.type) {
                    case 'PORTFOLIO_UPDATE':
                        this._handlePortfolioUpdate(message.data);
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

    private _handlePortfolioUpdate(data: any) {
        // Fire the event to notify listeners
        this._onPortfolioUpdateEmitter.fire(data);
    }    
    
    public dispose() {
        // Clean up our resources
        this._panel.dispose();
        this._onPortfolioUpdateEmitter.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.title = 'Portfolio Update';
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }    
      private _getHtmlForWebview(webview: vscode.Webview) {
        try {
            // Get the path to the HTML file
            const htmlPath = path.join(this._extensionUri.fsPath, 'src', 'views', 'portfolioUpdate', 'portfolioUpdate.html');
            
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
            
            // Replace any relative paths with webview URIs if needed
            // For now, the HTML is self-contained so no additional resources needed
            
            return htmlContent;
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to load Portfolio Update view: ${error}`);
            return `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Portfolio Update</title>
                </head>
                <body class="vscode-dark">
                    <h1>Error</h1>
                    <p>Failed to load the Portfolio Update view. Please check that portfolioUpdate.html exists.</p>
                </body>
                </html>
            `;
        }
    }

    public sendInitializeAssets(assets: any[]) {
        if (this._panel && this._panel.webview) {
            const message = {
                type: 'INITIALIZE_ASSETS',
                assets: assets
            };
            
            this._panel.webview.postMessage(message);
            console.log('INITIALIZE_ASSETS message sent to webview:', message);
        } else {
            console.warn('Cannot send INITIALIZE_ASSETS: No active Portfolio Update panel');
        }
    }
}