import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { PortfolioUpdateView } from '../views/portfolioUpdate/portfolioUpdateView';
import { AssetDefinitionEditorView } from '../views/portfolioEdit/assetDefinitionEditorView';
import { CategoryCollectionNode } from './categoryCollectionNode';
import { TagCollectionNode } from './tagCollectionNode';
import { PortfolioNode } from './portfolioNode';
import { PortfolioDataStore } from '../data/portfolioDataStore';
import { PortfolioDataAccess } from '../data/portfolioDataAccess';
import { AssetDefinitionData, PortfolioData, AssetDefinitionSubmissionData } from '../data/interfaces';

export interface PortfolioExplorerNode {
    nodeType: 'portfolio' | 'asset' | 'categoryCollection' | 'categoryType' | 'category' | 'tagCollection' | 'tag' | 'account';
    getChildren(): Promise<PortfolioExplorerNode[]>;
    getTreeItem(): vscode.TreeItem | Promise<vscode.TreeItem>;
}

export class PortfolioExplorerProvider implements vscode.TreeDataProvider<PortfolioExplorerNode> {    private _onDidChangeTreeData: vscode.EventEmitter<PortfolioExplorerNode | undefined | null | void> = new vscode.EventEmitter<PortfolioExplorerNode | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<PortfolioExplorerNode | undefined | null | void> = this._onDidChangeTreeData.event;
    private _portfolioUpdateView?: PortfolioUpdateView;
    private _assetDefinitionEditorView?: AssetDefinitionEditorView;    
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
            // Return Portfolio (Assets with Accounts), Categories, and Tags root nodes
            const nodes: PortfolioExplorerNode[] = [
                new PortfolioNode(this),
                new CategoryCollectionNode(this),
                new TagCollectionNode(this)
            ];
            return Promise.resolve(nodes);
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

            // Try to load existing portfolio data
            let portfolioData = await this.getPortfolioData();

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
            
            // Send portfolio data to the webview after a short delay
            // to ensure the webview is loaded
            setTimeout(() => {
                if (this._portfolioUpdateView) {
                    this._portfolioUpdateView.sendInitializePortfolioData(portfolioData);
                }
            }, 1000);
            
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
    
    public async getPortfolioData(): Promise<PortfolioData> {
        return await this.dataAccess.getPortfolioData();
    }

    /**
    * Invalidates the cached portfolio data, forcing reload on next access
    */
    public invalidatePortfolioCache(): void {        
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
                () => this.dataAccess.getAllTags(),
                () => this.getAllAccounts()
            );
            
            // Subscribe to asset definition submit events
            this._assetDefinitionEditorView.onAssetDefinitionSubmit((data: AssetDefinitionSubmissionData) => {
                this.handleAssetDefinitionSubmit(data);
            });
            
            // Send portfolio data to the webview after a short delay
            // to ensure the webview is loaded
            setTimeout(() => {
                if (this._assetDefinitionEditorView) {
                    this._assetDefinitionEditorView.sendInitializePortfolioData(portfolioData);
                }
            }, 1000);
            
        } catch (error) {
            console.error('Error in openAssetDefinitionEditor:', error);
            vscode.window.showErrorMessage(`Failed to open Asset Definition Editor: ${error}`);
        }
    }
    
    private async handleAssetDefinitionSubmit(submissionData: AssetDefinitionSubmissionData): Promise<void> {
        try {
            // Extract portfolio data and rename operations
            const portfolioData: PortfolioData = submissionData.portfolioData;
            const assets: AssetDefinitionData[] = portfolioData.assets || [];
            const accounts: any[] = portfolioData.accounts || [];
            const renameOperations = submissionData.renameOperations || [];
            
            console.log(`Handling portfolio submit with ${assets.length} assets, ${accounts.length} accounts, and ${renameOperations.length} rename operations`);
            
            // Process rename operations first
            if (renameOperations.length > 0) {
                const progressOptions: vscode.ProgressOptions = {
                    location: vscode.ProgressLocation.Notification,
                    title: 'Processing asset renames...',
                    cancellable: false
                };
                
                await vscode.window.withProgress(progressOptions, async (progress) => {
                    for (let i = 0; i < renameOperations.length; i++) {
                        const renameOp = renameOperations[i];
                        progress.report({ 
                            message: `Renaming "${renameOp.oldName}" to "${renameOp.newName}" (${i + 1}/${renameOperations.length})`,
                            increment: (100 / renameOperations.length)
                        });
                        
                        try {
                            await this.dataAccess.renameAsset(renameOp.oldName, renameOp.newName, renameOp.accountName);
                            console.log(`Successfully renamed asset: ${renameOp.oldName} -> ${renameOp.newName}${renameOp.accountName ? ` (account: ${renameOp.accountName})` : ''}`);
                        } catch (error) {
                            console.error(`Failed to rename asset ${renameOp.oldName} to ${renameOp.newName}:`, error);
                            vscode.window.showErrorMessage(`Failed to rename asset "${renameOp.oldName}" to "${renameOp.newName}": ${error}`);
                            // Continue with other renames even if one fails
                        }
                    }
                });
            }
            
            // Now save the updated portfolio data using the dataAccess layer
            // Remove renameOperations from the data before saving
            const cleanPortfolioData: PortfolioData = {
                assets: assets
            };

            // Include accounts if there are any
            if (accounts.length > 0) {
                cleanPortfolioData.accounts = accounts;
            }
            
            await this.dataAccess.savePortfolioData(cleanPortfolioData);
            console.log(`Portfolio saved with ${assets.length} assets and ${accounts.length} accounts`);

            // Clear cached data to force reload and refresh the tree view
            this.invalidatePortfolioCache();
            console.log('Portfolio cache invalidated');
            
            this.refresh();

            // Show success message
            let successMessage = `Successfully saved ${assets.length} asset(s) and ${accounts.length} account(s)`;
            if (renameOperations.length > 0) {
                successMessage += ` and processed ${renameOperations.length} rename operation(s)`;
            }
            successMessage += ' to Assets/portfolio.json';
            
            const action = await vscode.window.showInformationMessage(
                successMessage,
                'Open Portfolio'
            );

            if (action === 'Open Portfolio') {
                // Get the current workspace folder
                const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                if (workspaceFolder) {
                    const assetsFolder = path.join(workspaceFolder.uri.fsPath, 'Assets');
                    const portfolioJsonPath = path.join(assetsFolder, 'portfolio.json');
                    const document = await vscode.workspace.openTextDocument(portfolioJsonPath);
                    await vscode.window.showTextDocument(document);
                }
            }

        } catch (error) {            
            console.error('Error saving asset definitions:', error);
            vscode.window.showErrorMessage(`Failed to save asset definitions: ${error}`);
        }
    }

    public invalidateAssetCache(): void {
        this.dataAccess.invalidateAllCaches();
    }

    // Account management - delegate to PortfolioDataAccess
    public async getAllAccounts() {
        const accounts = await this.dataAccess.getAllAccounts();
        return accounts.map(account => account.definitionData);
    }

    public async createAccount(definition: any) {
        return await this.dataAccess.createAccount(definition);
    }

    // Category management - new functionality
    public async getCategoryDefinitions() {
        return await this.dataAccess.getCategoryDefinitions();
    }

    public async createCategory(definition: any) {
        return await this.dataAccess.createCategory(definition);
    }

    public async createCategoryType(definition: any) {
        return await this.dataAccess.createCategoryType(definition);
    }
}
