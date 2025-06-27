import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import {
    PortfolioData,
    PortfolioUpdateData,
    ExchangeRateData
} from './interfaces';

export class PortfolioDataStore {
    private portfolioDataCache?: PortfolioData;
    private assetUpdatesCache?: PortfolioUpdateData[];

    constructor(private workspaceFolder: vscode.WorkspaceFolder) {}

    // Portfolio definition operations
    async loadPortfolioData(): Promise<PortfolioData | undefined> {
        // Return cached data if available
        if (this.portfolioDataCache !== undefined) {
            console.log('Returning cached portfolio data');
            return this.portfolioDataCache;
        }

        console.log('Loading portfolio data from file');
        this.portfolioDataCache = await this.loadPortfolioDataFromFile();
        return this.portfolioDataCache;
    }

    private async loadPortfolioDataFromFile(): Promise<PortfolioData | undefined> {
        try {
            const assetsFolder = path.join(this.workspaceFolder.uri.fsPath, 'Assets');
            const portfolioJsonPath = path.join(assetsFolder, 'portfolio.json');
            
            if (!fs.existsSync(portfolioJsonPath)) {
                return undefined;
            }

            const portfolioContent = fs.readFileSync(portfolioJsonPath, 'utf8');
            const rawPortfolioData = JSON.parse(portfolioContent) as PortfolioData;
            
            // Validate the structure
            if (!rawPortfolioData.assets || !Array.isArray(rawPortfolioData.assets)) {
                console.error('Invalid portfolio.json: "assets" array is required');
                return undefined;
            }
            
            // Validate each asset
            for (const asset of rawPortfolioData.assets) {
                if (!asset.name || !asset.type) {
                    console.error('Invalid portfolio.json: Each asset must have "name" and "type" fields');
                    return undefined;
                }
                
                if (!['simple', 'investment', 'composite', 'stock'].includes(asset.type)) {
                    console.error(`Invalid asset type "${asset.type}". Must be one of: simple, investment, composite, stock`);
                    return undefined;
                }
            }
            
            return rawPortfolioData;
        } catch (error) {
            console.error('Error loading portfolio.json:', error);
            return undefined;
        }
    }

    async savePortfolioData(data: PortfolioData): Promise<void> {
        try {
            const assetsFolder = path.join(this.workspaceFolder.uri.fsPath, 'Assets');
            const portfolioJsonPath = path.join(assetsFolder, 'portfolio.json');
            
            // Create Assets folder if it doesn't exist
            if (!fs.existsSync(assetsFolder)) {
                fs.mkdirSync(assetsFolder, { recursive: true });
            }
            
            // Create backup if file exists
            if (fs.existsSync(portfolioJsonPath)) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                const backupPath = path.join(assetsFolder, `portfolio-backup-${timestamp}.json`);
                fs.copyFileSync(portfolioJsonPath, backupPath);
                console.log(`Backup created: ${backupPath}`);
            }

            // Format and save the data
            const jsonContent = JSON.stringify(data, null, 2);
            fs.writeFileSync(portfolioJsonPath, jsonContent, 'utf8');
            
            // Update cache
            this.portfolioDataCache = data;
            console.log(`Portfolio saved with ${data.assets.length} asset definitions`);
        } catch (error) {
            console.error('Error saving portfolio data:', error);
            throw error;
        }
    }

    invalidatePortfolioCache(): void {
        this.portfolioDataCache = undefined;
    }

    // Asset update operations
    async loadAssetUpdates(): Promise<PortfolioUpdateData[]> {
        // Return cached data if available
        if (this.assetUpdatesCache !== undefined) {
            return this.assetUpdatesCache;
        }

        this.assetUpdatesCache = await this.loadAssetUpdateFiles();
        return this.assetUpdatesCache;
    }

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

    async saveAssetUpdate(update: PortfolioUpdateData): Promise<string> {
        try {
            const assetUpdatesFolder = path.join(this.workspaceFolder.uri.fsPath, 'AssetUpdates');
            
            // Create AssetUpdates folder if it doesn't exist
            if (!fs.existsSync(assetUpdatesFolder)) {
                fs.mkdirSync(assetUpdatesFolder, { recursive: true });
            }

            // Create filename with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const filename = `portfolio-update-${timestamp}.json`;
            const filePath = path.join(assetUpdatesFolder, filename);

            // Format and save the data
            const jsonContent = JSON.stringify(update, null, 2);
            fs.writeFileSync(filePath, jsonContent, 'utf8');

            // Invalidate cache to force reload
            this.invalidateAssetUpdatesCache();

            console.log(`Asset update saved to ${filename}`);
            return filename;
        } catch (error) {
            console.error('Error saving asset update:', error);
            throw error;
        }
    }

    invalidateAssetUpdatesCache(): void {
        this.assetUpdatesCache = undefined;
    }

    // Exchange rate operations
    getAllExchangeRates(updates?: PortfolioUpdateData[]): Map<string, ExchangeRateData[]> {
        const exchangeRatesByDate = new Map<string, ExchangeRateData[]>();
        const updatesToProcess = updates || this.assetUpdatesCache || [];
        
        // Process updates in chronological order to collect all rates
        for (const update of updatesToProcess) {
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

    findClosestExchangeRate(currency: string, targetDate: string, allRates: Map<string, ExchangeRateData[]>): number | undefined {
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
}
