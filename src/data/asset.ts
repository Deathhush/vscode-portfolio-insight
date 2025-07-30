import {
    AssetDefinitionData,
    AssetCurrentValueData,
    AssetActivityData,
    AssetSummaryData,
    AssetDailyRecordData,
    AssetEventData,
    AssetUpdateData,
    TransferData,
    PortfolioUpdateData,
    ExchangeRateData
} from './interfaces';
import { PortfolioDataAccess } from './portfolioDataAccess';
import { ExchangeRate } from './exchangeRate';

export class Asset {
    constructor(
        private definition: AssetDefinitionData,
        private dataAccess: PortfolioDataAccess,
        private account?: string // Add account parameter
    ) { }

    // Core properties
    get name(): string {
        return this.definition.name;
    }

    get fullName(): string {
        // Compute full name as accountName.assetName for assets with accounts
        // For assets without accounts, just return the asset name
        if (this.account) {
            return `${this.account}.${this.definition.name}`;
        }
        return this.definition.name;
    }

    get accountName(): string | undefined {
        return this.account;
    }

    get type(): string {
        return this.definition.type;
    }

    get currency(): string {
        return this.definition.currency || 'CNY';
    }

    get userTags(): string[] {
        return this.definition.tags || [];
    }

    get virtualTags(): string[] {
        const virtualTags: string[] = [];
        
        // Add account name as virtual tag if asset belongs to an account
        if (this.account) {
            virtualTags.push(this.account);
        }

        // Add full name as virtual tag for all assets
        virtualTags.push(this.fullName);
        
        return virtualTags;
    }

    get allTags(): string[] {
        // Union of user tags and virtual tags
        const combinedTags = [...this.userTags, ...this.virtualTags];
        // Remove duplicates and return sorted array
        return [...new Set(combinedTags)].sort();
    }

    get definitionData(): AssetDefinitionData {
        return { ...this.definition };
    }

    // Value calculations
    async calculateCurrentValue(): Promise<AssetCurrentValueData> {
        const updates = await this.dataAccess.loadAssetUpdates();
        const activities = await this.extractActivities(updates);
        const valueHistory = await this.calculateValueHistory(activities);
        
        // Return the current value from the last entry in value history
        if (valueHistory.length > 0) {
            return valueHistory[valueHistory.length - 1].currentValue;
        }
        
        // Fallback for assets with no activities
        const currency = this.currency;
        return {
            currentValue: 0,
            currency,
            valueInCNY: 0,
            lastUpdateDate: undefined
        };
    }

    private async calculateValueHistory(activities: AssetActivityData[]): Promise<AssetDailyRecordData[]> {
        const valueHistory: AssetDailyRecordData[] = [];
        const currency = this.currency;
        
        if (activities.length === 0) {
            return valueHistory;
        }

        // Activities are already sorted by date (most recent first), so reverse for chronological processing
        const chronologicalActivities = [...activities].reverse();
        
        let runningValue = 0;
        let currentDate: string | null = null;
        let currentDayActivities: AssetActivityData[] = [];
        let lastUpdateDate: string | undefined;

        for (let i = 0; i < chronologicalActivities.length; i++) {
            const activity = chronologicalActivities[i];
            const activityDate = activity.date.split('T')[0]; // Get date part only
            
            // Check if we've moved to a new date
            if (currentDate !== null && currentDate !== activityDate) {
                // Save the value history entry for the previous date
                await this.saveValueHistoryEntry(
                    valueHistory, 
                    currentDate, 
                    runningValue, 
                    currency, 
                    currentDayActivities, 
                    lastUpdateDate
                );
                
                // Reset for the new date
                currentDayActivities = [];
            }
            
            // Update current date
            currentDate = activityDate;
            currentDayActivities.push(activity);
            
            // Apply the activity's effect on the running value
            switch (activity.type) {
                case 'snapshot':
                    // Snapshot sets the absolute value
                    runningValue = activity.totalValue;
                    break;
                case 'income':
                case 'transfer_in':
                case 'buy':
                    runningValue += activity.totalValue;
                    break;
                case 'expense':
                case 'transfer_out':
                case 'sell':
                    runningValue -= activity.totalValue;
                    break;
            }
            
            // Update last update date
            if (!lastUpdateDate || activity.date > lastUpdateDate) {
                lastUpdateDate = activity.date;
            }
        }

        // Don't forget to save the last date's entry
        if (currentDate !== null) {
            await this.saveValueHistoryEntry(
                valueHistory, 
                currentDate, 
                runningValue, 
                currency, 
                currentDayActivities, 
                lastUpdateDate
            );
        }

        return valueHistory;
    }

