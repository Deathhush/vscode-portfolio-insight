import * as vscode from 'vscode';
import { PortfolioDataStore } from './portfolioDataStore';
import { Asset } from './asset';
import { Account } from './account';
import { Category } from './category';
import { ExchangeRate } from './exchangeRate';
import { AssetDefinitionData, AccountDefinitionData, PortfolioData, PortfolioUpdateData, CategoryDefinitionData, CategoryData, ExchangeRateData } from './interfaces';

/**
 * PortfolioDataAccess serves as a bridge between the on-disk store (PortfolioDataStore) 
 * and the in-memory structures (like Asset). It provides caching and higher-level 
 * data access operations.
 */
export class PortfolioDataAccess {
    private assetCache: Map<string, Asset> = new Map();
    private accountCache: Map<string, Account> = new Map();
    private exchangeRateCache: Map<string, ExchangeRate> = new Map();
    private tagsCache: string[] | undefined;
    private portfolioDataCache: PortfolioData | undefined;
    private assetUpdatesCache: PortfolioUpdateData[] | undefined;
    private categoryDefinitionCache: CategoryDefinitionData | undefined;
    private _onDataUpdatedEmitter = new vscode.EventEmitter<void>();
    
    // Event that fires when portfolio data is updated
    public readonly onDataUpdated: vscode.Event<void> = this._onDataUpdatedEmitter.event;

    constructor(private dataStore: PortfolioDataStore) {
    }

    /**
     * Retrieves an existing asset by name and optional account
     * @param name The name of the asset to retrieve
     * @param account The account name (if the asset belongs to an account)
     * @returns The asset if found
     * @throws Error if the asset doesn't exist in the specified location
     */
    public async getAsset(name: string, account?: string): Promise<Asset> {
        const fullName = account ? `${account}.${name}` : name;
        
        // Check cache first
        const cachedAsset = this.getCachedAsset(fullName);
        if (cachedAsset) {
            return cachedAsset;
        }

        // Find the asset in portfolio data
        const portfolioData = await this.getPortfolioData();
        const assetDefinition = this.findAssetInPortfolio(portfolioData, name, account);
        
        if (!assetDefinition) {
            const location = account ? ` in account "${account}"` : ' as a standalone asset';
            throw new Error(`Asset "${name}" not found${location} in portfolio data`);
        }

        // Create and cache the asset
        const asset = new Asset(assetDefinition, this, account);
        this.assetCache.set(fullName, asset);
        return asset;
    }

    /**
     * Retrieves an asset by its full name (account.assetName or assetName)
     * @param fullName The full name of the asset (account.assetName or assetName for standalone assets)
     * @returns The asset object
     * @throws Error if the asset doesn't exist
     */
    public async getAssetByFullName(fullName: string): Promise<Asset> {
        // Parse the full name to extract account and asset name
        const parts = fullName.split('.');
        let assetName: string;
        let accountName: string | undefined;

        if (parts.length === 2) {
            // Asset belongs to an account: "account.assetName"
            accountName = parts[0];
            assetName = parts[1];
        } else if (parts.length === 1) {
            // Standalone asset: "assetName"
            assetName = parts[0];
            accountName = undefined;
        } else {
            throw new Error(`Invalid full name format: "${fullName}". Expected "assetName" or "account.assetName"`);
        }

        // Get and return the asset
        return await this.getAsset(assetName, accountName);
    }

    /**
     * Validates that an asset exists in the portfolio data
     * @param assetName The name of the asset to validate
     * @param accountName The account name (if the asset should belong to an account)
     * @throws Error if the asset doesn't exist in the specified location
     */
    private async validateAssetExists(assetName: string, accountName?: string): Promise<void> {
        const portfolioData = await this.getPortfolioData();
        const asset = this.findAssetInPortfolio(portfolioData, assetName, accountName);
        
        if (!asset) {
            const location = accountName ? ` in account "${accountName}"` : ' as a standalone asset';
            throw new Error(`Asset "${assetName}" not found${location} in portfolio data`);
        }
    }

    private getCachedAsset(fullName: string): Asset | undefined {
        return this.assetCache.get(fullName);
    }

    public invalidateAssetCache(): void {
        this.assetCache.clear();
    }

