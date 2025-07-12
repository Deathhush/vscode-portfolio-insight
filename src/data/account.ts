import { AccountDefinitionData, AccountSummaryData, AssetSummaryData, AssetCurrentValueData } from './interfaces';
import { PortfolioDataAccess } from './portfolioDataAccess';
import { Asset } from './asset';

/**
 * Represents an Account in the portfolio
 * An Account is a collection of Assets
 */
export class Account {
    public readonly definitionData: AccountDefinitionData;
    private dataAccess: PortfolioDataAccess;

    constructor(definition: AccountDefinitionData, dataAccess: PortfolioDataAccess) {
        this.definitionData = definition;
        this.dataAccess = dataAccess;
    }

    public get name(): string {
        return this.definitionData.name;
    }

    public get type(): string {
        return this.definitionData.type;
    }

    /**
     * Get all assets that belong to this account
     */
    public async getAssets(): Promise<Asset[]> {        
        const assets: Asset[] = [];

        if (this.definitionData.assets) {
            for (const assetDefinition of this.definitionData.assets) {
                const asset = await this.dataAccess.getAsset(assetDefinition, this.name);
                assets.push(asset);
            }
        }

        return assets;
    }

    /**
     * Calculate the total current value of all assets in this account
     */
    public async calculateTotalValue(): Promise<AssetCurrentValueData> {
        const assets = await this.getAssets();
        let totalValue = 0;
        let totalValueInCNY = 0;
        let latestUpdateDate: string | undefined;

        for (const asset of assets) {
            try {
                const assetValue = await asset.calculateCurrentValue();
                totalValue += assetValue.currentValue;
                totalValueInCNY += assetValue.valueInCNY;
                
                // Track the latest update date
                if (assetValue.lastUpdateDate) {
                    if (!latestUpdateDate || assetValue.lastUpdateDate > latestUpdateDate) {
                        latestUpdateDate = assetValue.lastUpdateDate;
                    }
                }
            } catch (error) {
                console.error(`Error calculating value for asset ${asset.definitionData.name}:`, error);
            }
        }

        return {
            currentValue: totalValue,
            currency: 'CNY', // Mixed currencies, so we use CNY as the base
            valueInCNY: totalValueInCNY,
            lastUpdateDate: latestUpdateDate
        };
    }

    /**
     * Generate a summary of this account including all assets
     */
    public async generateSummary(): Promise<AccountSummaryData> {
        const assets = await this.getAssets();
        const assetSummaries: AssetSummaryData[] = [];

        for (const asset of assets) {
            try {
                const summary = await asset.generateSummary();
                assetSummaries.push(summary);
            } catch (error) {
                console.error(`Error generating summary for asset ${asset.definitionData.name}:`, error);
            }
        }

        const totalValue = await this.calculateTotalValue();

        return {
            definition: this.definitionData,
            assets: assetSummaries,
            totalValue: totalValue
        };
    }
}