    private async saveValueHistoryEntry(
        valueHistory: AssetDailyRecordData[],
        date: string,
        runningValue: number,
        currency: string,
        dayActivities: AssetActivityData[],
        lastUpdateDate: string | undefined
    ): Promise<void> {
        // Calculate value in CNY
        let valueInCNY = runningValue;
        if (currency !== 'CNY') {
            try {
                const conversionResult = await this.convertCurrency(runningValue, currency, 'CNY', date);
                valueInCNY = conversionResult.convertedValue;
            } catch (error) {
                console.warn(`Currency conversion failed for ${this.fullName} on ${date}: ${error}`);
                // Use the raw value if conversion fails
                valueInCNY = runningValue;
            }
        }

        // Create value history entry for this date
        const valueHistoryEntry: AssetDailyRecordData = {
            date,
            currentValue: {
                currentValue: runningValue,
                currency,
                valueInCNY,
                lastUpdateDate
            },
            activities: [...dayActivities] // Copy activities for this date
        };

        valueHistory.push(valueHistoryEntry);
    }

    private calculateSnapshotEventValue(event: AssetEventData): number {
        // For snapshot events, use currentValue if available, otherwise calculate from shares * price
        if (event.currentValue !== undefined) {
            return event.currentValue;
        }

        if (event.shares !== undefined && event.price !== undefined) {
            return event.shares * event.price;
        }

        return 0;
    }

    private async convertCurrency(
        value: number,
        fromCurrency: string,
        toCurrency: string,
        targetDate: string
    ): Promise<{ convertedValue: number; exchangeRate: number }> {
        // Validate the toCurrency is always CNY
        if (toCurrency !== 'CNY') {
            throw new Error(`Currency conversion for transfers must always target CNY. Received: ${toCurrency}`);
        }

        try {
            const exchangeRate = await this.dataAccess.getExchangeRate(fromCurrency);
            if (!exchangeRate) {
                throw new Error(`No exchange rate found for USD`);
            }

            const rate = exchangeRate.findRateClosestTo(targetDate);
            if (rate === undefined) {
                throw new Error(`No exchange rate found for ${fromCurrency} near date ${targetDate}`);
            }

            return {
                convertedValue: value * rate,
                exchangeRate: rate
            };

        } catch (error) {
            throw new Error(`Currency conversion failed from ${fromCurrency} to ${toCurrency}: ${error}`);
        }
    }

    private async extractActivities(updates: PortfolioUpdateData[]): Promise<AssetActivityData[]> {
        const activities: AssetActivityData[] = [];
        let activityId = 1;

        // Process updates in chronological order to maintain proper sequence
        for (const update of updates) {
            const updateDate = update.date;

            // Extract activities from asset events
            const assetEventActivities = await this.extractActivitiesFromAssetEvents(update.assets, updateDate, activityId);
            activities.push(...assetEventActivities);
            activityId += assetEventActivities.length;

            // Extract activities from transfers
            if (update.transfers) {
                const transferActivities = await this.extractActivitiesFromTransfers(update.transfers, updateDate, activityId);
                activities.push(...transferActivities);
                activityId += transferActivities.length;
            }
        }

        return this.sortActivities(activities);
    }

    private async extractActivitiesFromAssetEvents(
        assetUpdates: AssetUpdateData[],
        updateDate: string,
        startingActivityId: number
    ): Promise<AssetActivityData[]> {
        const activities: AssetActivityData[] = [];
        let activityId = startingActivityId;

        // Extract asset events (income, expense, snapshots)
        for (const assetUpdate of assetUpdates) {
            if (assetUpdate.name === this.fullName) {
                const assetDate = assetUpdate.date || updateDate;

                for (const event of assetUpdate.events) {
                    const eventDate = event.date || assetDate;

                    // Convert income and expense events to activities
                    if (event.type === 'income' || event.type === 'expense') {
                        const activity: AssetActivityData = {
                            id: `${this.fullName}-event-${activityId++}`,
                            type: event.type,
                            amount: event.amount || 0,
                            totalValue: event.amount || 0,
                            date: eventDate
                        };

                        // Only include description if it exists
                        if (event.description) {
                            activity.description = event.description;
                        }

                        activities.push(activity);
                    }

                    // Include snapshot events as activities to show asset value changes
                    if (event.type === 'snapshot') {
                        const snapshotValue = this.calculateSnapshotEventValue(event);
                        const snapshotActivity: AssetActivityData = {
                            id: `${this.fullName}-snapshot-${activityId++}`,
                            type: 'snapshot',
                            totalValue: snapshotValue,
                            date: eventDate
                        };

                        // For stock assets, amount represents shares; for others, it represents the monetary value
                        if (this.type === 'stock' && event.shares !== undefined) {
                            snapshotActivity.amount = event.shares;
                            if (event.price !== undefined) {
                                snapshotActivity.unitPrice = event.price;
                            }
                        } else {
                            snapshotActivity.amount = snapshotValue;
                        }

                        // Only include description if it exists
                        if (event.description) {
                            snapshotActivity.description = event.description;
                        }

                        activities.push(snapshotActivity);
                    }
                }
            }
        }

        return activities;
    }

