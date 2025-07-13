import * as vscode from 'vscode';
import { PortfolioExplorerNode, PortfolioExplorerProvider } from './portfolioExplorerProvider';
import { Asset } from '../data/asset';
import { AssetPageView } from '../views/assetPage/assetPageView';
import { AssetCurrentValueData, AssetSummaryData } from '../data/interfaces';

export class AssetNode implements PortfolioExplorerNode {
    public nodeType: 'asset' = 'asset';
    public asset: Asset; // Reference to Asset instance
    public provider: PortfolioExplorerProvider; // Reference to the provider
    private assetPageView?: AssetPageView; // Reference to the current webview for this asset
    private displayFullName: boolean; // Whether to display full name or just asset name
    
    constructor(asset: Asset, provider: PortfolioExplorerProvider, displayFullName: boolean = true) {
        this.asset = asset;
        this.provider = provider;
        this.displayFullName = displayFullName;
    }

    private async getDescription(): Promise<string> {
        let description: string = this.asset.definitionData.type;
        
        try {
            const assetValue = await this.asset.calculateCurrentValue();
            const currency = assetValue.currency || 'CNY';
            
            // Format the current value
            let valueDisplay = '';
            if (currency === 'CNY') {
                valueDisplay = `¥${assetValue.currentValue.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            } else {
                // Show both original currency and CNY equivalent
                const originalValue = assetValue.currentValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                const cnyValue = assetValue.valueInCNY.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                valueDisplay = `${currency} ${originalValue} (¥${cnyValue})`;
            }
            
            description = `${this.asset.definitionData.type} • ${valueDisplay}`;
        } catch (error) {
            console.error(`Error calculating current value for asset ${this.asset.definitionData.name}:`, error);
            
            // Show specific error message for exchange rate issues
            if (error instanceof Error && error.message.includes('No exchange rate found')) {
                description = `${this.asset.definitionData.type} • Exchange rate missing`;
            } else {
                description = `${this.asset.definitionData.type} • Error calculating`;
            }
        }
        
        return description;
    }

    async getTreeItem(): Promise<vscode.TreeItem> {
        // Determine what name to display based on displayFullName setting
        let displayName: string;
        if (this.displayFullName) {
            // Show full name (accountName.assetName for account assets, just assetName for standalone)
            displayName = this.asset.fullName;
        } else {
            // Show only the asset name (typically when displayed under an account)
            displayName = this.asset.definitionData.name;
        }

        const treeItem = new vscode.TreeItem(displayName, vscode.TreeItemCollapsibleState.None);
        
        // Always use package icon for all assets
        treeItem.iconPath = new vscode.ThemeIcon('package');
        
        // Calculate description with current value
        treeItem.description = await this.getDescription();
        treeItem.tooltip = `${this.asset.definitionData.name} (${this.asset.definitionData.type}${this.asset.definitionData.currency ? `, ${this.asset.definitionData.currency}` : ''})`;
        treeItem.contextValue = 'asset';
        
        // Set command to open asset page when clicked
        treeItem.command = {
            command: 'vscode-portfolio-insight.openAssetPage',
            title: 'Open Asset Page',
            arguments: [this]
        };
        
        return treeItem;
    }

    // Command handling
    async openAssetPage(context: vscode.ExtensionContext): Promise<void> {
        // Check if a webview already exists for this asset
        if (this.assetPageView) {
            // Focus the existing webview
            this.assetPageView.reveal();
            console.log(`Focused existing asset page for ${this.asset.name}`);
            return;
        }
        
        // Create new AssetPageView
        this.assetPageView = new AssetPageView(context.extensionUri, this);
        
        // Set up disposal handler to clear the reference when webview is closed
        this.assetPageView.onDispose(() => {
            this.assetPageView = undefined;
            console.log(`Cleared asset page view reference for ${this.asset.name}`);
        });
        
        console.log(`Created new asset page for ${this.asset.name}`);
    }
    
    async getChildren(): Promise<PortfolioExplorerNode[]> {
        // Asset nodes have no children
        return [];
    }
}
