import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { PortfolioUpdateView } from '../views/portfolioUpdateView';

export interface AssetDefinitionData {
    name: string;
    type: 'simple' | 'investment' | 'composite' | 'stock';
    currency?: string;  // Make currency optional
}

export interface PortfolioData {
    assets: AssetDefinitionData[];
}

export interface PortfolioExplorerNode extends vscode.TreeItem {
}

export class PortfolioExplorerProvider implements vscode.TreeDataProvider<PortfolioExplorerNode> {
    private _onDidChangeTreeData: vscode.EventEmitter<PortfolioExplorerNode | undefined | null | void> = new vscode.EventEmitter<PortfolioExplorerNode | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<PortfolioExplorerNode | undefined | null | void> = this._onDidChangeTreeData.event;
    private _portfolioUpdateView?: PortfolioUpdateView;

    constructor(private context: vscode.ExtensionContext) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }    getTreeItem(element: PortfolioExplorerNode): vscode.TreeItem {
        return element;
    }

    getChildren(element?: PortfolioExplorerNode): Thenable<PortfolioExplorerNode[]> {
        // Return empty array to show nothing in the tree view
        return Promise.resolve([]);
    }
    
    public async openPortfolioUpdate(): Promise<void> {
        try {
            // Get the current workspace folder
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No workspace folder is open. Please open a folder to use Portfolio Update.');
                return;
            }

            // Look for portfolio.json in the workspace root
            const portfolioJsonPath = path.join(workspaceFolder.uri.fsPath, 'portfolio.json');
            
            let portfolioData: PortfolioData | null = null;
            // Try to read portfolio.json
            if (fs.existsSync(portfolioJsonPath)) {
                try {
                    const portfolioContent = fs.readFileSync(portfolioJsonPath, 'utf8');
                    const rawPortfolioData = JSON.parse(portfolioContent) as PortfolioData;
                    
                    // Validate the structure
                    if (!rawPortfolioData.assets || !Array.isArray(rawPortfolioData.assets)) {
                        vscode.window.showErrorMessage('Invalid portfolio.json: "assets" array is required');
                        return;
                    }
                    
                    // Validate each asset
                    for (const asset of rawPortfolioData.assets) {
                        if (!asset.name || !asset.type) {
                            vscode.window.showErrorMessage('Invalid portfolio.json: Each asset must have "name" and "type" fields');
                            return;
                        }
                        
                        if (!['simple', 'investment', 'composite', 'stock'].includes(asset.type)) {
                            vscode.window.showErrorMessage(`Invalid asset type "${asset.type}". Must be one of: simple, investment, composite, stock`);
                            return;
                        }
                    }
                    
                    portfolioData = rawPortfolioData;
                    
                } catch (parseError) {
                    vscode.window.showErrorMessage(`Failed to parse portfolio.json: ${parseError}`);
                    return;
                }
            } else {
                // If portfolio.json doesn't exist, show info and create default
                const createDefault = await vscode.window.showInformationMessage(
                    'portfolio.json not found in workspace. Would you like to create a default one?',
                    'Create Default',
                    'Continue Without'
                );
                
                if (createDefault === 'Create Default') {
                    const defaultPortfolio = this.createDefaultPortfolio();
                    await this.savePortfolioToFile(portfolioJsonPath, defaultPortfolio);
                    portfolioData = defaultPortfolio;
                    vscode.window.showInformationMessage('Default portfolio.json created successfully!');
                }
            }

            // Dispose existing view if any
            if (this._portfolioUpdateView) {
                this._portfolioUpdateView.dispose();
            }

            // Create new view and hook to the event
            this._portfolioUpdateView = new PortfolioUpdateView(this.context.extensionUri);
            
            // Subscribe to portfolio update events
            this._portfolioUpdateView.onPortfolioUpdate((data: any) => {
                this.handlePortfolioUpdate(data);
            });
            
            // If we have portfolio data, send it to the webview after a short delay
            // to ensure the webview is loaded
            if (portfolioData && portfolioData.assets) {
                setTimeout(() => {
                    if (this._portfolioUpdateView) {
                        this._portfolioUpdateView.sendInitializeAssets(portfolioData!.assets);
                    }
                }, 1000);
            }
            
        } catch (error) {
            console.error('Error in openPortfolioUpdate:', error);
            vscode.window.showErrorMessage(`Failed to open Portfolio Update: ${error}`);
        }
    }

    private createDefaultPortfolio(): PortfolioData {
        return {
            assets: [
                { name: "Cash Account", type: "simple", currency: "USD" },
                { name: "Investment Portfolio", type: "investment", currency: "USD" },
                { name: "Retirement Fund", type: "composite", currency: "USD" },
                { name: "Stock Holdings", type: "stock", currency: "USD" }
            ]
        };
    }

    private async savePortfolioToFile(filePath: string, portfolioData: PortfolioData): Promise<void> {
        try {
            const jsonContent = JSON.stringify(portfolioData, null, 2);
            fs.writeFileSync(filePath, jsonContent, 'utf8');
        } catch (error) {
            console.error('Error saving portfolio.json:', error);
            throw new Error(`Failed to save portfolio.json: ${error}`);
        }
    }

    public createPortfolioUpdateView(): PortfolioUpdateView {
        // This method is kept for backward compatibility but delegates to openPortfolioUpdate
        this.openPortfolioUpdate();
        return this._portfolioUpdateView!;
    }

    public getPortfolioUpdateView(): PortfolioUpdateView | undefined {
        return this._portfolioUpdateView;
    }

    private async handlePortfolioUpdate(data: any): Promise<void> {
        try {
            // Get the current workspace folder
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No workspace folder is open. Cannot save portfolio update.');
                return;
            }

            // Create filename with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const filename = `portfolio-update-${timestamp}.json`;
            const filePath = path.join(workspaceFolder.uri.fsPath, filename);

            // Format and save the data
            const jsonContent = JSON.stringify(data, null, 2);
            fs.writeFileSync(filePath, jsonContent, 'utf8');

            // Show success message with option to open the file
            const action = await vscode.window.showInformationMessage(
                `Portfolio update saved to ${filename}`,
                'Open File'
            );

            if (action === 'Open File') {
                const document = await vscode.workspace.openTextDocument(filePath);
                await vscode.window.showTextDocument(document);
            }

            // Refresh the tree view
            this.refresh();

        } catch (error) {
            console.error('Error saving portfolio update:', error);
            vscode.window.showErrorMessage(`Failed to save portfolio update: ${error}`);
        }
    }
}
