import * as vscode from 'vscode';
import * as path from 'path';
import { PortfolioData, PortfolioExplorerNode, AssetDefinitionData, PortfolioExplorerProvider } from './portfolioExplorerProvider';
import { AssetNode } from './assetNode';
import { PortfolioDataStore } from '../data/portfolioDataStore';
import { Asset } from '../data/asset';

export class AssetCollectionNode extends vscode.TreeItem implements PortfolioExplorerNode {
    public nodeType: 'assets' = 'assets';
    
    constructor(
        private provider: PortfolioExplorerProvider,
        description?: string
    ) {
        super('Assets', vscode.TreeItemCollapsibleState.Expanded);
        this.iconPath = new vscode.ThemeIcon('folder');
        this.contextValue = 'assets';
        this.description = description;
    }
      /**
     * Create an AssetCollectionNode with portfolio total value
     */    public static async createWithTotalValue(
        provider: PortfolioExplorerProvider
    ): Promise<AssetCollectionNode> {
        let description = '';
        
        try {
            const portfolioData = await provider.getPortfolioData();
            if (portfolioData && portfolioData.assets) {
                // Calculate total value using Asset instances
                let totalValue = 0;
                let hasErrors = false;
                
                for (const assetDefinition of portfolioData.assets) {
                    try {
                        const asset = await provider.createAsset(assetDefinition);
                        const currentValue = await asset.calculateCurrentValue();
                        totalValue += currentValue.valueInCNY;
                    } catch (error) {
                        console.error(`Error calculating value for asset ${assetDefinition.name}:`, error);
                        hasErrors = true;
                    }
                }
                
                if (hasErrors) {
                    description = `Total: ¥${totalValue.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Some errors)`;
                } else {
                    description = `Total: ¥${totalValue.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                }
            }
        } catch (error) {
            console.error('Error calculating portfolio total value:', error);
            description = 'Total: Calculation failed';
            
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
    }      async getChildren(): Promise<PortfolioExplorerNode[]> {
        const portfolioData = await this.provider.getPortfolioData();
        
        if (!portfolioData || !portfolioData.assets) {
            return [];
        }        
        
        // Create asset nodes with current values using Asset instances
        const assetNodes: PortfolioExplorerNode[] = [];
        for (const assetDefinition of portfolioData.assets) {
            try {
                const asset = await this.provider.createAsset(assetDefinition);
                const assetNode = await AssetNode.createWithCurrentValue(asset, this.provider);
                assetNodes.push(assetNode);
            } catch (error) {
                console.error(`Error creating asset node for ${assetDefinition.name}:`, error);
                // Fallback to legacy approach
                const assetNode = await AssetNode.createWithCurrentValueLegacy(assetDefinition, this.provider);
                assetNodes.push(assetNode);
            }
        }
        
        return assetNodes;
    }
}
