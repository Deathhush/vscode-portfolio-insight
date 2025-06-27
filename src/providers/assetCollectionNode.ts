import * as vscode from 'vscode';
import * as path from 'path';
import { PortfolioData, PortfolioExplorerNode, AssetDefinitionData } from './portfolioExplorerProvider';
import { AssetNode } from './assetNode';
import { PortfolioValueCalculator } from '../services/portfolioValueCalculator';

export class AssetCollectionNode extends vscode.TreeItem implements PortfolioExplorerNode {
    public nodeType: 'assets' = 'assets';
    
    constructor(
        private provider: { getPortfolioData(): Promise<PortfolioData | undefined> },
        description?: string
    ) {
        super('Assets', vscode.TreeItemCollapsibleState.Expanded);
        this.iconPath = new vscode.ThemeIcon('folder');
        this.contextValue = 'assets';
        this.description = description;
    }
      /**
     * Create an AssetCollectionNode with portfolio total value
     */
    public static async createWithTotalValue(
        provider: { getPortfolioData(): Promise<PortfolioData | undefined> }
    ): Promise<AssetCollectionNode> {
        let description = '';
        
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (workspaceFolder) {
                const portfolioData = await provider.getPortfolioData();
                if (portfolioData && portfolioData.assets) {
                    const calculator = new PortfolioValueCalculator(workspaceFolder);
                    const totalValue = await calculator.calculateTotalValue(portfolioData.assets);
                    
                    // Format the total value with CNY currency symbol
                    description = `Total: ¥${totalValue.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                }
            }
        } catch (error) {
            console.error('Error calculating portfolio total value:', error);
            description = 'Total: Exchange rate missing';
            
            // Show user-friendly error message
            vscode.window.showErrorMessage(
                `Portfolio calculation failed: ${error}`,
                'Open AssetUpdates Folder'
            ).then(selection => {
                if (selection === 'Open AssetUpdates Folder') {
                    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                    if (workspaceFolder) {
                        const assetUpdatesPath = path.join(workspaceFolder.uri.fsPath, 'AssetUpdates');
                        vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(assetUpdatesPath));
                    }
                }
            });
        }
        
        return new AssetCollectionNode(provider, description);
    }
      async getChildren(): Promise<PortfolioExplorerNode[]> {
        const portfolioData = await this.provider.getPortfolioData();
        
        if (!portfolioData || !portfolioData.assets) {
            return [];
        }        
        
        // Create asset nodes with current values
        const assetNodes: PortfolioExplorerNode[] = [];
        for (const asset of portfolioData.assets) {
            const assetNode = await AssetNode.createWithCurrentValue(asset);
            assetNodes.push(assetNode);
        }
        
        return assetNodes;
    }
}
