# Account as Tag Feature - User Guide

## Overview

The Account as Tag feature automatically makes account names available as virtual tags for category selection. This allows you to create categories that include all assets from specific accounts without manually tagging each asset.

## How It Works

### Virtual Tags vs User Tags

**User Tags**: Tags you explicitly assign to assets in the asset editor. These are:
- Saved to your portfolio.json file
- Editable through the asset definition interface
- Displayed in the Tags tree view
- Fully under your control

**Virtual Tags**: System-generated tags based on account names. These are:
- Automatically created for assets that belong to accounts
- Not saved to portfolio.json (computed dynamically)
- Not editable through the interface
- Available for category selection but not shown in Tags tree

### Example

If you have an account named "Retirement401k" with assets:
- `Retirement401k.VTI` (Vanguard Total Stock Market ETF)
- `Retirement401k.VXUS` (Vanguard Total International Stock ETF)

Both assets automatically have "Retirement401k" as a virtual tag, in addition to any user tags you assign.

## Using Account Names in Categories

### Creating Account-Based Categories

1. **Open Category Definition**: Edit your `Assets/category.json` file
2. **Use Account Name as Tag**: Include the account name in the `tags` array

```json
{
  "categoryTypes": [
    {
      "name": "Account Groups",
      "categories": [
        {
          "name": "Retirement Accounts",
          "tags": ["Retirement401k", "RothIRA"]
        }
      ]
    }
  ]
}
```

3. **Save and Refresh**: The category will automatically include all assets from those accounts

### Mixed Criteria Categories

You can combine account names with user-defined tags:

```json
{
  "name": "International Holdings",
  "tags": ["international", "Retirement401k"]
}
```

This category includes:
- Any asset tagged "international" from any account
- All assets from "Retirement401k" account

## Asset Editor Behavior

### What You See
- Only user-defined tags appear in the asset editor
- You cannot edit or see virtual tags (account names) in the interface
- Virtual tags work behind the scenes for category selection

### Best Practices
- Use descriptive account names since they become virtual tags
- Keep user tags for asset-specific characteristics (e.g., "growth", "value", "international")
- Use account names for organizational grouping (e.g., "401k", "Taxable", "HSA")

## Tree View Display

### Tags Section
- Shows only user-defined tags you can edit
- Does not include account names to avoid confusion
- Click on a tag to see assets with that user-defined tag

### Categories Section  
- Shows categories that may use both user and virtual tags
- Assets appear in categories based on all tags (user + virtual)

## Troubleshooting

### Category Not Showing Expected Assets

**Check Account Names**: Ensure the account name in your category definition exactly matches the account name in portfolio.json:

```json
// In portfolio.json
{
  "accounts": [
    {
      "name": "Retirement401k",
      "assets": [...]
    }
  ]
}

// In category.json
{
  "categoryTypes": [
    {
      "name": "Account Groups",
      "categories": [
        {
          "name": "Retirement Category",
          "tags": ["Retirement401k"]  // Must match exactly
        }
      ]
    }
  ]
}
```

### Assets Missing from Account-Based Category

1. **Verify Asset Location**: Ensure the asset belongs to the account (not a standalone asset)
2. **Check Account Structure**: Asset should be under `accounts[].assets[]` in portfolio.json
3. **Case Sensitivity**: Account names are case-sensitive

### Virtual Tags Not Working

Virtual tags are automatically computed. If they're not working:
1. Ensure assets are properly associated with accounts
2. Check that account names don't contain special characters
3. Restart VS Code to refresh the extension

## Migration from Manual Tagging

If you previously manually tagged assets with account names:

1. **Remove Manual Tags**: Edit assets to remove account name tags from user tags
2. **Update Categories**: Categories using account names will continue working automatically
3. **Clean Up**: The account names will now be virtual tags instead of user tags

This prevents duplication and keeps your tag system clean and maintainable.
