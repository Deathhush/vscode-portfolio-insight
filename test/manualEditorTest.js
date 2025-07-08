/**
 * Manual test for the Asset Definition Editor with Accounts
 * This would be opened in the VS Code webview
 */

// Test portfolio data with accounts
const testPortfolioData = {
    accounts: [
        { name: "招行", type: "bank" },
        { name: "国金", type: "stock" }
    ],
    assets: [
        {
            name: "招行.活期",
            type: "simple",
            currency: "CNY",
            account: "招行",
            tags: ["活期"]
        },
        {
            name: "招行.沪深300ETF", 
            type: "investment",
            account: "招行",
            tags: ["指数基金"]
        },
        {
            name: "富国信用债",
            type: "investment", 
            tags: ["信用债基金"]
        },
        {
            name: "贵州茅台",
            type: "stock",
            account: "国金",
            tags: ["股票"]
        },
        {
            name: "StockAward",
            type: "stock",
            currency: "USD",
            tags: ["股票", "美股"]
        }
    ]
};

console.log('Test portfolio data structure:');
console.log(JSON.stringify(testPortfolioData, null, 2));

console.log('\nAssets by account:');
testPortfolioData.accounts.forEach(account => {
    const accountAssets = testPortfolioData.assets.filter(asset => asset.account === account.name);
    console.log(`${account.name} (${account.type}): ${accountAssets.length} assets`);
    accountAssets.forEach(asset => {
        console.log(`  - ${asset.name} (${asset.type})`);
    });
});

const unassignedAssets = testPortfolioData.assets.filter(asset => !asset.account);
console.log(`\nUnassigned assets: ${unassignedAssets.length}`);
unassignedAssets.forEach(asset => {
    console.log(`  - ${asset.name} (${asset.type})`);
});

console.log('\n✅ Asset Definition Editor with Accounts is ready for testing!');
