import {
    AssetDefinitionData,
    AssetCurrentValue,
    AssetActivity,
    AssetSummary,
    AssetEventData,
    AssetUpdateData,
    TransferData,
    PortfolioUpdateData
} from './interfaces';
import { PortfolioDataStore } from './portfolioDataStore';

export class Asset {
    private latestSnapshot?: { event: AssetEventData; date: string };
    private activities: AssetActivity[] = [];
    private currentValueCache?: AssetCurrentValue;
    private activitiesLoaded = false;
    
    constructor(
        private definition: AssetDefinitionData,
        private dataStore: PortfolioDataStore
    ) {}
    
    // Core properties
    get name(): string {
        return this.definition.name;
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
    async calculateCurrentValue(): Promise<AssetCurrentValue> {
        if (this.currentValueCache) {
            return this.currentValueCache;
        }

        const updates = await this.dataStore.loadAssetUpdates();
        const latestSnapshot = this.mergeAssetEvents(updates);
        const allExchangeRates = this.dataStore.getAllExchangeRates(updates);
        
        const currency = this.currency;
        let currentValue = 0;
        let snapshotDate = new Date().toISOString(); // Default to today if no snapshot
        
        if (latestSnapshot) {
            currentValue = this.calculateAssetValue(latestSnapshot.event);
            snapshotDate = latestSnapshot.date;
            this.latestSnapshot = latestSnapshot;
        }

        try {
            const valueInCNY = this.convertToCNY(currentValue, currency, snapshotDate, allExchangeRates);

            this.currentValueCache = {
                name: this.name,
                currentValue,
                currency,
                valueInCNY,
                lastUpdateDate: latestSnapshot?.date
            };

            return this.currentValueCache;
        } catch (error) {
            // Re-throw with more context about which asset failed
            throw new Error(`Failed to calculate value for asset "${this.name}": ${error}`);
        }
    }

    private mergeAssetEvents(updates: PortfolioUpdateData[]): { event: AssetEventData; date: string } | undefined {
        let latestSnapshot: { event: AssetEventData; date: string } | undefined;
        let latestSnapshotTime = 0;

        // Process all updates to collect all snapshot events
        for (const update of updates) {
            for (const assetUpdate of update.assets) {
                if (assetUpdate.name === this.name) {
                    const assetDate = assetUpdate.date || update.date;
                    
                    // Find all snapshot events for this asset and compare dates
                    for (const event of assetUpdate.events) {
                        if (event.type === 'snapshot') {
                            const eventDate = event.date || assetDate;
                            const eventTime = new Date(eventDate).getTime();
                            
                            // Only update if this snapshot is chronologically later
                            if (!latestSnapshot || eventTime > latestSnapshotTime) {
                                latestSnapshot = { event, date: eventDate };
                                latestSnapshotTime = eventTime;
                            }
                        }
                    }
                }
            }
        }

        return latestSnapshot;
    }

    private calculateAssetValue(event: AssetEventData): number {
        // For snapshot events, use currentValue if available, otherwise calculate from shares * price
        if (event.currentValue !== undefined) {
            return event.currentValue;
        }
        
        if (event.shares !== undefined && event.price !== undefined) {
            return event.shares * event.price;
        }

        return 0;
    }

    private convertToCNY(value: number, currency: string, targetDate: string, allExchangeRates: Map<string, any[]>): number {
        if (currency === 'CNY' || !currency) {
            return value;
        }

        const rate = this.dataStore.findClosestExchangeRate(currency, targetDate, allExchangeRates);
        if (rate === undefined) {
            throw new Error(`No exchange rate found for currency ${currency} near date ${targetDate}. Please provide exchange rates for all foreign currencies in your asset update files.`);
        }

        return value * rate;
    }
    
    // Activity management
    async loadActivities(): Promise<AssetActivity[]> {
        if (this.activitiesLoaded) {
            return this.activities;
        }

        const updates = await this.dataStore.loadAssetUpdates();
        this.activities = this.extractActivities(updates);
        this.activitiesLoaded = true;
        
        return this.activities;
    }

    private extractActivities(updates: PortfolioUpdateData[]): AssetActivity[] {
        const activities: AssetActivity[] = [];
        let activityId = 1;

        // Process updates in chronological order to maintain proper sequence
        for (const update of updates) {
            const updateDate = update.date;
            
            // Extract asset events (income, expense, snapshots)
            for (const assetUpdate of update.assets) {
                if (assetUpdate.name === this.name) {
                    const assetDate = assetUpdate.date || updateDate;
                    
                    for (const event of assetUpdate.events) {
                        const eventDate = event.date || assetDate;
                        
                        // Convert income and expense events to activities
                        if (event.type === 'income' || event.type === 'expense') {
                            activities.push({
                                id: `${this.name}-event-${activityId++}`,
                                type: event.type,
                                amount: event.amount || 0,
                                date: eventDate,
                                description: event.description || `${event.type.charAt(0).toUpperCase() + event.type.slice(1)} transaction`
                            });
                        }
                        
                        // Include snapshot events as activities to show asset value changes
                        if (event.type === 'snapshot') {
                            const snapshotValue = this.calculateAssetValue(event);
                            activities.push({
                                id: `${this.name}-snapshot-${activityId++}`,
                                type: 'snapshot',
                                amount: snapshotValue,
                                date: eventDate,
                                description: event.description || `Asset value snapshot: ${this.currency} ${snapshotValue.toLocaleString()}`
                            });
                        }
                    }
                }
            }

            // Extract and merge transfer activities
            if (update.transfers) {
                for (const transfer of update.transfers) {
                    const transferDate = transfer.date || updateDate;
                    
                    // Transfer OUT from this asset
                    if (transfer.from === this.name) {
                        activities.push({
                            id: `${this.name}-transfer-out-${activityId++}`,
                            type: 'transfer_out',
                            amount: transfer.amount,
                            date: transferDate,
                            description: transfer.description || `Transfer to ${transfer.to}`,
                            relatedAsset: transfer.to
                        });
                    }
                    
                    // Transfer IN to this asset
                    if (transfer.to === this.name) {
                        activities.push({
                            id: `${this.name}-transfer-in-${activityId++}`,
                            type: 'transfer_in',
                            amount: transfer.amount,
                            date: transferDate,
                            description: transfer.description || `Transfer from ${transfer.from}`,
                            relatedAsset: transfer.from
                        });
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

    getLastMonthIncome(): number {
        if (!this.activitiesLoaded) {
            return 0;
        }

        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        // Calculate income from both direct income events and transfer-in activities
        return this.activities
            .filter(activity => {
                const activityDate = new Date(activity.date);
                const isRecentActivity = activityDate >= oneMonthAgo;
                const isIncomeActivity = activity.type === 'income' || activity.type === 'transfer_in';
                
                return isRecentActivity && isIncomeActivity;
            })
            .reduce((total, activity) => total + activity.amount, 0);
    }
    
    // Summary generation
    async generateSummary(): Promise<AssetSummary> {
        const currentValue = await this.calculateCurrentValue();
        const activities = await this.loadActivities();
        
        const summary: AssetSummary = {
            definition: this.definitionData,
            currentValue,
            activities
        };

        // Add last month income for simple assets
        if (this.type === 'simple') {
            summary.lastMonthIncome = this.getLastMonthIncome();
        }

        return summary;
    }
    
    // Cache management
    invalidateCache(): void {
        this.currentValueCache = undefined;
        this.activities = [];
        this.activitiesLoaded = false;
        this.latestSnapshot = undefined;
    }

    // Activity statistics and helpers
    getActivityStatistics(): {
        totalIncome: number;
        totalExpenses: number;
        totalTransferIn: number;
        totalTransferOut: number;
        totalSnapshots: number;
        netFlow: number;
        activityCount: number;
    } {
        if (!this.activitiesLoaded) {
            return {
                totalIncome: 0,
                totalExpenses: 0,
                totalTransferIn: 0,
                totalTransferOut: 0,
                totalSnapshots: 0,
                netFlow: 0,
                activityCount: 0
            };
        }

        const stats = {
            totalIncome: 0,
            totalExpenses: 0,
            totalTransferIn: 0,
            totalTransferOut: 0,
            totalSnapshots: 0,
            netFlow: 0,
            activityCount: this.activities.length
        };

        for (const activity of this.activities) {
            switch (activity.type) {
                case 'income':
                    stats.totalIncome += activity.amount;
                    stats.netFlow += activity.amount;
                    break;
                case 'expense':
                    stats.totalExpenses += activity.amount;
                    stats.netFlow -= activity.amount;
                    break;
                case 'transfer_in':
                    stats.totalTransferIn += activity.amount;
                    stats.netFlow += activity.amount;
                    break;
                case 'transfer_out':
                    stats.totalTransferOut += activity.amount;
                    stats.netFlow -= activity.amount;
                    break;
                case 'snapshot':
                    stats.totalSnapshots += 1;
                    // Snapshots don't affect net flow as they represent value states, not cash flows
                    break;
            }
        }

        return stats;
    }

    getActivitiesByDateRange(startDate: Date, endDate: Date): AssetActivity[] {
        if (!this.activitiesLoaded) {
            return [];
        }

        return this.activities.filter(activity => {
            const activityDate = new Date(activity.date);
            return activityDate >= startDate && activityDate <= endDate;
        });
    }

    getActivitiesByType(type: AssetActivity['type']): AssetActivity[] {
        if (!this.activitiesLoaded) {
            return [];
        }

        return this.activities.filter(activity => activity.type === type);
    }
}
