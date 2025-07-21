import { Asset } from './asset';
import { AssetCollection } from './assetCollection';
import { CategoryData, AssetCurrentValueData } from './interfaces';
import { PortfolioDataAccess } from './portfolioDataAccess';

export class Category {
    constructor(
        private definition: CategoryData,
        private dataAccess: PortfolioDataAccess,
        private parentCategory?: Category
    ) { }

    get name(): string {
        return this.definition.name;
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

        if (this.definition.tags && this.definition.tags.length > 0) { // filter by tags
            for (const asset of candidateAssets) {
                const assetTags = asset.allTags;
                const hasMatchingTag = this.definition.tags.some((tag: string) => assetTags.includes(tag));
                if (hasMatchingTag) {
                    matchingAssets.add(asset);
                }
            }
        } else if (this.definition.excludeTags && this.definition.excludeTags.length > 0) { // filter by excludeTags
            for (const asset of candidateAssets) {
                const assetTags = asset.allTags;
                const hasExcludedTag = this.definition.excludeTags.some((tag: string) => assetTags.includes(tag));
                if (!hasExcludedTag) {
                    matchingAssets.add(asset);
                }
            }

        } else { // no tags or excludeTags, return all candidate assets
            return candidateAssets;
        }
        return Array.from(matchingAssets);
    }

    /**
     * Get standalone assets within this category (assets that don't match any sub-category tags)
     */
    async getStandaloneAssets(): Promise<Asset[]> {
        const allAssets = await this.getAssets();

        // If no sub-categories, all assets are standalone
        if (!this.definition.categories || this.definition.categories.length === 0) {
            return allAssets;
        }

        // if any sub category is without tags and exludeTags, return 0 assets
        if (this.definition.categories.some(cat => !cat.tags && !cat.excludeTags)) {
            return [];
        }

        const subCategoryIncludeTags: string[] =
            this.definition.categories
                .filter(cat => cat.tags && cat.tags.length > 0)
                .flatMap(cat => cat.tags || []);

        const subCategoryExcludeTags: string[] =
            this.definition.categories
                .filter(cat => cat.excludeTags && cat.excludeTags.length > 0)
                .flatMap(cat => cat.excludeTags || []);

        let standaloneAssets = allAssets;

        // Filter out assets that match any sub-category include tags
        if (subCategoryIncludeTags.length > 0) {
            standaloneAssets = allAssets.filter(asset => {
                const assetTags = asset.allTags;
                const matchesIncludeTag = assetTags.some(tag => subCategoryIncludeTags.includes(tag));
                return !matchesIncludeTag;
            });
        }

        // Filter out any asset that doesn't match any sub-category exclude tags
        if (subCategoryExcludeTags.length > 0) {
            standaloneAssets = standaloneAssets.filter(asset => {
                const assetTags = asset.allTags;
                const matchesExcludeTag = assetTags.some(tag => subCategoryExcludeTags.includes(tag));
                return matchesExcludeTag;
            });
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