    // Account management
    public async createAccount(definition: AccountDefinitionData): Promise<Account> {
        const cachedAccount = this.getCachedAccount(definition.name);
        if (cachedAccount) {
            return cachedAccount;
        }

        const account = new Account(definition, this);
        this.accountCache.set(definition.name, account);
        return account;
    }

    private getCachedAccount(name: string): Account | undefined {
        return this.accountCache.get(name);
    }

    public invalidateAccountCache(): void {
        this.accountCache.clear();
    }

    public async getAllAccounts(): Promise<Account[]> {
        const portfolioData = await this.getPortfolioData();
        const accounts: Account[] = [];

        if (portfolioData.accounts) {
            for (const accountDefinition of portfolioData.accounts) {
                const account = await this.createAccount(accountDefinition);
                accounts.push(account);
            }
        }

        return accounts;
    }

    // Get all assets (both standalone and account assets)
    public async getAllAssets(): Promise<Asset[]> {
        const portfolioData = await this.getPortfolioData();
        const allAssets: Asset[] = [];

        // Add standalone assets
        for (const assetDefinition of portfolioData.assets) {
            try {
                const asset = await this.getAsset(assetDefinition.name); // No account for standalone assets
                allAssets.push(asset);
            } catch (error) {
                console.error(`Error creating standalone asset ${assetDefinition.name}:`, error);
            }
        }

        // Add account assets
        if (portfolioData.accounts) {
            for (const accountDefinition of portfolioData.accounts) {
                if (accountDefinition.assets) {
                    for (const assetDefinition of accountDefinition.assets) {
                        try {
                            const asset = await this.getAsset(assetDefinition.name, accountDefinition.name);
                            allAssets.push(asset);
                        } catch (error) {
                            console.error(`Error creating account asset ${accountDefinition.name}.${assetDefinition.name}:`, error);
                        }
                    }
                }
            }
        }

        return allAssets;
    }

    // Get standalone assets (assets that don't belong to any account)
    public async getStandaloneAssets(): Promise<Asset[]> {
        const portfolioData = await this.getPortfolioData();
        const standaloneAssets: Asset[] = [];

        // Add standalone assets only
        for (const assetDefinition of portfolioData.assets) {
            try {
                const asset = await this.getAsset(assetDefinition.name); // No account for standalone assets
                standaloneAssets.push(asset);
            } catch (error) {
                console.error(`Error creating standalone asset ${assetDefinition.name}:`, error);
            }
        }

        return standaloneAssets;
    }

    // Tags management
    public async getAllTags(): Promise<string[]> {
        // Return cached tags if available
        if (this.tagsCache !== undefined) {
            return this.tagsCache;
        }

        // Load tags from portfolio data
        this.tagsCache = await this.loadAllTagsFromData();
        return this.tagsCache;
    }

    private async loadAllTagsFromData(): Promise<string[]> {
        try {
            const allAssets = await this.getAllAssets();
            if (allAssets.length === 0) {
                return [];
            }

            // Extract all unique tags from all assets (both standalone and account assets)
            const allTags = new Set<string>();
            
            for (const asset of allAssets) {
                const assetDefinition = asset.definitionData;
                if (assetDefinition.tags && Array.isArray(assetDefinition.tags)) {
                    assetDefinition.tags.forEach((tag: string) => {
                        if (typeof tag === 'string' && tag.trim()) {
                            allTags.add(tag.trim());
                        }
                    });
                }
            }

            // Return sorted array of unique tags
            return Array.from(allTags).sort();
        } catch (error) {
            console.error('Error loading tags from portfolio data:', error);
            return [];
        }
    }

    public invalidateTagsCache(): void {
        this.tagsCache = undefined;
    }

    // Portfolio data operations
    public async getPortfolioData(): Promise<PortfolioData> {
        // Return cached data if available
        if (this.portfolioDataCache !== undefined) {
            console.log('Returning cached portfolio data');
            return this.portfolioDataCache;
        }

        console.log('Loading portfolio data via data store');
        this.portfolioDataCache = await this.dataStore.loadPortfolioData();
        if (!this.portfolioDataCache) {
            console.warn('No portfolio data found, returning empty portfolio');
            this.portfolioDataCache = { assets: [] };
        }
        return this.portfolioDataCache;
    }

