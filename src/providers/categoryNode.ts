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
            
            let descriptionParts: string[] = [totalValueStr];
            
            // Calculate percentage based on parent Category
            if (this.parentCategory) {
                const parentValue = await this.parentCategory.calculateCurrentValue();
                if (parentValue.valueInCNY > 0) {
                    const percentage = (categoryValue.valueInCNY / parentValue.valueInCNY) * 100;
                    descriptionParts.push(`${percentage.toFixed(1)}%`);
                }
            }
            
            // Add target value if defined
            const targetValue = this.category.targetValue;
            if (targetValue !== undefined) {
                const targetValueStr = `¥${targetValue.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                const progressPercentage = targetValue > 0 ? (categoryValue.valueInCNY / targetValue) * 100 : 0;
                descriptionParts.push(`Target: ${targetValueStr} (${progressPercentage.toFixed(1)}%)`);
            }
            
            return descriptionParts.join(' • ');
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
        
        return treeItem;
    }
}
