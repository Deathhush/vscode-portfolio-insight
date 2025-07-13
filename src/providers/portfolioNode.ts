import * as vscode from 'vscode';
import { PortfolioExplorerNode, PortfolioExplorerProvider } from './portfolioExplorerProvider';
import { AccountNode } from './accountNode';
import { AssetNode } from './assetNode';
import { AssetCurrentValueData } from '../data/interfaces';

export class PortfolioNode implements PortfolioExplorerNode {
    public nodeType: 'portfolio' = 'portfolio';
    
    constructor(private provider: PortfolioExplorerProvider) {
    }

    private async getDescription(): Promise<string> {
        let description = '';
        
        try {
            // Get all child nodes (accounts and standalone assets)
            const childNodes = await this.getChildren();
            
            if (childNodes.length > 0) {
                // Calculate total value from all child nodes
                const totalValue = await this.calculateCurrentValue(childNodes);
                description = `Total: ¥${totalValue.valueInCNY.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            }
        } catch (error) {
            console.error('Error calculating portfolio total value:', error);
            description = 'Total: Calculation failed';
        }
        
        return description;
    }

    async getChildren(): Promise<PortfolioExplorerNode[]> {
        const nodes: PortfolioExplorerNode[] = [];
        
        // Get all accounts
        const accounts = await this.provider.dataAccess.getAllAccounts();
        for (const account of accounts) {
            const accountNode = new AccountNode(account, this.provider);
            nodes.push(accountNode);
        }

        // Get standalone assets (assets that don't belong to any account)
        const standaloneAssets = await this.provider.dataAccess.getStandaloneAssets();
        for (const asset of standaloneAssets) {
            try {
                const assetNode = new AssetNode(asset, this.provider);
                nodes.push(assetNode);
            } catch (error) {
                console.error(`Error creating asset node for ${asset.name}:`, error);
            }
        }

        return nodes;
    }

    async getTreeItem(): Promise<vscode.TreeItem> {
        const treeItem = new vscode.TreeItem('Assets', vscode.TreeItemCollapsibleState.Expanded);
        treeItem.iconPath = new vscode.ThemeIcon('folder');
        treeItem.contextValue = 'assets';
        
        // Get description with portfolio total value
        treeItem.description = await this.getDescription();
        
        return treeItem;
    }

    /**
     * Calculate the total current value of multiple child nodes (AccountNodes and AssetNodes)
     */
    async calculateCurrentValue(childNodes: PortfolioExplorerNode[]): Promise<AssetCurrentValueData> {
        let totalValue = 0;
        let totalValueInCNY = 0;
        let latestUpdateDate: string | undefined;

        for (const node of childNodes) {
            try {
                let nodeValue: AssetCurrentValueData;
                
                if (node instanceof AccountNode) {
                    nodeValue = await node.calculateCurrentValue();
                } else if (node instanceof AssetNode) {
                    nodeValue = await node.asset.calculateCurrentValue();
                } else {
                    continue; // Skip unknown node types
                }

                totalValue += nodeValue.valueInCNY; // Portfolio should always return value in CNY
                totalValueInCNY += nodeValue.valueInCNY;
                
                // Track the latest update date
                if (nodeValue.lastUpdateDate) {
                    if (!latestUpdateDate || nodeValue.lastUpdateDate > latestUpdateDate) {
                        latestUpdateDate = nodeValue.lastUpdateDate;
                    }
                }
            } catch (error) {
                console.error(`Error calculating value for node:`, error);
            }
        }

        return {
            currentValue: totalValue,
            currency: 'CNY', // Mixed currencies, so we use CNY as the base
            valueInCNY: totalValueInCNY,
            lastUpdateDate: latestUpdateDate
        };
    }
}
