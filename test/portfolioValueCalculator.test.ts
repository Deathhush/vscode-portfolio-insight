import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { PortfolioValueCalculator } from '../src/services/portfolioValueCalculator';
import { AssetNode } from '../src/providers/assetNode';

suite('Portfolio Value Calculator Tests', () => {
    test('Should calculate total portfolio value correctly', async () => {
        // Create a mock workspace folder
        const testWorkspace = vscode.Uri.file(path.join(__dirname, 'testAssets', 'testSimpleLayout'));
        const workspaceFolder: vscode.WorkspaceFolder = {
            uri: testWorkspace,
            name: 'test',
            index: 0
        };

        // Test portfolio assets
        const portfolioAssets = [
            { name: '招行.活期', type: 'simple' as const },
            { name: '招行.沪深300ETF', type: 'investment' as const },
            { name: '国金', type: 'composite' as const },
            { name: 'StockAward', type: 'stock' as const, currency: 'USD' }
        ];

        const calculator = new PortfolioValueCalculator(workspaceFolder);
          // Calculate current values (should use latest data from 2025-06-26 file)
        const assetValues = await calculator.calculateCurrentValues(portfolioAssets);
        
        // Verify individual asset values (using latest update)
        assert.strictEqual(assetValues.length, 4);
        
        const zhaoHangAsset = assetValues.find(a => a.name === '招行.活期');
        assert.strictEqual(zhaoHangAsset?.currentValue, 20000); // Latest value
        assert.strictEqual(zhaoHangAsset?.currency, 'CNY');
        assert.strictEqual(zhaoHangAsset?.valueInCNY, 20000);

        const etfAsset = assetValues.find(a => a.name === '招行.沪深300ETF');
        assert.strictEqual(etfAsset?.currentValue, 35000); // Latest value
        assert.strictEqual(etfAsset?.currency, 'CNY');
        assert.strictEqual(etfAsset?.valueInCNY, 35000);

        const guoJinAsset = assetValues.find(a => a.name === '国金');
        assert.strictEqual(guoJinAsset?.currentValue, 40000); // Latest value
        assert.strictEqual(guoJinAsset?.currency, 'CNY');
        assert.strictEqual(guoJinAsset?.valueInCNY, 40000);

        const stockAwardAsset = assetValues.find(a => a.name === 'StockAward');
        assert.strictEqual(stockAwardAsset?.currentValue, 19200); // 120 shares * 160 price (latest)
        assert.strictEqual(stockAwardAsset?.currency, 'USD');
        assert.strictEqual(stockAwardAsset?.valueInCNY, 140160); // 19200 * 7.3 exchange rate (latest)

        // Calculate total value
        const totalValue = await calculator.calculateTotalValue(portfolioAssets);
        
        // Total should be: 20000 + 35000 + 40000 + 140160 = 235160
        assert.strictEqual(totalValue, 235160);
    });

    test('Should handle portfolio with no AssetUpdates folder', async () => {
        // Create a mock workspace folder without AssetUpdates
        const testWorkspace = vscode.Uri.file(path.join(__dirname, 'nonexistent'));
        const workspaceFolder: vscode.WorkspaceFolder = {
            uri: testWorkspace,
            name: 'test',
            index: 0
        };

        const portfolioAssets = [
            { name: 'Test Asset', type: 'simple' as const }
        ];

        const calculator = new PortfolioValueCalculator(workspaceFolder);
        const totalValue = await calculator.calculateTotalValue(portfolioAssets);
        
        // Should return 0 when no asset updates are found
        assert.strictEqual(totalValue, 0);
    });

    test('Should default to CNY when no currency specified', async () => {
        const testWorkspace = vscode.Uri.file(path.join(__dirname, 'testAssets', 'testSimpleLayout'));
        const workspaceFolder: vscode.WorkspaceFolder = {
            uri: testWorkspace,
            name: 'test',
            index: 0
        };

        const portfolioAssets = [
            { name: '招行.活期', type: 'simple' as const } // No currency specified
        ];

        const calculator = new PortfolioValueCalculator(workspaceFolder);
        const assetValues = await calculator.calculateCurrentValues(portfolioAssets);
        
        assert.strictEqual(assetValues.length, 1);
        assert.strictEqual(assetValues[0].currency, 'CNY');
        assert.strictEqual(assetValues[0].valueInCNY, assetValues[0].currentValue);
    });    test('AssetNode should display current value in description', async () => {
        // Create a mock workspace folder
        const testWorkspace = vscode.Uri.file(path.join(__dirname, 'testAssets', 'testSimpleLayout'));
        const workspaceFolder: vscode.WorkspaceFolder = {
            uri: testWorkspace,
            name: 'test',
            index: 0
        };

        // Mock vscode.workspace.workspaceFolders
        const originalWorkspaceFolders = vscode.workspace.workspaceFolders;
        (vscode.workspace as any).workspaceFolders = [workspaceFolder];

        try {
            // Test CNY asset
            const cnyAsset = { name: '招行.活期', type: 'simple' as const };
            const cnyAssetNode = await AssetNode.createWithCurrentValue(cnyAsset);
            
            // Should show type and CNY value
            assert.ok(cnyAssetNode.description);
            assert.ok((cnyAssetNode.description as string).includes('simple'));
            assert.ok((cnyAssetNode.description as string).includes('¥'));

            // Test USD asset
            const usdAsset = { name: 'StockAward', type: 'stock' as const, currency: 'USD' };
            const usdAssetNode = await AssetNode.createWithCurrentValue(usdAsset);
            
            // Should show type, USD value, and CNY equivalent
            assert.ok(usdAssetNode.description);
            assert.ok((usdAssetNode.description as string).includes('stock'));
            assert.ok((usdAssetNode.description as string).includes('USD'));
            assert.ok((usdAssetNode.description as string).includes('¥'));

        } finally {
            // Restore original workspace folders
            (vscode.workspace as any).workspaceFolders = originalWorkspaceFolders;
        }
    });

    test('Should use closest exchange rate to asset snapshot date', async () => {
        // Create a mock workspace folder
        const testWorkspace = vscode.Uri.file(path.join(__dirname, 'testAssets', 'testSimpleLayout'));
        const workspaceFolder: vscode.WorkspaceFolder = {
            uri: testWorkspace,
            name: 'test',
            index: 0
        };

        // Test portfolio assets including EUR asset
        const portfolioAssets = [
            { name: 'StockAward', type: 'stock' as const, currency: 'USD' },
            { name: 'EU.Stock', type: 'stock' as const, currency: 'EUR' }
        ];

        const calculator = new PortfolioValueCalculator(workspaceFolder);
        
        // Calculate current values
        const assetValues = await calculator.calculateCurrentValues(portfolioAssets);
        
        // Find the USD asset (StockAward from 2025-06-26)
        const stockAwardAsset = assetValues.find(a => a.name === 'StockAward');
        assert.ok(stockAwardAsset);
        assert.strictEqual(stockAwardAsset.currentValue, 19200); // 120 shares * 160 price
        assert.strictEqual(stockAwardAsset.currency, 'USD');
        // Should use 7.3 rate (from 2025-06-26 update, closest to asset date)
        assert.strictEqual(stockAwardAsset.valueInCNY, 140160); // 19200 * 7.3

        // Find the EUR asset (EU.Stock from 2025-06-23 snapshot date)
        const euStockAsset = assetValues.find(a => a.name === 'EU.Stock');
        assert.ok(euStockAsset);
        assert.strictEqual(euStockAsset.currentValue, 10800); // 60 shares * 180 price
        assert.strictEqual(euStockAsset.currency, 'EUR');
        // Should use 7.65 rate (from 2025-06-24 update, closest to 2025-06-23 snapshot date)
        assert.strictEqual(euStockAsset.valueInCNY, 82620); // 10800 * 7.65
    });

    test('Should error when exchange rate is missing for foreign currency asset', async () => {
        // Create a mock workspace folder with the missing exchange rate file
        const testWorkspace = vscode.Uri.file(path.join(__dirname, 'testAssets', 'testSimpleLayout'));
        const workspaceFolder: vscode.WorkspaceFolder = {
            uri: testWorkspace,
            name: 'test',
            index: 0
        };

        // Portfolio assets including a USD asset
        const portfolioAssets = [
            { name: '招行.活期', type: 'simple' as const },
            { name: 'StockAward', type: 'stock' as const, currency: 'USD' }
        ];

        const calculator = new PortfolioValueCalculator(workspaceFolder);
        
        // This should throw an error because no exchange rate is provided for USD
        try {
            await calculator.calculateCurrentValues(portfolioAssets);
            assert.fail('Expected error to be thrown for missing exchange rate');
        } catch (error) {
            assert.ok(error instanceof Error);
            assert.ok(error.message.includes('No exchange rate found for currency USD'));
            assert.ok(error.message.includes('StockAward'));
        }
    });

    test('Should calculate correctly when exchange rates are provided', async () => {
        // First, let's create a test file with exchange rates
        const fs = require('fs');
        const testDir = path.join(__dirname, 'testAssets', 'testSimpleLayout', 'AssetUpdates');
        const testFile = path.join(testDir, 'portfolio-update-with-rates.json');
        
        const testData = {
            "date": "2025-06-28",
            "assets": [
                {
                    "name": "招行.活期",
                    "events": [{ "type": "snapshot", "currentValue": 30000 }]
                },
                {
                    "name": "StockAward", 
                    "events": [{ "type": "snapshot", "shares": 200, "price": 175 }]
                }
            ],
            "exchangeRates": [
                { "from": "USD", "rate": 7.1 }
            ]
        };
        
        fs.writeFileSync(testFile, JSON.stringify(testData, null, 2));
        
        try {
            const testWorkspace = vscode.Uri.file(path.join(__dirname, 'testAssets', 'testSimpleLayout'));
            const workspaceFolder: vscode.WorkspaceFolder = {
                uri: testWorkspace,
                name: 'test',
                index: 0
            };

            const portfolioAssets = [
                { name: '招行.活期', type: 'simple' as const },
                { name: 'StockAward', type: 'stock' as const, currency: 'USD' }
            ];

            const calculator = new PortfolioValueCalculator(workspaceFolder);
            const assetValues = await calculator.calculateCurrentValues(portfolioAssets);
            
            // Should succeed with exchange rates provided
            assert.strictEqual(assetValues.length, 2);
            
            const stockAwardAsset = assetValues.find(a => a.name === 'StockAward');
            assert.strictEqual(stockAwardAsset?.currentValue, 35000); // 200 shares * 175 price
            assert.strictEqual(stockAwardAsset?.valueInCNY, 248500); // 35000 * 7.1 rate
            
        } finally {
            // Clean up test file
            if (fs.existsSync(testFile)) {
                fs.unlinkSync(testFile);
            }
        }
    });
});
