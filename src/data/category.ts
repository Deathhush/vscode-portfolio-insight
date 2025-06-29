import { CategoryData, CategoryTypeData, AssetSummaryData, AssetCurrentValueData, CategorySummaryData, CategoryTypeSummaryData } from './interfaces';
import { PortfolioDataAccess } from './portfolioDataAccess';

export class Category {
    constructor(
        private definition: CategoryData,
        private dataAccess: PortfolioDataAccess
    ) {}

    get name(): string {
        return this.definition.name;
    }

    get tags(): string[] {
        return [...this.definition.tags];
    }

    get definitionData(): CategoryData {
        return { ...this.definition };
    }

    /**
     * Get all assets that belong to this category based on tags
     */
    async getAssets(): Promise<AssetSummaryData[]> {
        const assetNames = new Set<string>();
        const matchingAssets: AssetSummaryData[] = [];
        
        // Get assets for each tag in this category
        for (const tag of this.definition.tags) {
            const assetsWithTag = await this.dataAccess.getAssetsByTag(tag);
            
            // Add assets that aren't already in the set (avoid duplicates)
            for (const asset of assetsWithTag) {
                if (!assetNames.has(asset.definition.name)) {
                    assetNames.add(asset.definition.name);
                    matchingAssets.push(asset);
                }
            }
        }

        return matchingAssets;
    }

    /**
     * Calculate the total current value of all assets in this category
     */
    async calculateCurrentValue(): Promise<AssetCurrentValueData> {
        const assets = await this.getAssets();
        
        let totalValue = 0;
        let totalValueInCNY = 0;
        let latestUpdateDate: string | undefined;

        for (const asset of assets) {
            totalValue += asset.currentValue.currentValue;
            totalValueInCNY += asset.currentValue.valueInCNY;
            
            // Track the latest update date
            if (asset.currentValue.lastUpdateDate) {
                if (!latestUpdateDate || asset.currentValue.lastUpdateDate > latestUpdateDate) {
                    latestUpdateDate = asset.currentValue.lastUpdateDate;
                }
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
     * Generate a summary of this category including all assets
     */
    async generateSummary(): Promise<CategorySummaryData> {
        const assets = await this.getAssets();
        const totalValue = await this.calculateCurrentValue();

        return {
            definition: this.definitionData,
            assets,
            totalValue
        };
    }
}

export class CategoryType {
    constructor(
        private definition: CategoryTypeData,
        private dataAccess: PortfolioDataAccess
    ) {}

    get name(): string {
        return this.definition.name;
    }

    get definitionData(): CategoryTypeData {
        return { ...this.definition };
    }

    /**
     * Get all categories under this category type
     */
    async getCategories(): Promise<Category[]> {
        return this.definition.categories.map(categoryDef => 
            new Category(categoryDef, this.dataAccess)
        );
    }

    /**
     * Calculate the total current value of all categories in this category type
     */
    async calculateCurrentValue(): Promise<AssetCurrentValueData> {
        const categories = await this.getCategories();
        
        let totalValueInCNY = 0;
        let latestUpdateDate: string | undefined;

        for (const category of categories) {
            const categoryValue = await category.calculateCurrentValue();
            totalValueInCNY += categoryValue.valueInCNY;
            
            // Track the latest update date
            if (categoryValue.lastUpdateDate) {
                if (!latestUpdateDate || categoryValue.lastUpdateDate > latestUpdateDate) {
                    latestUpdateDate = categoryValue.lastUpdateDate;
                }
            }
        }

        return {
            currentValue: totalValueInCNY,
            currency: 'CNY',
            valueInCNY: totalValueInCNY,
            lastUpdateDate: latestUpdateDate
        };
    }
}
