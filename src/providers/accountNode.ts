import * as vscode from 'vscode';
import { PortfolioExplorerNode, PortfolioExplorerProvider } from './portfolioExplorerProvider';
import { Account } from '../data/account';
import { AssetNode } from './assetNode';
import { AssetCurrentValueData } from '../data/interfaces';

export class AccountNode implements PortfolioExplorerNode {
    public nodeType: 'assetCollection' = 'assetCollection'; // AccountNode is also an AssetCollectionNode
    public account: Account;
    
    constructor(account: Account, private provider: PortfolioExplorerProvider) {
        this.account = account;
    }

    private async getDescription(): Promise<string> {
        let description = this.account.type;
        
        try {
            const totalValue = await this.account.calculateTotalValue();
            const valueDisplay = `¥${totalValue.valueInCNY.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            description = `${this.account.type} • ${valueDisplay}`;
        } catch (error) {
            console.error(`Error calculating total value for account ${this.account.name}:`, error);
            description = `${this.account.type} • Error calculating`;
        }
        
        return description;
    }

    async getChildren(): Promise<PortfolioExplorerNode[]> {
        const assets = await this.account.getAssets();
        const assetNodes: AssetNode[] = [];

        for (const asset of assets) {
            const assetNode = new AssetNode(asset, this.provider, false);
            assetNodes.push(assetNode);
        }

        return assetNodes;
    }

    async getTreeItem(): Promise<vscode.TreeItem> {
        const treeItem = new vscode.TreeItem(this.account.name, vscode.TreeItemCollapsibleState.Expanded);
        treeItem.iconPath = new vscode.ThemeIcon('account');
        treeItem.contextValue = 'account';
        
        // Get description with account total value
        treeItem.description = await this.getDescription();
        treeItem.tooltip = `${this.account.name} (${this.account.type})`;
        
        return treeItem;
    }

    /**
     * Calculate the total current value of all assets in this account
     */
    async calculateTotalValue(): Promise<AssetCurrentValueData> {
        try {
            return await this.account.calculateTotalValue();
        } catch (error) {
            console.error(`Error calculating value for account ${this.account.name}:`, error);
            // Return zero values if calculation fails
            return {
                currentValue: 0,
                currency: 'CNY',
                valueInCNY: 0,
                lastUpdateDate: undefined
            };
        }
    }
}
