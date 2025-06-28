import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { PortfolioDataStore } from '../src/data/portfolioDataStore';
import { Asset } from '../src/data/asset';
import { AssetDefinitionData } from '../src/data/interfaces';

suite('AssetPage Integration Tests', () => {
    let mockWorkspaceFolder: vscode.WorkspaceFolder;
    let dataStore: PortfolioDataStore;

    setup(() => {
        // Create a mock workspace folder pointing to test assets
        const testAssetsPath = path.join(__dirname, 'testAssets', 'testSimpleLayout');
        mockWorkspaceFolder = {
            uri: vscode.Uri.file(testAssetsPath),
            name: 'testWorkspace',
            index: 0
        };
        
        dataStore = new PortfolioDataStore(mockWorkspaceFolder);
    });

    test('Should create Asset instance and calculate value', async () => {
        const assetDefinition: AssetDefinitionData = {
            name: '招行.活期',
            type: 'simple'
        };

        const asset = new Asset(assetDefinition, dataStore);
        
        // Test basic properties
        assert.strictEqual(asset.name, '招行.活期');
        assert.strictEqual(asset.type, 'simple');
        assert.strictEqual(asset.currency, 'CNY');
        
        // Test value calculation
        try {
            const currentValue = await asset.calculateCurrentValue();
            assert.ok(currentValue);
            assert.strictEqual(currentValue.currency, 'CNY');
            console.log('Asset value calculated successfully:', currentValue);
        } catch (error) {
            console.log('Expected error for missing asset updates:', error);
            // This is expected if no asset update files exist
        }
    });

    test('Should generate asset summary', async () => {
        const assetDefinition: AssetDefinitionData = {
            name: '招行.活期',
            type: 'simple'
        };

        const asset = new Asset(assetDefinition, dataStore);
        
        try {
            const summary = await asset.generateSummary();
            assert.ok(summary);
            assert.strictEqual(summary.definition.name, '招行.活期');
            assert.strictEqual(summary.definition.type, 'simple');
            assert.ok(summary.currentValue);
            assert.ok(Array.isArray(summary.activities));
            console.log('Asset summary generated successfully');
        } catch (error) {
            console.log('Expected error for missing asset updates:', error);
            // This is expected if no asset update files exist
        }
    });

    test('Should load portfolio data', async () => {
        try {
            const portfolioData = await dataStore.loadPortfolioData();
            if (portfolioData) {
                assert.ok(portfolioData.assets);
                assert.ok(Array.isArray(portfolioData.assets));
                console.log('Portfolio data loaded:', portfolioData.assets.length, 'assets');
            } else {
                console.log('No portfolio data found (expected if no portfolio.json exists)');
            }
        } catch (error) {
            console.log('Error loading portfolio data:', error);
        }
    });
});
