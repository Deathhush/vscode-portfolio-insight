# Centralized Backup Feature

The VSCode Portfolio Insight extension now provides a centralized backup system to better organize and manage backup files for your portfolio data.

## Overview

Previously, backup files were scattered across different folders, making them difficult to find and manage. The new centralized backup system organizes all backup files under a single `.portfolio-insight/backup` directory structure.

## Backup Structure

All backup files are now organized under the following structure:

```
.portfolio-insight/
└── backup/
    ├── portfolio/                    # Portfolio definition backups
    │   ├── portfolio-backup-2025-01-15T10-30-00.json
    │   ├── portfolio-backup-2025-01-20T14-45-30.json
    │   └── ...
    └── renames/                      # Asset rename operation backups
        ├── OldAssetName-NewAssetName/
        │   ├── portfolio-update-2025-06-20.json
        │   ├── portfolio-update-2025-06-21.json
        │   └── ...
        ├── 富国信用债-长期混合基金/
        │   └── portfolio-update-2025-06-20.json
        └── ...
```

## Backup Types

### 1. Portfolio Definition Backups

**Location**: `.portfolio-insight/backup/portfolio/`

**When Created**: Every time you save changes to your asset definitions (portfolio.json)

**File Format**: `portfolio-backup-{timestamp}.json`

**What's Backed Up**: The complete portfolio definition including:
- Standalone asset definitions
- Account definitions and their nested assets
- Asset tags and categorization

### 2. Asset Rename Operation Backups

**Location**: `.portfolio-insight/backup/renames/{oldName-newName}/`

**When Created**: When you rename an asset that has historical update data

**Folder Format**: `{oldAssetName}-{newAssetName}`

**What's Backed Up**: All portfolio update files that contain references to the renamed asset, allowing you to recover the original update history if needed.

## Key Features

### Automatic Backup Creation

- **Portfolio Backups**: Automatically created every time you modify and save asset definitions
- **Rename Backups**: Automatically created when renaming assets that have update history

### Improved Naming Convention

- Rename backup folders now use the intuitive `oldName-newName` format instead of the previous `assetName.rename.bak` format
- Timestamps are automatically added to prevent conflicts when multiple operations use the same names

### UTF-8 Support

- Full support for Unicode characters in asset names (including Chinese, Japanese, etc.)
- Proper encoding ensures backup folders and files are created correctly regardless of character set

### Conflict Resolution

- If a backup folder already exists, a timestamp is automatically appended to create a unique folder name
- No backup data is ever overwritten or lost

## Benefits

1. **Better Organization**: All backups are centrally located and easy to find
2. **Clear Naming**: Intuitive folder and file names make it easy to understand what each backup contains
3. **Data Safety**: Comprehensive backup coverage ensures you never lose portfolio data
4. **Space Efficient**: Only files that actually reference renamed assets are backed up during rename operations

## Migration from Previous Versions

The new backup system is fully backward compatible. Existing backup files in the old locations continue to work, while new backups are created in the centralized location. You can safely delete old backup files once you've verified the new system is working correctly.

## Finding Your Backups

1. Open your workspace folder in VS Code
2. Look for the `.portfolio-insight` folder (it may be hidden by default)
3. Navigate to `.portfolio-insight/backup/`
4. Choose either `portfolio/` for asset definition backups or `renames/` for rename operation backups

## Recovery Process

### Recovering Portfolio Definitions

1. Navigate to `.portfolio-insight/backup/portfolio/`
2. Find the backup file closest to when your data was correct
3. Copy the backup file to `Assets/portfolio.json`
4. Refresh the Portfolio Explorer to see the restored data

### Recovering Rename History

1. Navigate to `.portfolio-insight/backup/renames/{oldName-newName}/`
2. Copy the backed-up update files to the `AssetUpdates/` folder
3. Manually edit the files to restore the original asset names if needed
4. Refresh the Portfolio Explorer to see the restored update history

## Best Practices

1. **Regular Cleanup**: Periodically review and clean up old backup files to save disk space
2. **External Backups**: Consider creating additional backups of your entire workspace for extra safety
3. **Test Recovery**: Occasionally test the recovery process to ensure you understand how to restore data if needed

This centralized backup system provides peace of mind while working with your investment portfolio data, ensuring that changes and operations are always safely backed up and recoverable.
