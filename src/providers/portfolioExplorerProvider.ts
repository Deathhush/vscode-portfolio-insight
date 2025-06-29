import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { PortfolioUpdateView } from '../views/portfolioUpdate/portfolioUpdateView';
import { AssetDefinitionEditorView } from '../views/portfolioEdit/assetDefinitionEditorView';
import { AssetCollectionNode } from './assetCollectionNode';
import { AssetNode } from './assetNode';
import { PortfolioDataStore } from '../data/portfolioDataStore';
import { PortfolioDataAccess } from '../data/portfolioDataAccess';
import { Asset } from '../data/asset';
import { AssetPageView } from '../views/assetPage/assetPageView';
import { AssetDefinitionData, PortfolioData } from '../data/interfaces';

export interface PortfolioExplorerNode {
    nodeType: 'assets' | 'asset';
    getChildren(): Promise<PortfolioExplorerNode[]>;
    getTreeItem(): vscode.TreeItem | Promise<vscode.TreeItem>;
}

export class PortfolioExplorerProvider implements vscode.TreeDataProvider<PortfolioExplorerNode> {    private _onDidChangeTreeData: vscode.EventEmitter<PortfolioExplorerNode | undefined | null | void> = new vscode.EventEmitter<PortfolioExplorerNode | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<PortfolioExplorerNode | undefined | null | void> = this._onDidChangeTreeData.event;
    private _portfolioUpdateView?: PortfolioUpdateView;
    private _assetDefinitionEditorView?: AssetDefinitionEditorView;
    private _portfolioData: PortfolioData | undefined = undefined;
    public dataAccess: PortfolioDataAccess;
    public dataStore: PortfolioDataStore; // Keep for backward compatibility

    constructor(private context: vscode.ExtensionContext) {
        // Initialize data store with the first workspace folder
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new Error('No workspace folder available');
        }
        this.dataStore = new PortfolioDataStore(workspaceFolder);
        this.dataAccess = new PortfolioDataAccess(this.dataStore);
        
