import { AssetCurrentValueData } from './interfaces';
import { AssetNode } from '../providers/assetNode';
import { Asset } from './asset';

export class AssetCollection {
    /**
     * Calculate the total current value of multiple assets
     */
    static async calculateCurrentValue(assets: Asset[]): Promise<AssetCurrentValueData> {
        let totalValue = 0;
        let totalValueInCNY = 0;
        let latestUpdateDate: string | undefined;

        for (const asset of assets) {
            try {
                const assetValue = await asset.calculateCurrentValue();
                totalValue += assetValue.valueInCNY; // Asset Collection should always return value in CNY
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
}
