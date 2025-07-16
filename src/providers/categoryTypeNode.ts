import * as vscode from 'vscode';
import { PortfolioExplorerNode, PortfolioExplorerProvider } from './portfolioExplorerProvider';
import { CategoryType } from '../data/category';
import { CategoryNode } from './categoryNode';

export class CategoryTypeNode implements PortfolioExplorerNode {
    public nodeType: 'categoryType' = 'categoryType'; 
    
    constructor(
        public categoryType: CategoryType,
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
        const categories = await this.categoryType.getCategories();
        
        const categoryNodes: PortfolioExplorerNode[] = [];
        for (const category of categories) {
            const categoryNode = new CategoryNode(category, this.provider, this.categoryType);
            categoryNodes.push(categoryNode);
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