    private async extractActivitiesFromTransfers(
        transfers: TransferData[],
        updateDate: string,
        startingActivityId: number
    ): Promise<AssetActivityData[]> {
        const activities: AssetActivityData[] = [];
        let activityId = startingActivityId;

        for (const transfer of transfers) {
            const transferDate = transfer.date || updateDate;

            // Transfer OUT from this asset
            if (transfer.from === this.fullName) {
                // For stock assets, only allow sell operations (not regular transfers)
                if (this.type === 'stock') {
                    // This is a sell operation for stock assets
                    let totalValue = transfer.totalValue || (transfer.amount && transfer.unitPrice ? transfer.amount * transfer.unitPrice : transfer.amount || 0);

                    const transferOutActivity: AssetActivityData = {
                        id: `${this.fullName}-sell-${activityId++}`,
                        type: 'sell',
                        amount: transfer.amount,
                        totalValue: totalValue,
                        date: transferDate,
                        relatedAsset: transfer.to
                    };

                    // Include buy/sell specific data if available
                    if (transfer.unitPrice) {
                        transferOutActivity.unitPrice = transfer.unitPrice;
                    }

                    // Only include description if it exists
                    if (transfer.description) {
                        transferOutActivity.description = transfer.description;
                    }

                    activities.push(transferOutActivity);
                } else {
                    // For non-stock assets, create regular transfer_out activities
                    let totalValue = transfer.totalValue || (transfer.amount && transfer.unitPrice ? transfer.amount * transfer.unitPrice : transfer.amount || 0);

                    // Convert currency for non-stock assets (i.e., paying for stock purchase)
                    let exchangeRateUsed: number | undefined;
                    if (transfer.to) {
                        const sourceCurrency = this.currency;
                        try {
                            const targetAsset = await this.dataAccess.getAssetByFullName(transfer.to);
                            const targetCurrency = targetAsset.currency;

                            if (targetCurrency !== 'CNY') {
                                const originalValue = totalValue;
                                const conversionResult = await this.convertCurrency(totalValue, targetCurrency, sourceCurrency, transferDate);
                                totalValue = conversionResult.convertedValue;

                                // Store exchange rate if conversion occurred
                                if (originalValue !== totalValue && sourceCurrency !== targetCurrency) {
                                    exchangeRateUsed = conversionResult.exchangeRate;
                                }
                            }
                        } catch (error) {
                            console.warn(`Currency conversion failed for transfer from ${this.name} (${sourceCurrency}) to ${transfer.to}: ${error}`);
                            // Continue with original value if conversion fails
                        }
                    }

                    const transferOutActivity: AssetActivityData = {
                        id: `${this.fullName}-transfer-out-${activityId++}`,
                        type: 'transfer_out',
                        amount: transfer.amount,
                        totalValue: totalValue,
                        date: transferDate,
                        relatedAsset: transfer.to
                    };

                    // Include unit price if available
                    if (transfer.unitPrice) {
                        transferOutActivity.unitPrice = transfer.unitPrice;
                    }

                    // Include exchange rate if currency conversion was used
                    if (exchangeRateUsed) {
                        transferOutActivity.exchangeRate = exchangeRateUsed;
                    }

                    // Only include description if it exists
                    if (transfer.description) {
                        transferOutActivity.description = transfer.description;
                    }

                    activities.push(transferOutActivity);
                }
            }

            // Transfer IN to this asset
            if (transfer.to === this.fullName) {
                // For stock assets, only allow buy operations (not regular transfers)
                if (this.type === 'stock') {
                    // This is a buy operation for stock assets
                    let totalValue = transfer.totalValue || (transfer.amount && transfer.unitPrice ? transfer.amount * transfer.unitPrice : transfer.amount || 0);

                    const transferInActivity: AssetActivityData = {
                        id: `${this.fullName}-buy-${activityId++}`,
                        type: 'buy',
                        amount: transfer.amount,
                        totalValue: totalValue,
                        date: transferDate,
                        relatedAsset: transfer.from
                    };

                    // Include buy/sell specific data if available
                    if (transfer.unitPrice) {
                        transferInActivity.unitPrice = transfer.unitPrice;
                    }

                    // Only include description if it exists
                    if (transfer.description) {
                        transferInActivity.description = transfer.description;
                    }

                    activities.push(transferInActivity);
                } else {
                    // For non-stock assets, create regular transfer_in activities
                    let totalValue = transfer.totalValue || (transfer.amount && transfer.unitPrice ? transfer.amount * transfer.unitPrice : transfer.amount || 0);

                    // Convert currency for non-stock assets (i.e., receiving money from stock sale)
                    let exchangeRateUsed: number | undefined;
                    if (transfer.from) {
                        try {
                            const sourceAsset = await this.dataAccess.getAssetByFullName(transfer.from);
                            const sourceCurrency = sourceAsset.currency;
                            const targetCurrency = this.currency;

                            if (sourceCurrency !== 'CNY') {
                                const originalValue = totalValue;
                                const conversionResult = await this.convertCurrency(totalValue, sourceCurrency, targetCurrency, transferDate);
                                totalValue = conversionResult.convertedValue;

                                // Store exchange rate if conversion occurred
                                if (originalValue !== totalValue && sourceCurrency !== targetCurrency) {
                                    exchangeRateUsed = conversionResult.exchangeRate;
                                }
                            }
                        } catch (error) {
                            console.warn(`Currency conversion failed for transfer from ${transfer.from} to ${this.name} (${this.currency}): ${error}`);
                            // Continue with original value if conversion fails
                        }
                    }

                    const transferInActivity: AssetActivityData = {
                        id: `${this.fullName}-transfer-in-${activityId++}`,
                        type: 'transfer_in',
                        amount: transfer.amount,
                        totalValue: totalValue,
                        date: transferDate,
                        relatedAsset: transfer.from
                    };

                    // Include unit price if available
                    if (transfer.unitPrice) {
                        transferInActivity.unitPrice = transfer.unitPrice;
                    }

                    // Include exchange rate if currency conversion was used
                    if (exchangeRateUsed) {
                        transferInActivity.exchangeRate = exchangeRateUsed;
                    }

                    // Only include description if it exists
                    if (transfer.description) {
                        transferInActivity.description = transfer.description;
                    }

                    activities.push(transferInActivity);
                }
            }
        }

        return activities;
    }

