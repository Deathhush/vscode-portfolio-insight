import * as vscode from 'vscode';
import * as path from 'path';
import { PortfolioExplorerNode, PortfolioExplorerProvider } from './portfolioExplorerProvider';
import { PortfolioData, AssetDefinitionData, AssetCurrentValueData } from '../data/interfaces';
import { AssetNode } from './assetNode';
import { Asset } from '../data/asset';

export class AssetCollectionNode implements PortfolioExplorerNode {
    public nodeType: 'assetCollection' = 'assetCollection';
    
    constructor(private provider: PortfolioExplorerProvider) {
    }

    private async getDescription(): Promise<string> {
        let description = '';
        
        try {
            // Get child asset nodes directly
            const assetNodes = await this.getChildAssetNodes();
            
            if (assetNodes.length > 0) {
                // Calculate total value using the static method
                const totalValue = await AssetCollectionNode.calculateTotalValue(assetNodes);
                description = `Total: ¥${totalValue.valueInCNY.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
        
        return description;
    }
    
    async getChildren(): Promise<PortfolioExplorerNode[]> {
        return await this.getChildAssetNodes();
    }

    async getChildAssetNodes(): Promise<AssetNode[]> {
        const portfolioData = await this.provider.getPortfolioData();
        
        if (!portfolioData || !portfolioData.assets) {
            return [];
        }        
        
        // Create asset nodes using Asset instances
        const assetNodes: AssetNode[] = [];
        for (const assetDefinition of portfolioData.assets) {
            try {
                const asset = await this.provider.createAsset(assetDefinition);
                const assetNode = new AssetNode(asset, this.provider);
                assetNodes.push(assetNode);
            } catch (error) {
                console.error(`Error creating asset node for ${assetDefinition.name}:`, error);
                // Skip this asset since we can't create an Asset instance
                // AssetNode now requires an Asset instance
            }
        }
        
        return assetNodes;
    }

    async getTreeItem(): Promise<vscode.TreeItem> {
        const treeItem = new vscode.TreeItem('Assets', vscode.TreeItemCollapsibleState.Expanded);
        treeItem.iconPath = new vscode.ThemeIcon('folder');
        treeItem.contextValue = 'assets';
        
        // Get description with portfolio total value
        treeItem.description = await this.getDescription();
        
        return treeItem;
    }

    /**
     * Calculate the total current value of multiple AssetNodes
     */
    static async calculateTotalValue(assetNodes: AssetNode[]): Promise<AssetCurrentValueData> {
        let totalValue = 0;
        let totalValueInCNY = 0;
        let latestUpdateDate: string | undefined;

        for (const assetNode of assetNodes) {
            try {
                const assetValue = await assetNode.calculateCurrentValueInCNY();
                totalValue += assetValue.currentValue;
                totalValueInCNY += assetValue.valueInCNY;
                
                // Track the latest update date
                if (assetValue.lastUpdateDate) {
                    if (!latestUpdateDate || assetValue.lastUpdateDate > latestUpdateDate) {
                        latestUpdateDate = assetValue.lastUpdateDate;
                    }
                }
            } catch (error) {
                console.error(`Error calculating value for asset ${assetNode.asset.definitionData.name}:`, error);
            }
        }

        return {
            currentValue: totalValue,
            currency: 'CNY', // Mixed currencies, so we use CNY as the base
            valueInCNY: totalValueInCNY,
            lastUpdateDate: latestUpdateDate
        };
    }
}
