import * as vscode from 'vscode';
import { AssetDefinitionData, PortfolioExplorerNode } from './portfolioExplorerProvider';

export class AssetNode extends vscode.TreeItem implements PortfolioExplorerNode {
    public nodeType: 'asset' = 'asset';
    public assetData: AssetDefinitionData;
    
    constructor(asset: AssetDefinitionData) {
        super(asset.name, vscode.TreeItemCollapsibleState.None);
        this.assetData = asset;
        // Always use package icon for all assets
        this.iconPath = new vscode.ThemeIcon('package');
        
        // Set description to show asset type
        this.description = asset.type;
        
        this.tooltip = `${asset.name} (${asset.type}${asset.currency ? `, ${asset.currency}` : ''})`;
        this.contextValue = 'asset';
    }
    
    async getChildren(): Promise<PortfolioExplorerNode[]> {
        // Asset nodes have no children
        return [];
    }
}
