import * as vscode from 'vscode';
import { PortfolioExplorerNode, PortfolioExplorerProvider } from './portfolioExplorerProvider';
import { TagNode } from './tagNode';

export class TagCollectionNode implements PortfolioExplorerNode {
    public nodeType: 'tagCollection' = 'tagCollection';
    
    constructor(private provider: PortfolioExplorerProvider) {
    }

    private async getDescription(): Promise<string> {
        // Don't show total value for tag collection
        return '';
    }
    
    async getChildren(): Promise<PortfolioExplorerNode[]> {
        const tags = await this.provider.getAllTags();
        
        if (!tags || tags.length === 0) {
            return [];
        }        
        
        // Create tag nodes
        const tagNodes: PortfolioExplorerNode[] = [];
        for (const tag of tags) {
            try {
                const tagNode = new TagNode(tag, this.provider);
                tagNodes.push(tagNode);
            } catch (error) {
                console.error(`Error creating tag node for ${tag}:`, error);
            }
        }
        
        return tagNodes;
    }

    async getTreeItem(): Promise<vscode.TreeItem> {
        const treeItem = new vscode.TreeItem('Tags', vscode.TreeItemCollapsibleState.Expanded);
        treeItem.iconPath = new vscode.ThemeIcon('tag');
        treeItem.contextValue = 'tags';
        
        // Get description with tags total value
        treeItem.description = await this.getDescription();
        
        return treeItem;
    }
}
