/**
 * Manual test script to verify Account functionality
 * Run this with: node out/test/manualAccountTest.js
 */

// Use require since this will be a JS file after compilation
const { Account } = require('../out/src/data/account');

async function testAccount() {
    console.log('Testing Account functionality...');

    // Test 1: Create account
    const accountDefinition = {
        name: '招行',
        type: 'bank'
    };

    // Mock data access
    const mockDataAccess = {
        getPortfolioData: async () => ({
            accounts: [{ name: '招行', type: 'bank' }],
            assets: [
                { name: '招行.活期', type: 'simple', account: '招行' },
                { name: '招行.沪深300ETF', type: 'investment', account: '招行' },
                { name: 'StockAward', type: 'stock' } // No account
            ]
        }),
        createAsset: async (def) => ({
            definitionData: def,
            calculateCurrentValue: async () => ({ currentValue: 100, currency: 'CNY', valueInCNY: 100 }),
            generateSummary: async () => ({ definition: def, currentValue: { currentValue: 100, currency: 'CNY', valueInCNY: 100 }, activities: [] })
        })
    };

    try {
        const account = new Account(accountDefinition, mockDataAccess);
        console.log(`✓ Account created: ${account.name} (${account.type})`);

        // Test 2: Get assets
        const assets = await account.getAssets();
        console.log(`✓ Found ${assets.length} assets in account`);
        assets.forEach(asset => {
            console.log(`  - ${asset.definitionData.name}`);
        });

        // Test 3: Calculate total value
        const totalValue = await account.calculateTotalValue();
        console.log(`✓ Total value: ¥${totalValue.valueInCNY}`);

        // Test 4: Generate summary
        const summary = await account.generateSummary();
        console.log(`✓ Summary generated with ${summary.assets.length} assets`);

        console.log('All Account tests passed!');
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testAccount().catch(console.error);
