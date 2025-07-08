# Account Management User Guide

This guide walks you through using the account management feature in VS Code Portfolio Insight to organize your portfolio assets.

## What are Accounts?

Accounts are containers that help you organize your assets into logical groups. For example:
- **Bank Account**: For cash, savings, and checking accounts
- **Stock Account**: For stock holdings and trading accounts

## Getting Started

### Opening the Asset Definition Editor

1. Open VS Code with your portfolio workspace
2. Look for the "Asset Insight" panel in the sidebar (Activity Bar)
3. In the Portfolio Explorer, click **"Edit Asset Definition"**
4. The Asset Definition Editor will open in a new tab

## Managing Accounts

### Creating a New Account

1. In the Asset Definition Editor, scroll to the **"Accounts"** section
2. Click the **"+ Add Account"** button
3. Enter the account details:
   - **Account Name**: A descriptive name (e.g., "Chase Checking", "Fidelity 401k")
   - **Account Type**: Select from dropdown (bank, stock)
4. Click **"Save Changes"** to create the account

**Example:**
```
Account Name: Main Bank Account
Account Type: bank
```

### Editing an Account

1. Find the account in the Accounts table
2. Click in the **Account Name** field to edit the name
3. Use the **Account Type** dropdown to change the type
4. Changes are saved automatically when you move to another field
5. Click **"Save Changes"** to persist the modifications

### Removing an Account

1. Find the account in the Accounts table  
2. Click the **"Remove"** button for that account
3. If assets are assigned to this account, you'll see a confirmation dialog:
   - **Warning**: "This account is used by X asset(s). Removing the account will unassign these assets. Continue?"
   - Click **"OK"** to proceed or **"Cancel"** to abort
4. Removed accounts automatically unassign their assets

## Managing Assets

### Assigning an Asset to an Account

1. In the **"Assets"** section, find the asset you want to assign
2. In the **Account** column, click the dropdown
3. Select an account from the list, or choose **"(No Account)"** to leave it unassigned
4. The assignment is saved automatically
5. Click **"Save Changes"** to persist all modifications

### Creating a New Asset with an Account

1. Click **"+ Add Asset"** in the Assets section
2. Fill in the asset details:
   - **Asset Name**: Descriptive name
   - **Type**: Asset type (simple, investment, composite, stock)
   - **Currency**: Currency code (defaults to CNY)
   - **Account**: Select from dropdown or leave as "(No Account)"
3. Add tags if desired
4. Click **"Save Changes"**

### Moving Assets Between Accounts

1. Find the asset in the Assets table
2. Click the **Account** dropdown for that asset
3. Select the new account or **"(No Account)"**
4. Click **"Save Changes"**

## Portfolio Structure Examples

### Example 1: Simple Setup
```json
{
  "accounts": [
    {
      "name": "Main Bank",
      "type": "bank"
    }
  ],
  "assets": [
    {
      "name": "Checking Account",
      "type": "simple",
      "account": "Main Bank"
    },
    {
      "name": "Personal Cash",
      "type": "simple"
    }
  ]
}
```

### Example 2: Multiple Account Types
```json
{
  "accounts": [
    {
      "name": "Chase Bank",
      "type": "bank"
    },
    {
      "name": "Fidelity Trading",
      "type": "stock"
    }
  ],
  "assets": [
    {
      "name": "Checking",
      "type": "simple",
      "account": "Chase Bank"
    },
    {
      "name": "Apple Stock",
      "type": "stock",
      "account": "Fidelity Trading"
    },
    {
      "name": "Investment Fund",
      "type": "investment"
    }
  ]
}
```

## Tree View Navigation

After setting up accounts, your Portfolio Explorer will show:

```
📁 Assets
├── 🏦 Chase Bank (bank) - ¥45,230.00
│   ├── 💰 Checking Account
│   └── 💰 Savings Account  
├── 📈 Fidelity Trading (stock) - ¥12,450.00
│   ├── 📊 Apple Stock
│   └── 📊 Tesla Stock
└── 💰 Personal Cash (no account)
```

## Best Practices

### Account Naming
- Use descriptive names that clearly identify the account
- Include the financial institution name when helpful
- Be consistent with naming conventions

**Good Examples:**
- "Chase Checking"
- "Fidelity 401k"
- "Trading Account"

**Avoid:**
- "Account 1"
- "My Account"
- Very long names that don't fit well in the UI

### Account Organization
- **Bank Accounts**: Use for cash, checking, savings, CDs
- **Stock Accounts**: Use for individual stocks, trading accounts, brokerage accounts

### Asset Assignment
- Assign assets to accounts that actually hold them
- Leave assets unassigned if they don't belong to a specific account
- Use consistent assignment logic across similar assets

## Troubleshooting

### Common Issues

**Problem**: Can't see the Account dropdown for assets
**Solution**: Make sure you've created at least one account first in the Accounts section

**Problem**: Account removal warning appears
**Solution**: This is normal when removing accounts with assigned assets. The assets will be unassigned but not deleted.

**Problem**: Assets not showing under accounts in tree view
**Solution**: Ensure assets are properly assigned to accounts and click refresh in the Portfolio Explorer

**Problem**: Validation errors when saving
**Solution**: Check that all account names are unique and all required fields are filled

### Error Messages

**"Account name is required"**: Enter a name for the account
**"Account name must be unique"**: Choose a different account name
**"Asset name must be unique"**: Rename the asset to avoid conflicts

## Data Management

### Backup Recommendations
Before making major changes to your account structure:
1. The extension automatically creates backups when saving
2. Backups are stored in the `Assets/` folder with timestamps
3. You can manually copy `portfolio.json` as additional backup

### File Location
Your portfolio data is stored in:
```
workspace/
├── Assets/
│   ├── portfolio.json              # Main portfolio file
│   └── portfolio-backup-*.json     # Automatic backups
└── AssetUpdates/
    └── portfolio-update-*.json     # Update history
```

## Advanced Features

### Multi-Currency Accounts
Accounts can contain assets in different currencies:
```json
{
  "name": "International Trading",
  "type": "stock",
  "assets": [
    {
      "name": "US Stocks",
      "currency": "USD",
      "account": "International Trading"
    },
    {
      "name": "EU Stocks", 
      "currency": "EUR",
      "account": "International Trading"
    }
  ]
}
```

### Tagging with Accounts
Combine accounts and tags for powerful organization:
- **Account**: Groups by institution/location
- **Tags**: Groups by strategy/category

Example:
```json
{
  "name": "Apple Stock",
  "type": "stock", 
  "account": "Fidelity Trading",
  "tags": ["growth", "technology", "large-cap"]
}
```

## Getting Help

If you encounter issues or have questions:
1. Check this user guide for common solutions
2. Review the [Account Feature Implementation](AccountFeatureImplementation.md) for technical details
3. Check the extension's GitHub repository for additional resources
4. Report bugs or request features through the appropriate channels

## Summary

The account management feature provides a powerful way to organize your portfolio assets. By grouping related assets into accounts, you can:
- Better understand your asset allocation
- Organize by financial institution
- Track performance by account type  
- Maintain a cleaner, more structured portfolio view

Start with a simple account structure and expand as your portfolio grows in complexity.