    public async savePortfolioData(data: PortfolioData): Promise<void> {
        await this.dataStore.savePortfolioData(data);
        
        // Update cache with saved data
        this.portfolioDataCache = data;
        
        // Invalidate other caches after save
        this.invalidateAssetCache();
        this.invalidateAccountCache();
        this.invalidateTagsCache();
        this.invalidateAssetUpdatesCache();
        this.invalidateExchangeRateCache();
        
        // Fire update event
        this._onDataUpdatedEmitter.fire();
    }

    // Asset updates operations
    public async loadAssetUpdates(): Promise<PortfolioUpdateData[]> {
        // Return cached data if available
        if (this.assetUpdatesCache !== undefined) {
            console.log('Returning cached asset updates');
            return this.assetUpdatesCache;
        }

        console.log('Loading asset updates via data store');
        this.assetUpdatesCache = await this.dataStore.loadAssetUpdates();
        return this.assetUpdatesCache;
    }

    public async saveAssetUpdate(update: PortfolioUpdateData): Promise<string> {
        const filename = await this.dataStore.saveAssetUpdate(update);
        
        // Invalidate cache to force reload
        this.invalidateAssetUpdatesCache();
        this.invalidateExchangeRateCache();
        
        // Fire update event
        this._onDataUpdatedEmitter.fire();
        
        return filename;
    }

    public invalidateAssetUpdatesCache(): void {
        this.assetUpdatesCache = undefined;
    }

    // Category operations
    public async getCategoryDefinitions(): Promise<CategoryDefinitionData | undefined> {
        // Return cached data if available
        if (this.categoryDefinitionCache !== undefined) {
            return this.categoryDefinitionCache;
        }

        console.log('Loading category definitions via data store');
        this.categoryDefinitionCache = await this.dataStore.loadCategoryDefinitions();
        return this.categoryDefinitionCache;
    }

    public async createCategory(definition: CategoryData): Promise<Category> {
        return new Category(definition, this, undefined);
    }

    public async createCategoryType(definition: CategoryData): Promise<Category> {
        return new Category(definition, this, undefined);
    }

    public invalidateCategoryCache(): void {
        this.categoryDefinitionCache = undefined;
    }

    // Exchange rate operations
    public async getExchangeRate(currency: string): Promise<ExchangeRate | undefined> {
        // Return cached data if available
        if (this.exchangeRateCache.has(currency)) {
            return this.exchangeRateCache.get(currency);
        }

        // If cache is empty, load and cache all exchange rates
        if (this.exchangeRateCache.size === 0) {
            const allExchangeRates = await this.extractExchangeRates();
            
            // Cache all exchange rates
            for (const [currencyKey, exchangeRate] of allExchangeRates.entries()) {
                this.exchangeRateCache.set(currencyKey, exchangeRate);
            }
        }
        
        // Return the requested currency's exchange rate from cache
        return this.exchangeRateCache.get(currency);
    }

    private async extractExchangeRates(): Promise<Map<string, ExchangeRate>> {
        const updates = await this.loadAssetUpdates();
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

        // Create ExchangeRate objects for each currency
        const exchangeRateMap = new Map<string, ExchangeRate>();
        for (const [currency, rates] of exchangeRatesByDate.entries()) {
            exchangeRateMap.set(currency, new ExchangeRate(currency, rates));
        }

        return exchangeRateMap;
    }

    public invalidateExchangeRateCache(): void {
        this.exchangeRateCache.clear();
    }

    // Cache management
    public invalidateAllCaches(): void {
        this.invalidateAssetCache();
        this.invalidateAccountCache();
        this.invalidateTagsCache();
        this.invalidatePortfolioCache();
        this.invalidateAssetUpdatesCache();
        this.invalidateCategoryCache();
        this.invalidateExchangeRateCache();
    }

    public invalidatePortfolioCache(): void {
        this.portfolioDataCache = undefined;
    }

    public dispose(): void {
        this._onDataUpdatedEmitter.dispose();
        this.invalidateAllCaches();
    }

