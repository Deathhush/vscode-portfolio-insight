import * as vscode from 'vscode';
import { PortfolioExplorerNode, PortfolioExplorerProvider } from './portfolioExplorerProvider';
import { Category } from '../data/category';
import { CategoryNode } from './categoryNode';
import { AssetNode } from './assetNode';

export class CategoryTypeNode implements PortfolioExplorerNode {
    public nodeType: 'categoryType' = 'categoryType'; 
    
    constructor(
        public categoryType: Category,
        private provider: PortfolioExplorerProvider
    ) {}

    private async getDescription(): Promise<string> {
        try {
            const currentValue = await this.categoryType.calculateCurrentValue();
            return `Total: ¥${currentValue.valueInCNY.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        } catch (error) {
            console.error(`Error calculating value for category type ${this.categoryType.name}:`, error);
            return 'Total: Calculation failed';
        }
    }

    async getChildren(): Promise<PortfolioExplorerNode[]> {
        const categories = await this.categoryType.getSubCategories();
        const standaloneAssets = await this.categoryType.getStandaloneAssets();
        
        const categoryNodes: PortfolioExplorerNode[] = [];
        
        // Add sub-category nodes
        for (const category of categories) {
            const categoryNode = new CategoryNode(category, this.provider, this.categoryType);
            categoryNodes.push(categoryNode);
        }
        
        // Add standalone asset nodes (assets that don't belong to any sub-category)
        for (const asset of standaloneAssets) {
            const assetNode = new AssetNode(asset, this.provider);
            categoryNodes.push(assetNode);
        }
        
        return categoryNodes;
    }

    async getTreeItem(): Promise<vscode.TreeItem> {
        const treeItem = new vscode.TreeItem(this.categoryType.name, vscode.TreeItemCollapsibleState.Collapsed);
        treeItem.iconPath = new vscode.ThemeIcon('symbol-class');
        treeItem.contextValue = 'categoryType';
        
        // Get description with total value
        treeItem.description = await this.getDescription();
        
        return treeItem;
    }
}
