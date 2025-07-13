import {
    AssetDefinitionData,
    AssetCurrentValueData,
    AssetActivityData,
    AssetSummaryData,
    AssetEventData,
    AssetUpdateData,
    TransferData,
    PortfolioUpdateData,
    ExchangeRateData
} from './interfaces';
import { PortfolioDataAccess } from './portfolioDataAccess';

export class Asset {
    constructor(
        private definition: AssetDefinitionData,
        private dataAccess: PortfolioDataAccess,
        private account?: string // Add account parameter
    ) {}
    
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

    get definitionData(): AssetDefinitionData {
        return { ...this.definition };
    }
    
    // Value calculations
    async calculateCurrentValue(): Promise<AssetCurrentValueData> {
        // Load updates and extract current value
        const updates = await this.dataAccess.loadAssetUpdates();
        const portfolioData = await this.dataAccess.getPortfolioData();
        return await this.extractCurrentValue(updates);
    }

    private async extractCurrentValue(updates: PortfolioUpdateData[]): Promise<AssetCurrentValueData> {
        // Extract activities and exchange rates from the updates
        const activities = await this.extractActivities(updates);
        const allExchangeRates = this.extractExchangeRates(updates);
        
        const currency = this.currency;
        let currentValue = 0;
        let snapshotDate = new Date().toISOString(); // Default to today if no snapshot
        let lastUpdateDate: string | undefined;
        
        // Find the latest snapshot activity (activities are already sorted with most recent first)
        const latestSnapshotActivity = activities.find(activity => activity.type === 'snapshot');
        
        if (latestSnapshotActivity) {
            currentValue = latestSnapshotActivity.totalValue;
            snapshotDate = latestSnapshotActivity.date;
            lastUpdateDate = latestSnapshotActivity.date;
        }

        try {
            const valueInCNY = this.convertToCNY(currentValue, currency, snapshotDate, allExchangeRates);

            return {
                currentValue,
                currency,
                valueInCNY,
                lastUpdateDate
            };
        } catch (error) {
            // Re-throw with more context about which asset failed
            throw new Error(`Failed to calculate value for asset "${this.fullName}": ${error}`);
        }
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

    private convertToCNY(value: number, currency: string, targetDate: string, allExchangeRates: Map<string, ExchangeRateData[]>): number {
        if (currency === 'CNY' || !currency) {
            return value;
        }

        const rate = this.findClosestExchangeRate(currency, targetDate, allExchangeRates);
        if (rate === undefined) {
            throw new Error(`No exchange rate found for currency ${currency} near date ${targetDate}. Please provide exchange rates for all foreign currencies in your asset update files.`);
        }

        return value * rate;
    }

    private convertFromCNY(cnyValue: number, targetCurrency: string, targetDate: string, allExchangeRates: Map<string, ExchangeRateData[]>): number {
        if (targetCurrency === 'CNY' || !targetCurrency) {
            return cnyValue;
        }

        const rate = this.findClosestExchangeRate(targetCurrency, targetDate, allExchangeRates);
        if (rate === undefined) {
            throw new Error(`No exchange rate found for currency ${targetCurrency} near date ${targetDate}. Please provide exchange rates for all foreign currencies in your asset update files.`);
        }

        return cnyValue / rate; // Divide to convert from CNY to target currency
    }

    private convertCurrencyForTransfer(
        value: number, 
        fromCurrency: string, 
        toCurrency: string, 
        transferDate: string, 
        allExchangeRates: Map<string, ExchangeRateData[]>
    ): number {
        // Only handle USD <-> CNY conversions
        if (fromCurrency === toCurrency || 
            (fromCurrency !== 'USD' && fromCurrency !== 'CNY') ||
            (toCurrency !== 'USD' && toCurrency !== 'CNY')) {
            return value;
        }

        try {
            if (fromCurrency === 'USD' && toCurrency === 'CNY') {
                // Convert USD to CNY
                return value * this.findClosestExchangeRate('USD', transferDate, allExchangeRates)!;
            } else if (fromCurrency === 'CNY' && toCurrency === 'USD') {
                // Convert CNY to USD
                return value / this.findClosestExchangeRate('USD', transferDate, allExchangeRates)!;
            }
        } catch (error) {
            throw new Error(`Currency conversion failed from ${fromCurrency} to ${toCurrency}: ${error}`);
        }

        return value;
    }

    // Exchange rate operations (moved from PortfolioDataStore)
    private extractExchangeRates(updates: PortfolioUpdateData[]): Map<string, ExchangeRateData[]> {
        const exchangeRatesByDate = new Map<string, ExchangeRateData[]>();
        
        // Process updates in chronological order to collect all rates
        for (const update of updates) {
            if (update.exchangeRates) {
                for (const rate of update.exchangeRates) {
                    const rateWithDate: ExchangeRateData = {
                        ...rate,
                        date: rate.date || update.date
                    };
                    
                    if (!exchangeRatesByDate.has(rate.from)) {
                        exchangeRatesByDate.set(rate.from, []);
                    }
                    exchangeRatesByDate.get(rate.from)!.push(rateWithDate);
                }
            }
        }

        // Sort exchange rates by date for each currency
        for (const [currency, rates] of exchangeRatesByDate.entries()) {
            rates.sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());
        }

        return exchangeRatesByDate;
    }

