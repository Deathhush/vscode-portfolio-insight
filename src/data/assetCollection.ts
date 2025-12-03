import { AssetNetValueData, AssetDailyRecordData, AssetActivityData } from './interfaces';
import { AssetNode } from '../providers/assetNode';
import { Asset } from './asset';

export class AssetCollection {
    /**
     * Calculate the total current value of multiple assets
     */
    static async calculateCurrentValue(assets: Asset[]): Promise<AssetNetValueData> {
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

    /**
     * Calculate daily value history for a collection of assets
     * Combines value histories from multiple assets into a unified timeline
     *
     * @param assets Array of assets to aggregate
     * @returns Array of daily records with combined values in CNY
     */
    static async calculateValueHistory(assets: Asset[]): Promise<AssetDailyRecordData[]> {
        if (assets.length === 0) {
            return [];
        }

        // Step 1: Collect value histories from all assets
        const assetHistories = new Map<Asset, AssetDailyRecordData[]>();
        const allDates = new Set<string>();

        for (const asset of assets) {
            try {
                const summary = await asset.generateSummary();
                const valueHistory = summary.valueHistory;

                if (valueHistory && valueHistory.length > 0) {
                    assetHistories.set(asset, valueHistory);

                    // Collect all unique dates
                    for (const record of valueHistory) {
                        allDates.add(record.date);
                    }
                }
            } catch (error) {
                console.error(`Error loading value history for asset ${asset.fullName}:`, error);
            }
        }

        if (allDates.size === 0) {
            return [];
        }

        // Step 2: Sort dates chronologically
        const sortedDates = Array.from(allDates).sort();

        // Step 3: For each date, aggregate values and activities from all assets
        const aggregatedHistory: AssetDailyRecordData[] = [];

        // Track last known value for each asset (for forward-fill)
        const lastKnownValues = new Map<Asset, AssetNetValueData>();

        for (const date of sortedDates) {
            let totalValueInCNY = 0;
            let latestUpdateDate: string | undefined;
            const activitiesForDate: AssetActivityData[] = [];

            // Aggregate data from all assets for this date
            for (const asset of assets) {
                const history = assetHistories.get(asset);

                if (history) {
                    // Find record for this date
                    const recordForDate = history.find(record => record.date === date);

                    if (recordForDate) {
                        // Asset has a record for this date - use it
                        totalValueInCNY += recordForDate.currentValue.valueInCNY;
                        lastKnownValues.set(asset, recordForDate.currentValue);

                        // Track latest update date
                        if (recordForDate.currentValue.lastUpdateDate) {
                            if (!latestUpdateDate || recordForDate.currentValue.lastUpdateDate > latestUpdateDate) {
                                latestUpdateDate = recordForDate.currentValue.lastUpdateDate;
                            }
                        }

                        // Add activities from this asset, prefixed with asset name
                        for (const activity of recordForDate.activities) {
                            activitiesForDate.push({
                                ...activity,
                                // Enhance activity with asset information for tooltip display
                                id: `${asset.fullName}-${activity.id}`,
                                description: activity.description
                                    ? `[${asset.fullName}] ${activity.description}`
                                    : `[${asset.fullName}]`
                            });
                        }
                    } else {
                        // Asset has no record for this date - use last known value (forward-fill)
                        const lastKnown = lastKnownValues.get(asset);
                        if (lastKnown) {
                            totalValueInCNY += lastKnown.valueInCNY;
                        }
                    }
                }
            }

            // Create aggregated daily record
            aggregatedHistory.push({
                date,
                currentValue: {
                    currentValue: totalValueInCNY,
                    currency: 'CNY',
                    valueInCNY: totalValueInCNY,
                    lastUpdateDate: latestUpdateDate
                },
                activities: activitiesForDate
            });
        }

        return aggregatedHistory;
    }
}
