import * as vscode from 'vscode';
import { PortfolioExplorerNode, PortfolioExplorerProvider } from './portfolioExplorerProvider';
import { TagNode } from './tagNode';

export class TagCollectionNode implements PortfolioExplorerNode {
    public nodeType: 'tagCollection' = 'tagCollection';
    
    constructor(private provider: PortfolioExplorerProvider) {
    }

    private async getDescription(): Promise<string> {
        let description = '';
        
        try {
            // Get child tag nodes
            const children = await this.getChildren();
            
            if (children.length > 0) {
                // Calculate total value using existing tag nodes
                let totalValue = 0;
                let hasErrors = false;
                
                for (const child of children) {
                    if (child.nodeType === 'tag') {
                        const tagNode = child as TagNode;
                        try {
                            const tagValue = await tagNode.calculateCurrentValue();
                            totalValue += tagValue.valueInCNY;
                        } catch (error) {
                            console.error(`Error calculating value for tag ${tagNode.tag}:`, error);
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
            console.error('Error calculating tags total value:', error);
            description = 'Total: Calculation failed';
        }
        
        return description;
    }
    
    async getChildren(): Promise<PortfolioExplorerNode[]> {
        const tags = await this.provider.dataAccess.getAllTags();
        
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
