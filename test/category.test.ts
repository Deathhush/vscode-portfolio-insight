import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { PortfolioDataStore } from '../src/data/portfolioDataStore';
import { PortfolioDataAccess } from '../src/data/portfolioDataAccess';
import { Category, CategoryType } from '../src/data/category';

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
        assert.strictEqual(categoryDefinitions!.categoryTypes[0].categories.length, 3, 'Should have three categories');
    });

    test('should create CategoryType instances', async () => {
        const categoryDefinitions = await dataAccess.getCategoryDefinitions();
        assert.ok(categoryDefinitions, 'Category definitions should be loaded');
        
        const categoryType = await dataAccess.createCategoryType(categoryDefinitions!.categoryTypes[0]);
        
        assert.ok(categoryType instanceof CategoryType, 'Should create CategoryType instance');
        assert.strictEqual(categoryType.name, '资产配置', 'CategoryType name should match');
    });

    test('should create Category instances', async () => {
        const categoryDefinitions = await dataAccess.getCategoryDefinitions();
        assert.ok(categoryDefinitions, 'Category definitions should be loaded');
        
        const categoryData = categoryDefinitions!.categoryTypes[0].categories[0];
        const category = await dataAccess.createCategory(categoryData);
        
        assert.ok(category instanceof Category, 'Should create Category instance');
        assert.strictEqual(category.name, '活钱', 'Category name should match');
        assert.deepStrictEqual(category.tags, ['活期', '定期', '货币基金'], 'Category tags should match');
    });

    test('should find assets by category tags', async () => {
        const categoryDefinitions = await dataAccess.getCategoryDefinitions();
        assert.ok(categoryDefinitions, 'Category definitions should be loaded');
        
        const categoryData = categoryDefinitions!.categoryTypes[0].categories[0]; // "活钱" category
        const category = await dataAccess.createCategory(categoryData);
        
        const assets = await category.getAssets();
        
        // Should find the "招行.活期" asset which has the "活期" tag
        assert.ok(assets.length > 0, 'Should find assets with matching tags');
        const foundAsset = assets.find(asset => asset.definition.name === '招行.活期');
        assert.ok(foundAsset, 'Should find the "招行.活期" asset');
    });

    test('should calculate category total value', async () => {
        const categoryDefinitions = await dataAccess.getCategoryDefinitions();
        assert.ok(categoryDefinitions, 'Category definitions should be loaded');
        
        const categoryData = categoryDefinitions!.categoryTypes[0].categories[0]; // "活钱" category
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
});