    private findClosestExchangeRate(currency: string, targetDate: string, allRates: Map<string, ExchangeRateData[]>): number | undefined {
        const ratesForCurrency = allRates.get(currency);
        if (!ratesForCurrency || ratesForCurrency.length === 0) {
            return undefined;
        }

        const targetTime = new Date(targetDate).getTime();
        let closestRate: ExchangeRateData | undefined;
        let minTimeDiff = Infinity;

        for (const rate of ratesForCurrency) {
            const rateTime = new Date(rate.date!).getTime();
            const timeDiff = Math.abs(targetTime - rateTime);
            
            if (timeDiff < minTimeDiff) {
                minTimeDiff = timeDiff;
                closestRate = rate;
            }
        }

        return closestRate?.rate;
    }

    private async extractActivities(updates: PortfolioUpdateData[]): Promise<AssetActivityData[]> {
        const activities: AssetActivityData[] = [];
        let activityId = 1;

        // Extract exchange rates for currency conversion
        const allExchangeRates = this.extractExchangeRates(updates);

        // Process updates in chronological order to maintain proper sequence
        for (const update of updates) {
            const updateDate = update.date;
            
            // Extract asset events (income, expense, snapshots)
            for (const assetUpdate of update.assets) {
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

            // Extract and merge transfer activities
            if (update.transfers) {
                for (const transfer of update.transfers) {
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
                                    
                                    const originalValue = totalValue;
                                    totalValue = this.convertCurrencyForTransfer(totalValue, sourceCurrency, targetCurrency, transferDate, allExchangeRates);
                                    
                                    // Store exchange rate if conversion occurred
                                    if (originalValue !== totalValue && sourceCurrency !== targetCurrency) {
                                        exchangeRateUsed = this.findClosestExchangeRate('USD', transferDate, allExchangeRates);
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
                                    
                                    const originalValue = totalValue;
                                    totalValue = this.convertCurrencyForTransfer(totalValue, sourceCurrency, targetCurrency, transferDate, allExchangeRates);
                                    
                                    // Store exchange rate if conversion occurred
                                    if (originalValue !== totalValue && sourceCurrency !== targetCurrency) {
                                        exchangeRateUsed = this.findClosestExchangeRate('USD', transferDate, allExchangeRates);
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
            }
        }

        // Sort activities by date (most recent first), then by activity ID for consistent ordering
        activities.sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            
            // Primary sort: most recent first
            if (dateB !== dateA) {
                return dateB - dateA;
            }
            
            // Secondary sort: by ID for consistent ordering of same-date activities
            return a.id.localeCompare(b.id);
        });
        
        return activities;
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
        
        const currentValue = await this.extractCurrentValue(updates);
        const activities = await this.extractActivities(updates);
        
        const summary: AssetSummaryData = {
            definition: this.definitionData,
            account: this.account, // Include account information
            currentValue,
            activities
        };

        // Add last month income for simple assets
        if (this.type === 'simple') {
            summary.lastMonthIncome = this.extractLastMonthIncome(activities);
        }

        return summary;
    }
}
