import * as vscode from 'vscode';
import { AssetDefinitionData, PortfolioExplorerNode } from './portfolioExplorerProvider';
import { PortfolioValueCalculator } from '../services/portfolioValueCalculator';

export class AssetNode extends vscode.TreeItem implements PortfolioExplorerNode {
    public nodeType: 'asset' = 'asset';
    public assetData: AssetDefinitionData;
    
    constructor(asset: AssetDefinitionData, description?: string) {
        super(asset.name, vscode.TreeItemCollapsibleState.None);
        this.assetData = asset;
        // Always use package icon for all assets
        this.iconPath = new vscode.ThemeIcon('package');
        
        // Set description to show asset type and current value if provided
        this.description = description || asset.type;
        
        this.tooltip = `${asset.name} (${asset.type}${asset.currency ? `, ${asset.currency}` : ''})`;
        this.contextValue = 'asset';
    }    /**
     * Create an AssetNode with current value information
     */
    public static async createWithCurrentValue(
        asset: AssetDefinitionData
    ): Promise<AssetNode> {
        let description: string = asset.type;
        
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (workspaceFolder) {
                const calculator = new PortfolioValueCalculator(workspaceFolder);
                const assetValues = await calculator.calculateCurrentValues([asset]);
                
                if (assetValues.length > 0) {
                    const assetValue = assetValues[0];
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
                }
            }
        } catch (error) {
            console.error(`Error calculating current value for asset ${asset.name}:`, error);
            
            // Show specific error message for exchange rate issues
            if (error instanceof Error && error.message.includes('No exchange rate found')) {
                description = `${asset.type} • Exchange rate missing`;
            } else {
                description = `${asset.type} • Error calculating`;
            }
        }
        
        return new AssetNode(asset, description);
    }
    
    async getChildren(): Promise<PortfolioExplorerNode[]> {
        // Asset nodes have no children
        return [];
    }
}
