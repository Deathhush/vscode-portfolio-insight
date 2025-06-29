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
        const portfolioData = await this.dataAccess.getPortfolioData();
        if (!portfolioData.assets || portfolioData.assets.length === 0) {
            return [];
        }

        const matchingAssets: AssetSummaryData[] = [];
        
        for (const assetDefinition of portfolioData.assets) {
            // Check if asset has any tags that match this category
            const assetTags = assetDefinition.tags || [];
            const hasMatchingTag = assetTags.some(tag => this.definition.tags.includes(tag));
            
            if (hasMatchingTag) {
                try {
                    const asset = await this.dataAccess.createAsset(assetDefinition);
                    const assetSummary = await asset.generateSummary();
                    matchingAssets.push(assetSummary);
                } catch (error) {
                    console.error(`Error creating asset summary for ${assetDefinition.name}:`, error);
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