    private sortActivities(activities: AssetActivityData[]): AssetActivityData[] {
        // Sort activities by date (most recent first), then by type (snapshots first), then by activity ID
        return activities.sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();

            // Primary sort: most recent first
            if (dateB !== dateA) {
                return dateB - dateA;
            }

            // Secondary sort: for same day, snapshots come first
            if (a.type === 'snapshot' && b.type !== 'snapshot') {
                return -1; // a (snapshot) comes before b
            }
            if (b.type === 'snapshot' && a.type !== 'snapshot') {
                return 1; // b (snapshot) comes before a
            }

            // Tertiary sort: by activity ID for consistent ordering of same-date, same-priority activities
            return a.id.localeCompare(b.id);
        });
    }

    extractLastMonthIncome(activities: AssetActivityData[]): number {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        // Calculate income from direct income events, transfer-in activities, and buy operations
        return activities
            .filter(activity => {
                const activityDate = new Date(activity.date);
                const isRecentActivity = activityDate >= oneMonthAgo;
                const isIncomeActivity = activity.type === 'income' || activity.type === 'transfer_in' || activity.type === 'buy';

                return isRecentActivity && isIncomeActivity;
            })
            .reduce((total, activity) => total + activity.totalValue, 0);
    }

    // Summary generation
    async generateSummary(): Promise<AssetSummaryData> {
        // Load updates once and extract all needed data
        const updates = await this.dataAccess.loadAssetUpdates();
        const activities = await this.extractActivities(updates);
        const valueHistory = await this.calculateValueHistory(activities);
        
        // Get current value from value history
        const currentValue = valueHistory.length > 0 
            ? valueHistory[valueHistory.length - 1].currentValue
            : {
                currentValue: 0,
                currency: this.currency,
                valueInCNY: 0,
                lastUpdateDate: undefined
            };

        const summary: AssetSummaryData = {
            definition: this.definitionData,
            account: this.account, // Include account information
            currentValue,
            activities,
            valueHistory
        };

        // Add last month income for simple assets
        if (this.type === 'simple') {
            summary.lastMonthIncome = this.extractLastMonthIncome(activities);
        }

        return summary;
    }
}
