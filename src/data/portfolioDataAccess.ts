import * as vscode from 'vscode';
import { PortfolioDataStore } from './portfolioDataStore';
import { Asset } from './asset';
import { Account } from './account';
import { Category, CategoryType } from './category';
import { AssetDefinitionData, AccountDefinitionData, PortfolioData, PortfolioUpdateData, CategoryDefinitionData, CategoryData, CategoryTypeData, AssetSummaryData, AccountSummaryData } from './interfaces';

/**
 * PortfolioDataAccess serves as a bridge between the on-disk store (PortfolioDataStore) 
 * and the in-memory structures (like Asset). It provides caching and higher-level 
 * data access operations.
 */
export class PortfolioDataAccess {
    private assetCache: Map<string, Asset> = new Map();
    private accountCache: Map<string, Account> = new Map();
    private tagsCache: string[] | undefined;
    private portfolioDataCache: PortfolioData | undefined;
    private assetUpdatesCache: PortfolioUpdateData[] | undefined;
    private categoryDefinitionCache: CategoryDefinitionData | undefined;
    private _onDataUpdatedEmitter = new vscode.EventEmitter<void>();
    
    // Event that fires when portfolio data is updated
    public readonly onDataUpdated: vscode.Event<void> = this._onDataUpdatedEmitter.event;

    constructor(private dataStore: PortfolioDataStore) {
    }

    // Asset management
    public async createAsset(definition: AssetDefinitionData): Promise<Asset> {
        const cachedAsset = this.getCachedAsset(definition.name);
        if (cachedAsset) {
            return cachedAsset;
        }

        const asset = new Asset(definition, this);
        this.assetCache.set(definition.name, asset);
        return asset;
    }

    private getCachedAsset(name: string): Asset | undefined {
        return this.assetCache.get(name);
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
            const portfolioData = await this.getPortfolioData();
            if (portfolioData.assets.length === 0) {
                return [];
            }

            // Extract all unique tags from all assets
            const allTags = new Set<string>();
            
            for (const asset of portfolioData.assets) {
                if (asset.tags && Array.isArray(asset.tags)) {
                    asset.tags.forEach((tag: string) => {
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
        return new Category(definition, this);
    }

    public async createCategoryType(definition: CategoryTypeData): Promise<CategoryType> {
        return new CategoryType(definition, this);
    }

    public invalidateCategoryCache(): void {
        this.categoryDefinitionCache = undefined;
    }

    // Cache management
    public invalidateAllCaches(): void {
        this.invalidateAssetCache();
        this.invalidateAccountCache();
        this.invalidateTagsCache();
        this.invalidatePortfolioCache();
        this.invalidateAssetUpdatesCache();
        this.invalidateCategoryCache();
    }

    public invalidatePortfolioCache(): void {
        this.portfolioDataCache = undefined;
    }

    public dispose(): void {
        this._onDataUpdatedEmitter.dispose();
        this.invalidateAllCaches();
    }

    public async getAssetsByTag(tag: string): Promise<AssetSummaryData[]> {
        const portfolioData = await this.getPortfolioData();
        if (portfolioData.assets.length === 0) {
            return [];
        }

        const matchingAssets: AssetSummaryData[] = [];
        
        for (const assetDefinition of portfolioData.assets) {
            // Check if asset has the specified tag
            const assetTags = assetDefinition.tags || [];
            const hasTag = assetTags.includes(tag);
            
            if (hasTag) {
                try {
                    const asset = await this.createAsset(assetDefinition);
                    const assetSummary = await asset.generateSummary();
                    matchingAssets.push(assetSummary);
                } catch (error) {
                    console.error(`Error creating asset summary for ${assetDefinition.name}:`, error);
                }
            }
        }

        return matchingAssets;
    }
}
