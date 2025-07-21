import { Asset } from './asset';
import { AssetCollection } from './assetCollection';
import { CategoryData, AssetCurrentValueData } from './interfaces';
import { PortfolioDataAccess } from './portfolioDataAccess';

export class Category {
    constructor(
        private definition: CategoryData,
        private dataAccess: PortfolioDataAccess,
        private parentCategory?: Category
    ) {}

    get name(): string {
        return this.definition.name;
    }

    get tags(): string[] {
        return [...this.definition.tags];
    }

    get targetValue(): number | undefined {
        return this.definition.targetValue;
    }

    get definitionData(): CategoryData {
        return { ...this.definition };
    }

    /**
     * Get sub-categories defined under this category
     */
    async getSubCategories(): Promise<Category[]> {
        if (!this.definition.categories) {
            return [];
        }
        
        return this.definition.categories.map(categoryDef => 
            new Category(categoryDef, this.dataAccess, this)
        );
    }

    /**
     * Get all assets that belong to this category based on tags
     */
    async getAssets(): Promise<Asset[]> {
        // If this is a sub-category, first get assets from parent category
        let candidateAssets: Asset[];
        if (this.parentCategory) {
            candidateAssets = await this.parentCategory.getAssets();
        } else {
            // For top-level categories, get all assets
            candidateAssets = await this.dataAccess.getAllAssets();
        }

        const matchingAssets: Set<Asset> = new Set();
        
        // Filter candidate assets by this category's tags
        for (const asset of candidateAssets) {
            const assetTags = asset.allTags;
            
            // If this category has no tags, include all assets (like the old CategoryType behavior)
            if (!this.definition.tags || this.definition.tags.length === 0) {
                matchingAssets.add(asset);
            } else {
                // Filter by tags if tags are defined
                const hasMatchingTag = this.definition.tags.some((tag: string) => assetTags.includes(tag));
                if (hasMatchingTag) {
                    matchingAssets.add(asset);
                }
            }
        }

        return Array.from(matchingAssets);
    }

    /**
     * Get standalone assets within this category (assets that don't match any sub-category tags)
     */
    async getStandaloneAssets(): Promise<Asset[]> {
        const allCategoryAssets = await this.getAssets();
        
        // If no sub-categories, all assets are standalone
        if (!this.definition.categories || this.definition.categories.length === 0) {
            return allCategoryAssets;
        }

        // Get all sub-category tags
        const subCategoryTags = new Set<string>();
        for (const subCategory of this.definition.categories) {
            for (const tag of subCategory.tags) {
                subCategoryTags.add(tag);
            }
        }

        // Filter assets that don't have any sub-category tags
        const standaloneAssets: Asset[] = [];
        for (const asset of allCategoryAssets) {
            const assetTags = asset.allTags;
            const hasSubCategoryTag = assetTags.some((tag: string) => subCategoryTags.has(tag));
            
            if (!hasSubCategoryTag) {
                standaloneAssets.push(asset);
            }
        }

        return standaloneAssets;
    }

    /**
     * Calculate the total current value of all assets in this category
     */
    async calculateCurrentValue(): Promise<AssetCurrentValueData> {
        // Get standalone assets value
        const standaloneAssets = await this.getStandaloneAssets();
        const standaloneValue = await AssetCollection.calculateCurrentValue(standaloneAssets);
        
        // Get sub-categories value
        const subCategories = await this.getSubCategories();
        let subCategoriesValueInCNY = 0;
        let latestUpdateDate = standaloneValue.lastUpdateDate;

        for (const subCategory of subCategories) {
            const subCategoryValue = await subCategory.calculateCurrentValue();
            subCategoriesValueInCNY += subCategoryValue.valueInCNY;
            
            // Track the latest update date
            if (subCategoryValue.lastUpdateDate) {
                if (!latestUpdateDate || subCategoryValue.lastUpdateDate > latestUpdateDate) {
                    latestUpdateDate = subCategoryValue.lastUpdateDate;
                }
            }
        }

        const totalValueInCNY = standaloneValue.valueInCNY + subCategoriesValueInCNY;

        return {
            currentValue: totalValueInCNY,
            currency: 'CNY',
            valueInCNY: totalValueInCNY,
            lastUpdateDate: latestUpdateDate
        };
    }
}
