import * as vscode from 'vscode';
import { PortfolioExplorerNode, PortfolioExplorerProvider } from './portfolioExplorerProvider';
import { Category, CategoryType } from '../data/category';
import { AssetNode } from './assetNode';
import { AssetCollection } from '../data/assetCollection';

export class CategoryNode implements PortfolioExplorerNode {
    public nodeType: 'category' = 'category'; // Using 'assets' as the closest match
    
    constructor(
        public category: Category,
        private provider: PortfolioExplorerProvider,
        private parentCategoryType?: CategoryType
    ) {}

    async getChildAssetNodes(): Promise<AssetNode[]> {
        const assets = await this.category.getAssets();
        return assets.map(asset => new AssetNode(asset, this.provider));
    }

    private async getDescription(): Promise<string> {
        try {
            const assets = await this.category.getAssets();
            const categoryValue = await AssetCollection.calculateCurrentValue(assets);
            
            // If we have a parent category type, calculate percentage
            if (this.parentCategoryType) {
                const categoryTypeValue = await this.parentCategoryType.calculateCurrentValue();
                if (categoryTypeValue.valueInCNY > 0) {
                    const percentage = (categoryValue.valueInCNY / categoryTypeValue.valueInCNY) * 100;
                    return `${percentage.toFixed(1)}%`;
                }
            }
            
            // Fallback to showing total value if no parent or parent has zero value
            return `Total: ¥${categoryValue.valueInCNY.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        } catch (error) {
            console.error(`Error calculating value for category ${this.category.name}:`, error);
            return 'Calculation failed';
        }
    }

    async getChildren(): Promise<PortfolioExplorerNode[]> {
        return await this.getChildAssetNodes();
    }

    async getTreeItem(): Promise<vscode.TreeItem> {
        const treeItem = new vscode.TreeItem(this.category.name, vscode.TreeItemCollapsibleState.Expanded);
        treeItem.iconPath = new vscode.ThemeIcon('symbol-folder');
        treeItem.contextValue = 'category';
        
        // Get description with total value
        treeItem.description = await this.getDescription();
        
        // Show tags as tooltip
        const tags = this.category.tags;
        if (tags.length > 0) {
            treeItem.tooltip = `Tags: ${tags.join(', ')}`;
        }
        
        return treeItem;
    }
}
