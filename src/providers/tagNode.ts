import * as vscode from 'vscode';
import { PortfolioExplorerNode, PortfolioExplorerProvider } from './portfolioExplorerProvider';
import { AssetNode } from './assetNode';
import { AssetCollectionNode } from './assetCollectionNode';
import { AssetCurrentValueData } from '../data/interfaces';

export class TagNode implements PortfolioExplorerNode {
    public nodeType: 'tag' = 'tag';
    public tag: string;
    
    constructor(tag: string, private provider: PortfolioExplorerProvider) {
        this.tag = tag;
    }

    async getChildAssetNodes(): Promise<AssetNode[]> {
        const assetsWithTag = await this.provider.dataAccess.getAssetsByTag(this.tag);
        return await AssetNode.createAssetNodesFromSummaries(assetsWithTag, this.provider);
    }

    async calculateTotalValue(): Promise<AssetCurrentValueData> {
        const assetNodes = await this.getChildAssetNodes();
        return await AssetCollectionNode.calculateTotalValue(assetNodes);
    }

    private async getDescription(): Promise<string> {
        try {
            const tagValue = await this.calculateTotalValue();
            return `Total: ¥${tagValue.valueInCNY.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        } catch (error) {
            console.error(`Error calculating value for tag ${this.tag}:`, error);
            return 'Calculation failed';
        }
    }

    async getChildren(): Promise<PortfolioExplorerNode[]> {
        return await this.getChildAssetNodes();
    }

    async getTreeItem(): Promise<vscode.TreeItem> {
        const assetsWithTag = await this.provider.dataAccess.getAssetsByTag(this.tag);
        const collapsibleState = assetsWithTag.length > 0 ? 
            vscode.TreeItemCollapsibleState.Collapsed : 
            vscode.TreeItemCollapsibleState.None;
        
        const treeItem = new vscode.TreeItem(this.tag, collapsibleState);
        treeItem.iconPath = new vscode.ThemeIcon('tag');
        treeItem.contextValue = 'tag';
        
        // Get description with tag total value
        treeItem.description = await this.getDescription();
        
        return treeItem;
    }
}
