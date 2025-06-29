import * as vscode from 'vscode';
import { PortfolioDataStore } from './portfolioDataStore';
import { Asset } from './asset';
import { AssetDefinitionData, PortfolioData } from './interfaces';

/**
 * PortfolioDataAccess serves as a bridge between the on-disk store (PortfolioDataStore) 
 * and the in-memory structures (like Asset). It provides caching and higher-level 
 * data access operations.
 */
export class PortfolioDataAccess {
    private assetCache: Map<string, Asset> = new Map();
    private tagsCache: string[] | undefined;
    private _onDataUpdatedEmitter = new vscode.EventEmitter<void>();
    
    // Event that fires when portfolio data is updated
    public readonly onDataUpdated: vscode.Event<void> = this._onDataUpdatedEmitter.event;

    constructor(private dataStore: PortfolioDataStore) {
        // Listen to portfolio data changes to invalidate caches
        // Note: PortfolioDataStore doesn't have events yet, so we'll invalidate manually for now
    }

    // Asset management
    public async createAsset(definition: AssetDefinitionData): Promise<Asset> {
        const cachedAsset = this.getCachedAsset(definition.name);
        if (cachedAsset) {
            return cachedAsset;
        }

        const asset = new Asset(definition, this.dataStore);
        this.assetCache.set(definition.name, asset);
        return asset;
    }

    private getCachedAsset(name: string): Asset | undefined {
        return this.assetCache.get(name);
    }

    public invalidateAssetCache(): void {
        this.assetCache.clear();
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
            const portfolioData = await this.dataStore.loadPortfolioData();
            if (!portfolioData?.assets) {
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
    public async getPortfolioData(): Promise<PortfolioData | undefined> {
        return await this.dataStore.loadPortfolioData();
    }

    public async savePortfolioData(data: PortfolioData): Promise<void> {
        await this.dataStore.savePortfolioData(data);
        
        // Invalidate caches after save
        this.invalidateAllCaches();
        
        // Fire update event
        this._onDataUpdatedEmitter.fire();
    }

    // Cache management
    public invalidateAllCaches(): void {
        this.invalidateAssetCache();
        this.invalidateTagsCache();
        this.dataStore.invalidatePortfolioCache();
    }

    public dispose(): void {
        this._onDataUpdatedEmitter.dispose();
        this.invalidateAllCaches();
    }
}
