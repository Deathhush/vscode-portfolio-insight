import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { AssetDefinitionData } from '../providers/portfolioExplorerProvider';

export interface AssetEventData {
    type: 'snapshot' | 'income' | 'expense';
    currentValue?: number;
    marketValue?: number;
    shares?: number;
    price?: number;
    amount?: number;
    date?: string;
}

export interface AssetUpdateData {
    name: string;
    date?: string;
    events: AssetEventData[];
}

export interface TransferData {
    from: string;
    to: string;
    amount: number;
    date?: string;
}

export interface ExchangeRateData {
    from: string;
    rate: number;
    date?: string; // Date when this exchange rate was recorded
}

export interface PortfolioUpdateData {
    date: string;
    assets: AssetUpdateData[];
    transfers?: TransferData[];
    exchangeRates?: ExchangeRateData[];
}

export interface AssetCurrentValue {
    name: string;
    currentValue: number;
    currency: string;
    valueInCNY: number;
    lastUpdateDate?: string;
}

export class PortfolioValueCalculator {
    constructor(private workspaceFolder: vscode.WorkspaceFolder) {}    /**
     * Load all asset update files from the AssetUpdates folder
     */
    private async loadAssetUpdateFiles(): Promise<PortfolioUpdateData[]> {
        const assetUpdatesFolder = path.join(this.workspaceFolder.uri.fsPath, 'AssetUpdates');
        
        if (!fs.existsSync(assetUpdatesFolder)) {
            return [];
        }

        const files = fs.readdirSync(assetUpdatesFolder)
            .filter(file => file.endsWith('.json'))
            .sort(); // Sort to ensure chronological order

        const updates: PortfolioUpdateData[] = [];
        
        for (const file of files) {
            try {
                const filePath = path.join(assetUpdatesFolder, file);
                const content = fs.readFileSync(filePath, 'utf8');
                const update = JSON.parse(content) as PortfolioUpdateData;
                updates.push(update);
            } catch (error) {
                console.error(`Error loading asset update file ${file}:`, error);
            }
        }

        return updates;
    }
      /**
     * Merge all asset events by asset name, keeping the latest snapshot for each asset
     */
    private mergeAssetEvents(updates: PortfolioUpdateData[]): Map<string, { event: AssetEventData; date: string }> {
        const latestSnapshots = new Map<string, { event: AssetEventData; date: string }>();

        // Process updates in chronological order
        for (const update of updates) {
            for (const assetUpdate of update.assets) {
                const assetName = assetUpdate.name;
                const assetDate = assetUpdate.date || update.date;
                
                // Find the latest snapshot event for this asset
                for (const event of assetUpdate.events) {
                    if (event.type === 'snapshot') {
                        const eventDate = event.date || assetDate;
                        latestSnapshots.set(assetName, { event, date: eventDate });
                    }
                }
            }
        }

        return latestSnapshots;
    }
      /**
     * Get all exchange rates from all updates with their dates
     */
    private getAllExchangeRates(updates: PortfolioUpdateData[]): Map<string, ExchangeRateData[]> {
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
    }    /**
     * Find the closest exchange rate to a given date
     */
    private findClosestExchangeRate(currency: string, targetDate: string, allExchangeRates: Map<string, ExchangeRateData[]>): number | undefined {
        const ratesForCurrency = allExchangeRates.get(currency);
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
    }    /**
     * Calculate current value for an asset in its native currency
     */
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
      /**
     * Convert value to CNY using exchange rates, finding the closest rate to the target date
     */
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
      /**
     * Calculate current values for all assets
     */
    public async calculateCurrentValues(portfolioAssets: AssetDefinitionData[]): Promise<AssetCurrentValue[]> {
        const updates = await this.loadAssetUpdateFiles();
        const latestSnapshots = this.mergeAssetEvents(updates);
        const allExchangeRates = this.getAllExchangeRates(updates);
        
        const assetValues: AssetCurrentValue[] = [];

        for (const asset of portfolioAssets) {
            const snapshotData = latestSnapshots.get(asset.name);
            const currency = asset.currency || 'CNY';
            
            let currentValue = 0;
            let snapshotDate = new Date().toISOString(); // Default to today if no snapshot
            
            if (snapshotData) {
                currentValue = this.calculateAssetValue(snapshotData.event);
                snapshotDate = snapshotData.date;
            }

            try {
                const valueInCNY = this.convertToCNY(currentValue, currency, snapshotDate, allExchangeRates);

                assetValues.push({
                    name: asset.name,
                    currentValue,
                    currency,
                    valueInCNY,
                    lastUpdateDate: snapshotData?.date
                });
            } catch (error) {
                // Re-throw with more context about which asset failed
                throw new Error(`Failed to calculate value for asset "${asset.name}": ${error}`);
            }
        }

        return assetValues;
    }

    /**
     * Calculate total portfolio value in CNY
     */
    public async calculateTotalValue(portfolioAssets: AssetDefinitionData[]): Promise<number> {
        const assetValues = await this.calculateCurrentValues(portfolioAssets);
        return assetValues.reduce((total, asset) => total + asset.valueInCNY, 0);
    }
}
