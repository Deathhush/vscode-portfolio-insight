import * as vscode from 'vscode';
import * as path from 'path';
import { PortfolioExplorerNode, PortfolioExplorerProvider } from './portfolioExplorerProvider';
import { PortfolioData, AssetDefinitionData } from '../data/interfaces';
import { AssetNode } from './assetNode';
import { Asset } from '../data/asset';

export class AssetCollectionNode implements PortfolioExplorerNode {
    public nodeType: 'assetCollection' = 'assetCollection';
    
    constructor(private provider: PortfolioExplorerProvider) {
    }

    private async getDescription(): Promise<string> {
        let description = '';
        
        try {
            // Get child asset nodes
            const children = await this.getChildren();
            
            if (children.length > 0) {
                // Calculate total value using existing asset nodes
                let totalValue = 0;
                let hasErrors = false;
                
                for (const child of children) {
                    if (child.nodeType === 'asset') {
                        const assetNode = child as AssetNode;
                        try {
                            const currentValue = await assetNode.asset.calculateCurrentValue();
                            totalValue += currentValue.valueInCNY;
                        } catch (error) {
                            console.error(`Error calculating value for asset ${assetNode.asset.definitionData.name}:`, error);
                            hasErrors = true;
                        }
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
        
        return description;
    }
    
    async getChildren(): Promise<PortfolioExplorerNode[]> {
        const portfolioData = await this.provider.getPortfolioData();
        
        if (!portfolioData || !portfolioData.assets) {
            return [];
        }        
        
        // Create asset nodes using Asset instances
        const assetNodes: PortfolioExplorerNode[] = [];
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
}
