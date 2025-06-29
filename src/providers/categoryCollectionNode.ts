import * as vscode from 'vscode';
import { PortfolioExplorerNode, PortfolioExplorerProvider } from './portfolioExplorerProvider';
import { CategoryTypeNode } from './categoryTypeNode';

export class CategoryCollectionNode implements PortfolioExplorerNode {
    public nodeType: 'categoryCollection' = 'categoryCollection'; // Using 'assets' as the closest match
    
    constructor(private provider: PortfolioExplorerProvider) {}

    async getChildren(): Promise<PortfolioExplorerNode[]> {
        const categoryDefinitions = await this.provider.dataAccess.getCategoryDefinitions();
        
        if (!categoryDefinitions || !categoryDefinitions.categoryTypes) {
            return [];
        }

        // Create category type nodes
        const categoryTypeNodes: PortfolioExplorerNode[] = [];
        for (const categoryTypeDefinition of categoryDefinitions.categoryTypes) {
            try {
                const categoryType = await this.provider.dataAccess.createCategoryType(categoryTypeDefinition);
                const categoryTypeNode = new CategoryTypeNode(categoryType, this.provider);
                categoryTypeNodes.push(categoryTypeNode);
            } catch (error) {
                console.error(`Error creating category type node for ${categoryTypeDefinition.name}:`, error);
            }
        }
        
        return categoryTypeNodes;
    }

    async getTreeItem(): Promise<vscode.TreeItem> {
        const treeItem = new vscode.TreeItem('Categories', vscode.TreeItemCollapsibleState.Expanded);
        treeItem.iconPath = new vscode.ThemeIcon('folder-library');
        treeItem.contextValue = 'categoryCollection';
        
        return treeItem;
    }
}
