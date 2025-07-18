import * as vscode from 'vscode';
import { PortfolioExplorerNode, PortfolioExplorerProvider } from './portfolioExplorerProvider';
import { Category } from '../data/category';
import { AssetNode } from './assetNode';

export class CategoryNode implements PortfolioExplorerNode {
    public nodeType: 'category' = 'category'; // Using 'assets' as the closest match
    
    constructor(
        public category: Category,
        private provider: PortfolioExplorerProvider,
        private parentCategory?: Category
    ) {}

    async getChildAssetNodes(): Promise<AssetNode[]> {
        const assets = await this.category.getStandaloneAssets();
        return assets.map(asset => new AssetNode(asset, this.provider));
    }

    async getChildSubCategoryNodes(): Promise<CategoryNode[]> {
        const subCategories = await this.category.getSubCategories();
        return subCategories.map(subCategory => 
            new CategoryNode(subCategory, this.provider, this.category)
        );
    }

    private async getDescription(): Promise<string> {
        try {
            const categoryValue = await this.category.calculateCurrentValue();
            const totalValueStr = `¥${categoryValue.valueInCNY.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            
            // Calculate percentage based on parent Category
            if (this.parentCategory) {
                const parentValue = await this.parentCategory.calculateCurrentValue();
                if (parentValue.valueInCNY > 0) {
                    const percentage = (categoryValue.valueInCNY / parentValue.valueInCNY) * 100;
                    return `${totalValueStr} • ${percentage.toFixed(1)}%`;
                }
            }
            
            // Fallback to showing total value if no parent or parent has zero value
            return `${totalValueStr}`;
        } catch (error) {
            console.error(`Error calculating value for category ${this.category.name}:`, error);
            return 'Calculation failed';
        }
    }

    async getChildren(): Promise<PortfolioExplorerNode[]> {
        const subCategoryNodes = await this.getChildSubCategoryNodes();
        const assetNodes = await this.getChildAssetNodes();
        
        // Return sub-categories first, then standalone assets
        return [...subCategoryNodes, ...assetNodes];
    }

    async getTreeItem(): Promise<vscode.TreeItem> {
        const treeItem = new vscode.TreeItem(this.category.name, vscode.TreeItemCollapsibleState.Collapsed);
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
