import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';

import { PortfolioDataStore } from '../src/data/portfolioDataStore';
import { PortfolioDataAccess } from '../src/data/portfolioDataAccess';
import { Asset } from '../src/data/asset';
import { Category } from '../src/data/category';
import { PortfolioData, CategoryData } from '../src/data/interfaces';

suite('Account as Tag Feature', () => {
    let dataStore: PortfolioDataStore;
    let dataAccess: PortfolioDataAccess;
    let workspaceFolder: vscode.WorkspaceFolder;

    setup(() => {
        const testAssetsPath = path.join(__dirname, 'testAssets');
        workspaceFolder = {
            uri: vscode.Uri.file(testAssetsPath),
            name: 'testAssets',
            index: 0
        };
        dataStore = new PortfolioDataStore(workspaceFolder);
        dataAccess = new PortfolioDataAccess(dataStore);
    });

    suite('Asset Tag System', () => {
        test('should differentiate between userTags and virtualTags', async () => {
            // Create test portfolio data with account assets
            const portfolioData: PortfolioData = {
                assets: [
                    { name: 'StandaloneAsset', type: 'simple', tags: ['personal', 'savings'] }
                ],
                accounts: [
                    {
                        name: 'TestAccount',
                        type: 'bank',
                        assets: [
                            { name: 'AccountAsset', type: 'simple', tags: ['investment'] }
                        ]
                    }
                ]
            };

            // Mock the data store
            dataStore.loadPortfolioData = async () => portfolioData;

            // Get assets
            const standaloneAsset = await dataAccess.getAsset('StandaloneAsset');
            const accountAsset = await dataAccess.getAsset('AccountAsset', 'TestAccount');

            // Test standalone asset tags
            assert.deepStrictEqual(standaloneAsset.userTags, ['personal', 'savings']);
            assert.deepStrictEqual(standaloneAsset.virtualTags, []);
            assert.deepStrictEqual(standaloneAsset.allTags, ['personal', 'savings']);

            // Test account asset tags
            assert.deepStrictEqual(accountAsset.userTags, ['investment']);
            assert.deepStrictEqual(accountAsset.virtualTags, ['TestAccount']); // Account name as virtual tag
            assert.deepStrictEqual(accountAsset.allTags, ['TestAccount', 'investment']); // Sorted combined tags
        });

        test('should use allTags for category selection', async () => {
            // Create test portfolio with account assets
            const portfolioData: PortfolioData = {
                assets: [
                    { name: 'StandaloneAsset', type: 'simple', tags: ['personal'] }
                ],
                accounts: [
                    {
                        name: 'BankAccount',
                        type: 'bank',
                        assets: [
                            { name: 'BankAsset', type: 'simple', tags: ['savings'] }
                        ]
                    }
                ]
            };

            dataStore.loadPortfolioData = async () => portfolioData;

            // Create a category that filters by the account name (virtual tag)
            const categoryDef: CategoryData = {
                name: 'BankAccount Assets',
                tags: ['BankAccount'] // This should match the virtual tag from account name
            };

            const category = new Category(categoryDef, dataAccess);
            const categoryAssets = await category.getAssets();

            // Should find the account asset because its allTags includes the account name
            assert.strictEqual(categoryAssets.length, 1);
            assert.strictEqual(categoryAssets[0].name, 'BankAsset');
            assert.ok(categoryAssets[0].allTags.includes('BankAccount'));
        });

        test('should use userTags for asset persistence', async () => {
            const portfolioData: PortfolioData = {
                assets: [],
                accounts: [
                    {
                        name: 'TestAccount',
                        type: 'bank',
                        assets: [
                            { name: 'TestAsset', type: 'simple', tags: ['userTag1', 'userTag2'] }
                        ]
                    }
                ]
            };

            dataStore.loadPortfolioData = async () => portfolioData;
            
            const asset = await dataAccess.getAsset('TestAsset', 'TestAccount');
            
            // userTags should only include explicitly defined tags, not virtual ones
            assert.deepStrictEqual(asset.userTags, ['userTag1', 'userTag2']);
            
            // allTags should include both user tags and virtual tags (account name)
            assert.deepStrictEqual(asset.allTags, ['TestAccount', 'userTag1', 'userTag2']);
            
            // Asset definition should only contain user tags
            assert.deepStrictEqual(asset.definitionData.tags, ['userTag1', 'userTag2']);
        });

        test('should include account names in getAllTags but not in getUserTags', async () => {
            const portfolioData: PortfolioData = {
                assets: [
                    { name: 'StandaloneAsset', type: 'simple', tags: ['personal'] }
                ],
                accounts: [
                    {
                        name: 'BankAccount',
                        type: 'bank',
                        assets: [
                            { name: 'BankAsset', type: 'simple', tags: ['investment'] }
                        ]
                    }
                ]
            };

            dataStore.loadPortfolioData = async () => portfolioData;

            const userTags = await dataAccess.getUserTags();

            // getUserTags should only include user-defined tags (not virtual tags like account names)
            assert.ok(!userTags.includes('BankAccount'), 'DataAccess should not include virtual tags like account names');
            assert.ok(userTags.includes('personal'), 'DataAccess should include user-defined tags');
            assert.ok(userTags.includes('investment'), 'DataAccess should include user-defined tags');
        });
    });
});
