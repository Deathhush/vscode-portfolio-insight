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
    nodeType: 'portfolio' | 'asset';
    getChildren(): Promise<PortfolioExplorerNode[]>;
}

export class PortfolioNode extends vscode.TreeItem implements PortfolioExplorerNode {
    public nodeType: 'portfolio' = 'portfolio';
    
    constructor(private provider: PortfolioExplorerProvider) {
        super('Portfolio', vscode.TreeItemCollapsibleState.Expanded);
        this.iconPath = new vscode.ThemeIcon('folder');        this.contextValue = 'portfolio';
    }
    
    async getChildren(): Promise<PortfolioExplorerNode[]> {
        const portfolioData = await this.provider.getPortfolioData();
        
        if (!portfolioData || !portfolioData.assets) {
            return [];
        }
        
        // Create asset nodes
        return portfolioData.assets.map(asset => new AssetNode(asset));
    }
}

export class AssetNode extends vscode.TreeItem implements PortfolioExplorerNode {
    public nodeType: 'asset' = 'asset';
    public assetData: AssetDefinitionData;
    
    constructor(asset: AssetDefinitionData) {
        super(asset.name, vscode.TreeItemCollapsibleState.None);        this.assetData = asset;
        // Always use package icon for all assets
        this.iconPath = new vscode.ThemeIcon('package');
        
        // Set description to show asset type
        this.description = asset.type;
        
        this.tooltip = `${asset.name} (${asset.type}${asset.currency ? `, ${asset.currency}` : ''})`;
        this.contextValue = 'asset';
    }
    
    async getChildren(): Promise<PortfolioExplorerNode[]> {
        // Asset nodes have no children
        return [];
    }
}

export class PortfolioExplorerProvider implements vscode.TreeDataProvider<PortfolioExplorerNode> {
    private _onDidChangeTreeData: vscode.EventEmitter<PortfolioExplorerNode | undefined | null | void> = new vscode.EventEmitter<PortfolioExplorerNode | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<PortfolioExplorerNode | undefined | null | void> = this._onDidChangeTreeData.event;
    private _portfolioUpdateView?: PortfolioUpdateView;
    private _portfolioData: PortfolioData | undefined = undefined;

    constructor(private context: vscode.ExtensionContext) {}

    refresh(): void {
        // Clear cached data to force reload on next access
        this.invalidatePortfolioCache();
        this._onDidChangeTreeData.fire();
    }
    
    getTreeItem(element: PortfolioExplorerNode): vscode.TreeItem {
        return element;
    }

    getChildren(element?: PortfolioExplorerNode): Thenable<PortfolioExplorerNode[]> {
        if (!element) {
            // Return the Portfolio root node
            return Promise.resolve([new PortfolioNode(this)]);
        }
        
        // Delegate to the node's getChildren method
        return element.getChildren();
    }

    public async openPortfolioUpdate(): Promise<void> {
        try {
            // Get the current workspace folder
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No workspace folder is open. Please open a folder to use Portfolio Update.');
                return;
            }

            // Look for portfolio.json in the workspace root            // Look for portfolio.json in the workspace root
            const portfolioJsonPath = path.join(workspaceFolder.uri.fsPath, 'portfolio.json');
            
            // Try to load existing portfolio data
            let portfolioData = await this.getPortfolioData();
            
            if (!portfolioData) {
                // Check if file exists but failed validation
                if (fs.existsSync(portfolioJsonPath)) {
                    vscode.window.showErrorMessage('Invalid portfolio.json file. Please check the file format and content.');
                    return;
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
            console.error('Error saving portfolio update:', error);            vscode.window.showErrorMessage(`Failed to save portfolio update: ${error}`);
        }
    }

    public async getPortfolioData(): Promise<PortfolioData | undefined> {
        // Return cached data if available
        if (this._portfolioData !== undefined) {
            return this._portfolioData;
        }

        // Load data from file and cache it
        this._portfolioData = await this.loadPortfolioDataFromFile();
        return this._portfolioData;
    }    
    
    private async loadPortfolioDataFromFile(): Promise<PortfolioData | undefined> {
        try {
            // Get the current workspace folder
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                return undefined;
            }

            // Look for portfolio.json in the workspace root
            const portfolioJsonPath = path.join(workspaceFolder.uri.fsPath, 'portfolio.json');
            
            if (!fs.existsSync(portfolioJsonPath)) {
                return undefined;
            }

            // Read and parse portfolio.json
            const portfolioContent = fs.readFileSync(portfolioJsonPath, 'utf8');
            const rawPortfolioData = JSON.parse(portfolioContent) as PortfolioData;
              // Validate the structure
            if (!rawPortfolioData.assets || !Array.isArray(rawPortfolioData.assets)) {
                console.error('Invalid portfolio.json: "assets" array is required');
                return undefined;
            }
            
            // Validate each asset
            for (const asset of rawPortfolioData.assets) {
                if (!asset.name || !asset.type) {
                    console.error('Invalid portfolio.json: Each asset must have "name" and "type" fields');
                    return undefined;
                }
                
                if (!['simple', 'investment', 'composite', 'stock'].includes(asset.type)) {
                    console.error(`Invalid asset type "${asset.type}". Must be one of: simple, investment, composite, stock`);
                    return undefined;
                }
            }
            
            return rawPortfolioData;
            
        } catch (error) {
            console.error('Error loading portfolio.json:', error);
            return undefined;
        }
    }    
    
    /**
     * Invalidates the cached portfolio data, forcing reload on next access
     */
    public invalidatePortfolioCache(): void {
        this._portfolioData = undefined;
    }
}