        // Listen to data updates to refresh the view
        this.dataAccess.onDataUpdated(() => {
            this.refresh();
        });
    }    
    
    refresh(): void {
        // Clear cached data to force reload on next access
        this.invalidatePortfolioCache();
        this.dataAccess.invalidateAllCaches();
        // Fire the tree data change event to refresh the view
        this._onDidChangeTreeData.fire();
        console.log('Portfolio Explorer tree view refreshed');
    }
    
    getTreeItem(element: PortfolioExplorerNode): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element.getTreeItem();
    }    
    getChildren(element?: PortfolioExplorerNode): Thenable<PortfolioExplorerNode[]> {
        if (!element) {
            // Return the Assets root node
            return Promise.resolve([new AssetCollectionNode(this)]);
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

            // Look for portfolio.json in the Assets folder
            const assetsFolder = path.join(workspaceFolder.uri.fsPath, 'Assets');
            const portfolioJsonPath = path.join(assetsFolder, 'portfolio.json');
            
            // Try to load existing portfolio data
            let portfolioData = await this.getPortfolioData();
              if (!portfolioData) {
                // Check if file exists but failed validation
                if (fs.existsSync(portfolioJsonPath)) {
                    vscode.window.showErrorMessage('Invalid Assets/portfolio.json file. Please check the file format and content.');
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

            // Create AssetUpdates folder if it doesn't exist
            const assetUpdatesFolder = path.join(workspaceFolder.uri.fsPath, 'AssetUpdates');
            if (!fs.existsSync(assetUpdatesFolder)) {
                fs.mkdirSync(assetUpdatesFolder, { recursive: true });
            }

            // Create filename with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const filename = `portfolio-update-${timestamp}.json`;
            const filePath = path.join(assetUpdatesFolder, filename);

            // Format and save the data
            const jsonContent = JSON.stringify(data, null, 2);
            fs.writeFileSync(filePath, jsonContent, 'utf8');

            // Show success message with option to open the file
            const action = await vscode.window.showInformationMessage(
                `Portfolio update saved to AssetUpdates/${filename}`,
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
            console.log('Returning cached portfolio data');
            return this._portfolioData;
        }

        console.log('Loading portfolio data via data access');
        // Load data using the data access and cache it
        this._portfolioData = await this.dataAccess.getPortfolioData();
        return this._portfolioData;
    }
    
    private async loadPortfolioDataFromFile(): Promise<PortfolioData | undefined> {
        try {
            // Get the current workspace folder
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                return undefined;
            }

            // Look for portfolio.json in the Assets folder
            const assetsFolder = path.join(workspaceFolder.uri.fsPath, 'Assets');
            const portfolioJsonPath = path.join(assetsFolder, 'portfolio.json');
            
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
        this.dataAccess.invalidateAllCaches();
    }
    public async openAssetDefinitionEditor(): Promise<void> {
        try {
            // Get the current workspace folder
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No workspace folder is open. Please open a folder to use Asset Definition Editor.');
                return;
            }

            // Try to load existing portfolio data
            let portfolioData = await this.getPortfolioData();
            
            // Dispose existing view if any
            if (this._assetDefinitionEditorView) {
                this._assetDefinitionEditorView.dispose();
            }

            // Create new view and hook to the event
            this._assetDefinitionEditorView = new AssetDefinitionEditorView(
                this.context.extensionUri,
                () => this.getAllTags()
            );
            
            // Subscribe to asset definition submit events
            this._assetDefinitionEditorView.onAssetDefinitionSubmit((data: any) => {
                this.handleAssetDefinitionSubmit(data);
            });
            
            // If we have portfolio data, send it to the webview after a short delay
            // to ensure the webview is loaded
            if (portfolioData && portfolioData.assets) {
                setTimeout(() => {
                    if (this._assetDefinitionEditorView) {
                        this._assetDefinitionEditorView.sendInitializeAssets(portfolioData!.assets);
                    }
                }, 1000);
            } else {
                // Send empty array if no portfolio data
                setTimeout(() => {
                    if (this._assetDefinitionEditorView) {
                        this._assetDefinitionEditorView.sendInitializeAssets([]);
                    }
                }, 1000);
            }
            
        } catch (error) {
            console.error('Error in openAssetDefinitionEditor:', error);
            vscode.window.showErrorMessage(`Failed to open Asset Definition Editor: ${error}`);
        }
    }
    
    private async handleAssetDefinitionSubmit(newAssets: AssetDefinitionData[]): Promise<void> {
        try {
            console.log(`Handling asset definition submit with ${newAssets.length} asset definitions`);
            
            // Get the current workspace folder
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No workspace folder is open. Cannot save asset definitions.');
                return;
            }

            const assetsFolder = path.join(workspaceFolder.uri.fsPath, 'Assets');
            const portfolioJsonPath = path.join(assetsFolder, 'portfolio.json');
            
            // Create Assets folder if it doesn't exist
            if (!fs.existsSync(assetsFolder)) {
                fs.mkdirSync(assetsFolder, { recursive: true });
            }            
            // Create backup if file exists
            if (fs.existsSync(portfolioJsonPath)) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                const backupPath = path.join(assetsFolder, `portfolio-backup-${timestamp}.json`);
                fs.copyFileSync(portfolioJsonPath, backupPath);
                console.log(`Backup created: ${backupPath}`);
            }

            // Create the new portfolio data
            const portfolioData: PortfolioData = {
                assets: newAssets
            };            
            
            // Format and save the data
            const jsonContent = JSON.stringify(portfolioData, null, 2);
            fs.writeFileSync(portfolioJsonPath, jsonContent, 'utf8');
            console.log(`Portfolio saved with ${newAssets.length} asset definitions`);

            // Clear cached data to force reload and refresh the tree view
            this.invalidatePortfolioCache();
            console.log('Portfolio cache invalidated');
            
            
            this.refresh();
                // Show success message
            const action = await vscode.window.showInformationMessage(
                `Successfully saved ${newAssets.length} asset definition(s) to Assets/portfolio.json`,
                'Open Portfolio'
            );

            if (action === 'Open Portfolio') {
                const document = await vscode.workspace.openTextDocument(portfolioJsonPath);
                await vscode.window.showTextDocument(document);
            }

        } catch (error) {            console.error('Error saving asset definitions:', error);
            vscode.window.showErrorMessage(`Failed to save asset definitions: ${error}`);
        }
    }    // Asset management
    // Asset management - delegate to PortfolioDataAccess
    public async createAsset(definition: AssetDefinitionData): Promise<Asset> {
        return await this.dataAccess.createAsset(definition);
    }

    public invalidateAssetCache(): void {
        this.dataAccess.invalidateAllCaches();
    }

    // Tags management - new functionality
    public async getAllTags(): Promise<string[]> {
        return await this.dataAccess.getAllTags();
    }


}
