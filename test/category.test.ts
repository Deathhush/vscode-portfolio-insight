import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { PortfolioDataStore } from '../src/data/portfolioDataStore';
import { PortfolioDataAccess } from '../src/data/portfolioDataAccess';
import { Category } from '../src/data/category';

suite('Category Feature Tests', () => {
    let dataStore: PortfolioDataStore;
    let dataAccess: PortfolioDataAccess;

    setup(() => {
        // Setup test workspace - when compiled, __dirname will be out/test, so we need to go back to project root
        const projectRoot = path.resolve(__dirname, '..', '..');
        const testWorkspaceUri = vscode.Uri.file(path.join(projectRoot, 'test', 'testAssets', 'testSimpleLayout'));
        const workspaceFolder: vscode.WorkspaceFolder = {
            uri: testWorkspaceUri,
            name: 'testSimpleLayout',
            index: 0
        };
        
        dataStore = new PortfolioDataStore(workspaceFolder);
        dataAccess = new PortfolioDataAccess(dataStore);
    });

    test('should load category definitions from category.json', async () => {
        const categoryDefinitions = await dataAccess.getCategoryDefinitions();
        
        assert.ok(categoryDefinitions, 'Category definitions should be loaded');
        assert.ok(categoryDefinitions!.categoryTypes, 'Category types should exist');
        assert.strictEqual(categoryDefinitions!.categoryTypes.length, 1, 'Should have one category type');
        assert.strictEqual(categoryDefinitions!.categoryTypes[0].name, '资产配置', 'Category type name should match');
        assert.ok(categoryDefinitions!.categoryTypes[0].categories, 'Category type should have categories');
        assert.strictEqual(categoryDefinitions!.categoryTypes[0].categories!.length, 3, 'Should have three categories');
    });

    test('should create CategoryType instances (now as Category)', async () => {
        const categoryDefinitions = await dataAccess.getCategoryDefinitions();
        assert.ok(categoryDefinitions, 'Category definitions should be loaded');
        
        const categoryType = await dataAccess.createCategoryType(categoryDefinitions!.categoryTypes[0]);
        
        assert.ok(categoryType instanceof Category, 'Should create Category instance');
        assert.strictEqual(categoryType.name, '资产配置', 'CategoryType name should match');
    });

    test('should create Category instances', async () => {
        const categoryDefinitions = await dataAccess.getCategoryDefinitions();
        assert.ok(categoryDefinitions, 'Category definitions should be loaded');
        
        const categories = categoryDefinitions!.categoryTypes[0].categories;
        assert.ok(categories && categories.length > 0, 'Categories should exist');
        const categoryData = categories[0];
        const category = await dataAccess.createCategory(categoryData);
        
        assert.ok(category instanceof Category, 'Should create Category instance');
        assert.strictEqual(category.name, '活钱', 'Category name should match');
        assert.deepStrictEqual(category.tags, ['活期', '定期', '货币基金'], 'Category tags should match');
    });

    test('should find assets by category tags', async () => {
        const categoryDefinitions = await dataAccess.getCategoryDefinitions();
        assert.ok(categoryDefinitions, 'Category definitions should be loaded');
        
        const categories = categoryDefinitions!.categoryTypes[0].categories;
        assert.ok(categories && categories.length > 0, 'Categories should exist');
        const categoryData = categories[0]; // "活钱" category
        const category = await dataAccess.createCategory(categoryData);
        
        const assets = await category.getAssets();
        
        // Should find the "招行.活期" asset which has the "活期" tag
        assert.ok(assets.length > 0, 'Should find assets with matching tags');
        const foundAsset = assets.find(asset => asset.name === '招行.活期');
        assert.ok(foundAsset, 'Should find the "招行.活期" asset');
    });

    test('should calculate category total value', async () => {
        const categoryDefinitions = await dataAccess.getCategoryDefinitions();
        assert.ok(categoryDefinitions, 'Category definitions should be loaded');
        
        const categories = categoryDefinitions!.categoryTypes[0].categories;
        assert.ok(categories && categories.length > 0, 'Categories should exist');
        const categoryData = categories[0]; // "活钱" category
        const category = await dataAccess.createCategory(categoryData);
        
        const currentValue = await category.calculateCurrentValue();
        
        assert.ok(currentValue, 'Should calculate current value');
        assert.strictEqual(currentValue.currency, 'CNY', 'Should use CNY as base currency');
        assert.ok(typeof currentValue.valueInCNY === 'number', 'Should have numeric value in CNY');
    });

    test('should calculate category type total value', async () => {
        const categoryDefinitions = await dataAccess.getCategoryDefinitions();
        assert.ok(categoryDefinitions, 'Category definitions should be loaded');
        
        const categoryType = await dataAccess.createCategoryType(categoryDefinitions!.categoryTypes[0]);
        
        const currentValue = await categoryType.calculateCurrentValue();
        
        assert.ok(currentValue, 'Should calculate current value');
        assert.strictEqual(currentValue.currency, 'CNY', 'Should use CNY as base currency');
        assert.ok(typeof currentValue.valueInCNY === 'number', 'Should have numeric value in CNY');
    });

    test('should find sub-categories for categories with sub-categories defined', async () => {
        const categoryDefinitions = await dataAccess.getCategoryDefinitions();
        assert.ok(categoryDefinitions, 'Category definitions should be loaded');
        
        // Find the "长期" category which has sub-categories
        const categories = categoryDefinitions!.categoryTypes[0].categories;
        assert.ok(categories, 'Categories should exist');
        const longTermCategoryData = categories.find(c => c.name === '长期');
        assert.ok(longTermCategoryData, 'Should find "长期" category');
        
        const category = await dataAccess.createCategory(longTermCategoryData!);
        const subCategories = await category.getSubCategories();
        
        assert.strictEqual(subCategories.length, 2, 'Should have 2 sub-categories');
        assert.ok(subCategories.find(sc => sc.name === '个股'), 'Should have "个股" sub-category');
        assert.ok(subCategories.find(sc => sc.name === '指数基金'), 'Should have "指数基金" sub-category');
    });

    test('should return standalone assets for category with sub-categories', async () => {
        const categoryDefinitions = await dataAccess.getCategoryDefinitions();
        assert.ok(categoryDefinitions, 'Category definitions should be loaded');
        
        // Find the "长期" category which has sub-categories
        const categories = categoryDefinitions!.categoryTypes[0].categories;
        assert.ok(categories, 'Categories should exist');
        const longTermCategoryData = categories.find(c => c.name === '长期');
        assert.ok(longTermCategoryData, 'Should find "长期" category');
        
        const category = await dataAccess.createCategory(longTermCategoryData!);
        const allAssets = await category.getAssets();
        const standaloneAssets = await category.getStandaloneAssets();
        
        // Should have more total assets than standalone assets
        assert.ok(allAssets.length >= standaloneAssets.length, 'Should have at least as many total assets as standalone');
        
        // Standalone assets should not have any sub-category tags
        for (const asset of standaloneAssets) {
            const hasStockTag = asset.allTags.includes('股票');
            const hasIndexFundTag = asset.allTags.includes('指数基金');
            assert.ok(!hasStockTag && !hasIndexFundTag, `Asset ${asset.name} should not have sub-category tags`);
        }
    });

    test('should correctly calculate value including sub-categories and standalone assets', async () => {
        const categoryDefinitions = await dataAccess.getCategoryDefinitions();
        assert.ok(categoryDefinitions, 'Category definitions should be loaded');
        
        // Find the "长期" category which has sub-categories
        const categories = categoryDefinitions!.categoryTypes[0].categories;
        assert.ok(categories, 'Categories should exist');
        const longTermCategoryData = categories.find(c => c.name === '长期');
        assert.ok(longTermCategoryData, 'Should find "长期" category');
        
        const category = await dataAccess.createCategory(longTermCategoryData!);
        const totalValue = await category.calculateCurrentValue();
        
        // Calculate expected value by summing standalone assets and sub-categories
        const standaloneAssets = await category.getStandaloneAssets();
        const subCategories = await category.getSubCategories();
        
        // This should not throw an error and should return a valid value
        assert.ok(totalValue, 'Should calculate total value');
        assert.strictEqual(totalValue.currency, 'CNY', 'Should use CNY as base currency');
        assert.ok(typeof totalValue.valueInCNY === 'number', 'Should have numeric value in CNY');
    });

    test('should return empty array for categories without sub-categories', async () => {
        const categoryDefinitions = await dataAccess.getCategoryDefinitions();
        assert.ok(categoryDefinitions, 'Category definitions should be loaded');
        
        // Find the "活钱" category which has no sub-categories
        const categories = categoryDefinitions!.categoryTypes[0].categories;
        assert.ok(categories, 'Categories should exist');
        const categoryData = categories.find(c => c.name === '活钱');
        assert.ok(categoryData, 'Should find "活钱" category');
        
        const category = await dataAccess.createCategory(categoryData!);
        const subCategories = await category.getSubCategories();
        
        assert.strictEqual(subCategories.length, 0, 'Should have no sub-categories');
    });

    test('should ensure sub-categories only contain assets from parent category', async () => {
        const categoryDefinitions = await dataAccess.getCategoryDefinitions();
        assert.ok(categoryDefinitions, 'Category definitions should be loaded');
        
        // Find the "长期" category which has sub-categories
        const categories = categoryDefinitions!.categoryTypes[0].categories;
        assert.ok(categories, 'Categories should exist');
        const longTermCategoryData = categories.find(c => c.name === '长期');
        assert.ok(longTermCategoryData, 'Should find "长期" category');
        
        const longTermCategory = await dataAccess.createCategory(longTermCategoryData!);
        const longTermAssets = await longTermCategory.getAssets();
        
        // Get sub-categories
        const subCategories = await longTermCategory.getSubCategories();
        const stockSubCategory = subCategories.find(sc => sc.name === '个股');
        const indexFundSubCategory = subCategories.find(sc => sc.name === '指数基金');
        
        assert.ok(stockSubCategory, 'Should find "个股" sub-category');
        assert.ok(indexFundSubCategory, 'Should find "指数基金" sub-category');
        
        // Get assets from sub-categories
        const stockAssets = await stockSubCategory!.getAssets();
        const indexFundAssets = await indexFundSubCategory!.getAssets();
        
        // All assets from sub-categories should also be in the parent category
        const longTermAssetNames = new Set(longTermAssets.map(a => a.fullName));
        
        for (const stockAsset of stockAssets) {
            assert.ok(longTermAssetNames.has(stockAsset.fullName), 
                `Stock asset "${stockAsset.fullName}" should be in parent "长期" category`);
        }
        
        for (const indexFundAsset of indexFundAssets) {
            assert.ok(longTermAssetNames.has(indexFundAsset.fullName), 
                `Index fund asset "${indexFundAsset.fullName}" should be in parent "长期" category`);
        }
    });

    test('should verify sub-category filtering works correctly with multiple tags', async () => {
        const categoryDefinitions = await dataAccess.getCategoryDefinitions();
        assert.ok(categoryDefinitions, 'Category definitions should be loaded');
        
        // Get all assets to verify our test data
        const allAssets = await dataAccess.getAllAssets();
        const assetWithMixedTags = allAssets.find(a => a.name === "长期混合基金");
        
        if (assetWithMixedTags) {
            // Verify this asset has the "混合基金" tag
            assert.ok(assetWithMixedTags.allTags.includes("混合基金"), 'Test asset should have "混合基金" tag');
            
            // Find the "长期" category which should include this asset
            const categories = categoryDefinitions!.categoryTypes[0].categories;
            assert.ok(categories, 'Categories should exist');
            const longTermCategoryData = categories.find(c => c.name === '长期');
            assert.ok(longTermCategoryData, 'Should find "长期" category');
            
            const longTermCategory = await dataAccess.createCategory(longTermCategoryData!);
            const longTermAssets = await longTermCategory.getAssets();
            
            // This asset should be in the parent category since it has the "混合基金" tag
            const isInParentCategory = longTermAssets.some(a => a.fullName === assetWithMixedTags.fullName);
            assert.ok(isInParentCategory, 'Asset with "混合基金" tag should be in "长期" category');
            
            // Now check sub-categories - this asset should NOT be in stock or index fund sub-categories
            const subCategories = await longTermCategory.getSubCategories();
            const stockSubCategory = subCategories.find(sc => sc.name === '个股');
            const indexFundSubCategory = subCategories.find(sc => sc.name === '指数基金');
            
            if (stockSubCategory) {
                const stockAssets = await stockSubCategory.getAssets();
                const isInStockSubCategory = stockAssets.some(a => a.fullName === assetWithMixedTags.fullName);
                assert.ok(!isInStockSubCategory, 'Asset with "混合基金" tag should NOT be in "个股" sub-category');
            }
            
            if (indexFundSubCategory) {
                const indexFundAssets = await indexFundSubCategory.getAssets();
                const isInIndexFundSubCategory = indexFundAssets.some(a => a.fullName === assetWithMixedTags.fullName);
                assert.ok(!isInIndexFundSubCategory, 'Asset with "混合基金" tag should NOT be in "指数基金" sub-category');
            }
        }
    });
});