    public async getAssetsByTag(tag: string): Promise<Asset[]> {
        const allAssets = await this.getAllAssets();
        if (allAssets.length === 0) {
            return [];
        }

        const matchingAssets: Asset[] = [];
        
        for (const asset of allAssets) {
            // Check if asset has the specified tag
            const assetDefinition = asset.definitionData;
            const assetTags = assetDefinition.tags || [];
            const hasTag = assetTags.includes(tag);
            
            if (hasTag) {
                try {                    
                    matchingAssets.push(asset);
                } catch (error) {
                    console.error(`Error creating asset summary for ${asset.fullName}:`, error);
                }
            }
        }

        return matchingAssets;
    }

    // Asset rename operations
    
    /**
     * Helper method to find an asset in the portfolio
     * @param portfolioData The portfolio data to search
     * @param assetName The name of the asset to find
     * @param accountName The account name (if the asset belongs to an account)
     * @returns The asset definition if found, undefined otherwise
     */
    private findAssetInPortfolio(portfolioData: PortfolioData, assetName: string, accountName?: string): AssetDefinitionData | undefined {
        if (accountName) {
            // Search in account assets when account is specified
            return this.findAssetInAccount(portfolioData, assetName, accountName);
        } else {
            // Search in standalone assets when no account is specified
            return this.findStandaloneAsset(portfolioData, assetName);
        }
    }

    /**
     * Find an asset within a specific account
     * @param portfolioData The portfolio data to search
     * @param assetName The name of the asset to find
     * @param accountName The name of the account to search in
     * @returns The asset definition if found, undefined otherwise
     */
    private findAssetInAccount(portfolioData: PortfolioData, assetName: string, accountName: string): AssetDefinitionData | undefined {
        if (!portfolioData.accounts) {
            return undefined;
        }

        const account = portfolioData.accounts.find(acc => acc.name === accountName);
        if (!account || !account.assets) {
            return undefined;
        }

        return account.assets.find(asset => asset.name === assetName);
    }

    /**
     * Find a standalone asset (not belonging to any account)
     * @param portfolioData The portfolio data to search
     * @param assetName The name of the asset to find
     * @returns The asset definition if found, undefined otherwise
     */
    private findStandaloneAsset(portfolioData: PortfolioData, assetName: string): AssetDefinitionData | undefined {
        return portfolioData.assets.find(asset => asset.name === assetName);
    }

    /**
     * Helper method to validate that the asset name doesn't exist in the specified location
     * @param portfolioData The portfolio data to search
     * @param assetName The asset name to validate
     * @param accountName The account name (if the asset should belong to an account)
     * @returns true if the name is available, false if it already exists
     */
    private isAssetNameAvailable(portfolioData: PortfolioData, assetName: string, accountName?: string): boolean {
        return this.findAssetInPortfolio(portfolioData, assetName, accountName) === undefined;
    }

    public async renameAsset(oldName: string, newName: string, accountName?: string): Promise<void> {
        try {
            // Compute fullNames for proper identification and file operations
            const oldFullName = accountName ? `${accountName}.${oldName}` : oldName;
            const newFullName = accountName ? `${accountName}.${newName}` : newName;
            
            console.log(`Starting asset rename process: "${oldFullName}" -> "${newFullName}"`);
            
            // Step 1: Validate the new name doesn't exist in the target location
            const portfolioData = await this.getPortfolioData();
            if (!this.isAssetNameAvailable(portfolioData, newName, accountName)) {
                throw new Error(`An asset with the name "${newName}" already exists${accountName ? ` in account "${accountName}"` : ' as a standalone asset'}`);
            }
            
            // Step 2: Find the asset to rename using name and account
            const asset = this.findAssetInPortfolio(portfolioData, oldName, accountName);
            if (!asset) {
                throw new Error(`Asset "${oldName}" not found${accountName ? ` in account "${accountName}"` : ' as a standalone asset'}`);
            }
            
            // Step 3: Rename asset in all portfolio update files using fullNames
            // Portfolio update files use fullName for asset identification
            await this.dataStore.renameAssetInAllFiles(oldFullName, newFullName);
            
            // Step 4: Update the asset name in portfolio data
            // Only update the asset name part, not the full name
            asset.name = newName;
            
            // Step 5: Save the updated portfolio data
            await this.savePortfolioData(portfolioData);            
            console.log(`Asset rename completed successfully: "${oldFullName}" -> "${newFullName}"`);
            
        } catch (error) {
            console.error('Error in renameAsset:', error);
            throw error;
        }
    }
}
