import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class PortfolioUpdateView {
    public static currentPanel: PortfolioUpdateView | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];    public static createOrShow(extensionUri: vscode.Uri): PortfolioUpdateView {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;        // If we already have a panel, show it
        if (PortfolioUpdateView.currentPanel) {
            PortfolioUpdateView.currentPanel._panel.reveal(column);
            return PortfolioUpdateView.currentPanel;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
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

        PortfolioUpdateView.currentPanel = new PortfolioUpdateView(panel, extensionUri);
        return PortfolioUpdateView.currentPanel;
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            message => {                switch (message.type) {
                    case 'portfolioUpdate':
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
    }

    private _handlePortfolioUpdate(data: any) {
        // Handle portfolio update data
        vscode.window.showInformationMessage(`Portfolio update received: ${JSON.stringify(data, null, 2)}`);
        
        // Here you could save the data to a file, send it to an API, etc.
        // For now, we'll just show it in an information message
    }

    public dispose() {
        PortfolioUpdateView.currentPanel = undefined;

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }    private _update() {
        const webview = this._panel.webview;
        this._panel.title = 'Portfolio Update';
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        try {
            // Get the path to the HTML file
            const htmlPath = path.join(this._extensionUri.fsPath, 'src', 'portfolioUpdate.html');
            
            // Read the HTML file
            let htmlContent = fs.readFileSync(htmlPath, 'utf8');
            
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
                <body>
                    <h1>Error</h1>
                    <p>Failed to load the Portfolio Update view. Please check that portfolioUpdate.html exists.</p>
                </body>
                </html>
            `;
        }
    }

    public static sendInitializeAssets(assets: any[]) {
        if (PortfolioUpdateView.currentPanel && PortfolioUpdateView.currentPanel._panel.webview) {
            const message = {
                type: 'INITIALIZE_ASSETS',
                assets: assets
            };
            
            PortfolioUpdateView.currentPanel._panel.webview.postMessage(message);
            console.log('INITIALIZE_ASSETS message sent to webview:', message);
        } else {
            console.warn('Cannot send INITIALIZE_ASSETS: No active Portfolio Update panel');
        }
    }
}