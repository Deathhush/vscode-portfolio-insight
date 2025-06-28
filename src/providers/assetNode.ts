import * as vscode from 'vscode';
import { AssetDefinitionData, PortfolioExplorerNode, PortfolioExplorerProvider } from './portfolioExplorerProvider';
import { Asset } from '../data/asset';
import { AssetPageView } from '../views/assetPage/assetPageView';

export class AssetNode extends vscode.TreeItem implements PortfolioExplorerNode {
    public nodeType: 'asset' = 'asset';
    public assetData: AssetDefinitionData;
    public asset?: Asset; // Reference to Asset instance
    public provider?: PortfolioExplorerProvider; // Reference to the provider
    
    constructor(asset: Asset, description?: string, provider?: PortfolioExplorerProvider);
    constructor(assetData: AssetDefinitionData, description?: string, provider?: PortfolioExplorerProvider);
    constructor(assetOrData: Asset | AssetDefinitionData, description?: string, provider?: PortfolioExplorerProvider) {
        let name: string;
        let assetData: AssetDefinitionData;
        
        if (assetOrData instanceof Asset) {
            name = assetOrData.name;
            assetData = assetOrData.definitionData;
        } else {
            name = assetOrData.name;
            assetData = assetOrData;
        }
        
        super(name, vscode.TreeItemCollapsibleState.None);
        
        this.assetData = assetData;
        this.provider = provider;
        if (assetOrData instanceof Asset) {
            this.asset = assetOrData;
        }
        
        // Always use package icon for all assets
        this.iconPath = new vscode.ThemeIcon('package');
        
        // Set description to show asset type and current value if provided
        this.description = description || this.assetData.type;
        
        this.tooltip = `${this.assetData.name} (${this.assetData.type}${this.assetData.currency ? `, ${this.assetData.currency}` : ''})`;
        this.contextValue = 'asset';
    }    /**
     * Create an AssetNode with current value information using Asset instance
     */
    public static async createWithCurrentValue(
        asset: Asset,
        provider?: PortfolioExplorerProvider
    ): Promise<AssetNode> {
        let description: string = asset.type;
        
        try {
            const assetValue = await asset.calculateCurrentValue();
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
            
            description = `${asset.type} • ${valueDisplay}`;
        } catch (error) {
            console.error(`Error calculating current value for asset ${asset.name}:`, error);
            
            // Show specific error message for exchange rate issues
            if (error instanceof Error && error.message.includes('No exchange rate found')) {
                description = `${asset.type} • Exchange rate missing`;
            } else {
                description = `${asset.type} • Error calculating`;
            }
        }
        
        return new AssetNode(asset, description, provider);
    }

    /**
     * Create an AssetNode with current value information using AssetDefinitionData (legacy)
     * @deprecated Use createWithCurrentValue(asset: Asset) instead
     */
    public static async createWithCurrentValueLegacy(
        assetData: AssetDefinitionData,
        provider?: PortfolioExplorerProvider
    ): Promise<AssetNode> {
        let description: string = assetData.type;
        
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (workspaceFolder) {
                // TODO: This should be replaced with Asset-based approach
                // For now, create a temporary calculation
                console.warn('Using legacy value calculation method. Consider updating to use Asset instances.');
                description = `${assetData.type} • Legacy calculation`;
            }
        } catch (error) {
            console.error(`Error calculating current value for asset ${assetData.name}:`, error);
            description = `${assetData.type} • Error calculating`;
        }
        
        return new AssetNode(assetData, description, provider);
    }    // Command handling
    async openAssetPage(context: vscode.ExtensionContext): Promise<void> {
        if (this.asset && this.provider) {
            // Use Asset instance approach - create AssetPageView with AssetNode
            new AssetPageView(context.extensionUri, this);
            console.log(`Opened asset page for ${this.asset.name} using Asset instance`);
        } else {
            // Fallback: find the provider and use its openAssetPage method
            console.log(`Opening asset page for ${this.assetData.name} using provider fallback`);
            vscode.commands.executeCommand('vscode-portfolio-insight.openAssetPageByName', this.assetData.name);
        }
    }
    
    async getChildren(): Promise<PortfolioExplorerNode[]> {
        // Asset nodes have no children
        return [];
    }
}
