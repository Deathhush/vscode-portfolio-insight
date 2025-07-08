import * as assert from 'assert';
import { Account } from '../src/data/account';
import { PortfolioDataAccess } from '../src/data/portfolioDataAccess';
import { AccountDefinitionData } from '../src/data/interfaces';

describe('Account', () => {
    describe('Account Creation', () => {
        it('should create account with valid definition', () => {
            const definition: AccountDefinitionData = {
                name: '招行',
                type: 'bank'
            };

            // Create a mock data access object
            const mockDataAccess = {
                getPortfolioData: async () => ({ assets: [] }),
                createAsset: async (def: any) => ({ definitionData: def, calculateCurrentValue: async () => ({ currentValue: 0, currency: 'CNY', valueInCNY: 0 }), generateSummary: async () => ({ definition: def, currentValue: { currentValue: 0, currency: 'CNY', valueInCNY: 0 }, activities: [] }) })
            } as any;

            const account = new Account(definition, mockDataAccess);
            
            assert.strictEqual(account.name, '招行');
            assert.strictEqual(account.type, 'bank');
        });
    });

    describe('Account Assets', () => {
        it('should get assets belonging to account', async () => {
            const accountDefinition: AccountDefinitionData = {
                name: '招行',
                type: 'bank'
            };

            // Mock portfolio data with accounts
            const mockPortfolioData = {
                accounts: [
                    {
                        name: '招行',
                        type: 'bank'
                    }
                ],
                assets: [
                    {
                        name: '招行.活期',
                        type: 'simple' as const,
                        account: '招行'
                    },
                    {
                        name: '招行.沪深300ETF',
                        type: 'investment' as const,
                        account: '招行'
                    },
                    {
                        name: 'StockAward',
                        type: 'stock' as const
                        // No account specified
                    }
                ]
            };

            // Create a mock data access object
            const mockDataAccess = {
                getPortfolioData: async () => mockPortfolioData,
                createAsset: async (def: any) => ({ 
                    definitionData: def, 
                    calculateCurrentValue: async () => ({ currentValue: 0, currency: 'CNY', valueInCNY: 0 }),
                    generateSummary: async () => ({ definition: def, currentValue: { currentValue: 0, currency: 'CNY', valueInCNY: 0 }, activities: [] })
                })
            } as any;

            const account = new Account(accountDefinition, mockDataAccess);
            const assets = await account.getAssets();

            assert.strictEqual(assets.length, 2);
            assert.strictEqual(assets[0].definitionData.name, '招行.活期');
            assert.strictEqual(assets[1].definitionData.name, '招行.沪深300ETF');
        });
    });

    describe('Account Value Calculation', () => {
        it('should calculate total value of account assets', async () => {
            const accountDefinition: AccountDefinitionData = {
                name: '招行',
                type: 'bank'
            };

            // Create a mock data access object
            const mockDataAccess = {
                getPortfolioData: async () => ({ assets: [] }),
                createAsset: async (def: any) => ({ 
                    definitionData: def, 
                    calculateCurrentValue: async () => ({ currentValue: 100, currency: 'CNY', valueInCNY: 100 }),
                    generateSummary: async () => ({ definition: def, currentValue: { currentValue: 100, currency: 'CNY', valueInCNY: 100 }, activities: [] })
                })
            } as any;

            const account = new Account(accountDefinition, mockDataAccess);
            const totalValue = await account.calculateTotalValue();
            
            assert.strictEqual(typeof totalValue.currentValue, 'number');
            assert.strictEqual(typeof totalValue.valueInCNY, 'number');
            assert.strictEqual(totalValue.currency, 'CNY');
        });
    });

    describe('Account Summary', () => {
        it('should generate account summary', async () => {
            const accountDefinition: AccountDefinitionData = {
                name: '招行',
                type: 'bank'
            };

            // Create a mock data access object
            const mockDataAccess = {
                getPortfolioData: async () => ({ assets: [] }),
                createAsset: async (def: any) => ({ 
                    definitionData: def, 
                    calculateCurrentValue: async () => ({ currentValue: 0, currency: 'CNY', valueInCNY: 0 }),
                    generateSummary: async () => ({ definition: def, currentValue: { currentValue: 0, currency: 'CNY', valueInCNY: 0 }, activities: [] })
                })
            } as any;

            const account = new Account(accountDefinition, mockDataAccess);
            const summary = await account.generateSummary();
            
            assert.strictEqual(summary.definition.name, '招行');
            assert.strictEqual(summary.definition.type, 'bank');
            assert.strictEqual(Array.isArray(summary.assets), true);
            assert.strictEqual(typeof summary.totalValue, 'object');
        });
    });
});
