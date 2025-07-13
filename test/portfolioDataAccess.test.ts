import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { PortfolioDataAccess } from '../src/data/portfolioDataAccess';
import { PortfolioDataStore } from '../src/data/portfolioDataStore';
import { AssetDefinitionData, PortfolioData } from '../src/data/interfaces';

suite('PortfolioDataAccess Tests', () => {
    let portfolioDataAccess: PortfolioDataAccess;
    let dataStore: PortfolioDataStore;
    let workspaceFolder: vscode.WorkspaceFolder;

    // Mock workspace folder for testing
    const testWorkspacePath = path.join(__dirname, 'testWorkspace');

    setup(async () => {
        // Create a mock workspace folder
        workspaceFolder = {
            uri: vscode.Uri.file(testWorkspacePath),
            name: 'testWorkspace',
            index: 0
        };

        // Create test directories
        const assetsDir = path.join(testWorkspacePath, 'Assets');
        if (!fs.existsSync(assetsDir)) {
            fs.mkdirSync(assetsDir, { recursive: true });
        }

        dataStore = new PortfolioDataStore(workspaceFolder);
        portfolioDataAccess = new PortfolioDataAccess(dataStore);
    });

    teardown(() => {
        portfolioDataAccess?.dispose();
        
        // Clean up test files
        try {
            if (fs.existsSync(testWorkspacePath)) {
                fs.rmSync(testWorkspacePath, { recursive: true, force: true });
            }
        } catch (error) {
            console.warn('Failed to clean up test workspace:', error);
        }
    });

    test('getAllTags should return empty array when no portfolio data', async () => {
        const tags = await portfolioDataAccess.getAllTags();
        assert.strictEqual(tags.length, 0);
    });

    test('getAllTags should return unique sorted tags from portfolio data', async () => {
        // Create test portfolio data with tags
        const portfolioData: PortfolioData = {
            assets: [
                {
                    name: 'Asset 1',
                    type: 'simple',
                    currency: 'CNY',
                    tags: ['现金', '活钱']
                },
                {
                    name: 'Asset 2',
                    type: 'investment',
                    currency: 'USD',
                    tags: ['长钱', '股票', '现金'] // 现金 is duplicate
                },
                {
                    name: 'Asset 3',
                    type: 'stock',
                    tags: ['美股', '股票'] // 股票 is duplicate
                }
            ]
        };

        // Save the test data
        await dataStore.savePortfolioData(portfolioData);

        // Get all tags
        const tags = await portfolioDataAccess.getAllTags();

        // Should return unique, sorted tags
        const expectedTags = ['活钱', '现金', '美股', '股票', '长钱'];
        assert.deepStrictEqual(tags, expectedTags);
    });

    test('getAllTags should handle assets without tags', async () => {
        const portfolioData: PortfolioData = {
            assets: [
                {
                    name: 'Asset 1',
                    type: 'simple',
                    tags: ['tag1', 'tag2']
                },
                {
                    name: 'Asset 2',
                    type: 'investment'
                    // No tags property
                },
                {
                    name: 'Asset 3',
                    type: 'stock',
                    tags: [] // Empty tags array
                }
            ]
        };

        await dataStore.savePortfolioData(portfolioData);
        const tags = await portfolioDataAccess.getAllTags();

        assert.deepStrictEqual(tags, ['tag1', 'tag2']);
    });

    test('getAllTags should cache results', async () => {
        const portfolioData: PortfolioData = {
            assets: [
                {
                    name: 'Asset 1',
                    type: 'simple',
                    tags: ['tag1', 'tag2']
                }
            ]
        };

        await dataStore.savePortfolioData(portfolioData);

        // First call should load from data
        const tags1 = await portfolioDataAccess.getAllTags();
        
        // Second call should return cached data (we can't easily test this without mocking,
        // but at least verify it returns the same result)
        const tags2 = await portfolioDataAccess.getAllTags();

        assert.deepStrictEqual(tags1, tags2);
        assert.deepStrictEqual(tags1, ['tag1', 'tag2']);
    });

    test('createAsset should create and cache assets', async () => {
        const assetDef: AssetDefinitionData = {
            name: 'Test Asset',
            type: 'simple',
            currency: 'CNY',
            tags: ['test', 'asset']
        };

        const asset1 = await portfolioDataAccess.getAsset(assetDef);
        const asset2 = await portfolioDataAccess.getAsset(assetDef);

        // Should return the same cached instance
        assert.strictEqual(asset1, asset2);
        assert.strictEqual(asset1.name, 'Test Asset');
        assert.strictEqual(asset1.type, 'simple');
        assert.strictEqual(asset1.currency, 'CNY');
    });

    test('invalidateAllCaches should clear caches', async () => {
        const portfolioData: PortfolioData = {
            assets: [
                {
                    name: 'Asset 1',
                    type: 'simple',
                    tags: ['tag1']
                }
            ]
        };

        await dataStore.savePortfolioData(portfolioData);
        
        // Load tags to cache them
        await portfolioDataAccess.getAllTags();

        // Create asset to cache it
        await portfolioDataAccess.getAsset(portfolioData.assets[0]);

        // Invalidate caches
        portfolioDataAccess.invalidateAllCaches();

        // Verify we can still get data (should reload from disk)
        const tags = await portfolioDataAccess.getAllTags();
        assert.deepStrictEqual(tags, ['tag1']);
    });
});
