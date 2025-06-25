import * as vscode from 'vscode';
import { PortfolioData, PortfolioExplorerNode, AssetDefinitionData } from './portfolioExplorerProvider';
import { AssetNode } from './assetNode';

export class AssetCollectionNode extends vscode.TreeItem implements PortfolioExplorerNode {
    public nodeType: 'assets' = 'assets';
    
    constructor(private provider: { getPortfolioData(): Promise<PortfolioData | undefined> }) {
        super('Assets', vscode.TreeItemCollapsibleState.Expanded);
        this.iconPath = new vscode.ThemeIcon('folder');
        this.contextValue = 'assets';
    }
    
    async getChildren(): Promise<PortfolioExplorerNode[]> {
        const portfolioData = await this.provider.getPortfolioData();
        
        if (!portfolioData || !portfolioData.assets) {
            return [];
        }        
        
        // Create asset nodes
        return portfolioData.assets.map((asset: AssetDefinitionData) => new AssetNode(asset));
    }
}
