import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { Account } from '../src/data/account';
import { PortfolioDataAccess } from '../src/data/portfolioDataAccess';
import { PortfolioDataStore } from '../src/data/portfolioDataStore';
import { AccountDefinitionData, PortfolioData } from '../src/data/interfaces';

suite('Account Tests', () => {
    let dataStore: PortfolioDataStore;
    let dataAccess: PortfolioDataAccess;

    setup(() => {
        // Setup test workspace - when compiled, __dirname will be out/test, so we need to go back to project root
        const projectRoot = path.resolve(__dirname, '..', '..');
        const testWorkspaceUri = vscode.Uri.file(path.join(projectRoot, 'test', 'testAssets'));
        const workspaceFolder: vscode.WorkspaceFolder = {
            uri: testWorkspaceUri,
            name: 'testAssets',
            index: 0
        };
        
        dataStore = new PortfolioDataStore(workspaceFolder);
        dataAccess = new PortfolioDataAccess(dataStore);
    });

    teardown(() => {
        dataAccess?.dispose();
    });

    suite('Account Creation', () => {
        test('should create account with valid definition', () => {
            const definition: AccountDefinitionData = {
                name: '招行',
                type: 'bank'
            };

            const account = new Account(definition, dataAccess);
            
            assert.strictEqual(account.name, '招行');
            assert.strictEqual(account.type, 'bank');
            assert.strictEqual(account.definitionData, definition);
        });
    });

    suite('Account Assets', () => {
        test('should get assets belonging to account', async () => {
            // Create test portfolio data with accounts and assets
            const portfolioData: PortfolioData = {
                accounts: [
                    {
                        name: '招行',
                        type: 'bank',
                        assets: [
                            {
                                name: '招行.活期',
                                type: 'simple',
                                currency: 'CNY',
                                tags: ['活期']
                            },
                            {
                                name: '招行.沪深300ETF',
                                type: 'investment',
                                tags: ['指数基金']
                            }
                        ]
                    }
                ],
                assets: [
                    {
                        name: 'StockAward',
                        type: 'stock',
                        currency: 'USD',
                        tags: ['股票', '美股']
                    }
                ]
            };

            // Mock the data store to return our test data
            dataStore.loadPortfolioData = async () => portfolioData;
            
            // Find the 招行 account from the test data
            const accountDefinition = portfolioData.accounts?.find(acc => acc.name === '招行');
            assert.ok(accountDefinition, 'Should find 招行 account in test data');

            const account = new Account(accountDefinition!, dataAccess);
            const assets = await account.getAssets();

            assert.strictEqual(assets.length, 2, 'Account should have 2 assets');
            
            const assetNames = assets.map(asset => asset.definitionData.name);
            assert.ok(assetNames.includes('招行.活期'), 'Should include 招行.活期 asset');
            assert.ok(assetNames.includes('招行.沪深300ETF'), 'Should include 招行.沪深300ETF asset');
        });

        test('should handle account with no assets', async () => {
            const accountDefinition: AccountDefinitionData = {
                name: '空账户',
                type: 'bank'
                // No assets property
            };

            // Mock empty portfolio data
            const portfolioData: PortfolioData = {
                assets: []
            };
            dataStore.loadPortfolioData = async () => portfolioData;

            const account = new Account(accountDefinition, dataAccess);
            const assets = await account.getAssets();

            assert.strictEqual(assets.length, 0, 'Account with no assets should return empty array');
        });
    });

    suite('Account Value Calculation', () => {
        test('should calculate total value of account assets', async () => {
            // Create test portfolio data with accounts and assets
            const portfolioData: PortfolioData = {
                accounts: [
                    {
                        name: '招行',
                        type: 'bank',
                        assets: [
                            {
                                name: '招行.活期',
                                type: 'simple',
                                currency: 'CNY',
                                tags: ['活期']
                            },
                            {
                                name: '招行.沪深300ETF',
                                type: 'investment',
                                tags: ['指数基金']
                            }
                        ]
                    }
                ],
                assets: []
            };

            // Mock the data store to return our test data
            dataStore.loadPortfolioData = async () => portfolioData;
            
            // Find the 招行 account from the test data
            const accountDefinition = portfolioData.accounts?.find(acc => acc.name === '招行');
            assert.ok(accountDefinition, 'Should find 招行 account in test data');

            const account = new Account(accountDefinition!, dataAccess);
            const totalValue = await account.calculateTotalValue();
            
            // Verify the structure of the returned value
            assert.strictEqual(typeof totalValue.currentValue, 'number', 'Current value should be a number');
            assert.strictEqual(typeof totalValue.valueInCNY, 'number', 'Value in CNY should be a number');
            assert.strictEqual(typeof totalValue.currency, 'string', 'Currency should be a string');
            
            // The actual values depend on the test data and any asset updates
            assert.ok(totalValue.currentValue >= 0, 'Current value should be non-negative');
            assert.ok(totalValue.valueInCNY >= 0, 'Value in CNY should be non-negative');
        });

        test('should return zero value for account with no assets', async () => {
            const accountDefinition: AccountDefinitionData = {
                name: '空账户',
                type: 'bank'
                // No assets property
            };

            // Mock empty portfolio data
            const portfolioData: PortfolioData = {
                assets: []
            };
            dataStore.loadPortfolioData = async () => portfolioData;

            const account = new Account(accountDefinition, dataAccess);
            const totalValue = await account.calculateTotalValue();
            
            assert.strictEqual(totalValue.currentValue, 0, 'Empty account should have zero current value');
            assert.strictEqual(totalValue.valueInCNY, 0, 'Empty account should have zero value in CNY');
            assert.strictEqual(totalValue.currency, 'CNY', 'Default currency should be CNY');
        });
    });
});
