# Centralized Backup Feature User Guide

## Overview

The VSCode Portfolio Insight extension now features a centralized backup system that organizes all backup files in a clear, hierarchical structure under `.portfolio-insight/backup/`.

## Backup Structure

All backup files are now stored in the `.portfolio-insight/backup/` folder with the following organization:

```
.portfolio-insight/
└── backup/
    ├── portfolio/          # Regular portfolio.json backups
    └── renames/           # Asset rename operation backups
        └── {oldName-newName-timestamp}/
            ├── portfolio.json              # Portfolio state before rename
            └── portfolio-update-*.json     # Asset update files before rename
```

## Backup Types

### 1. Portfolio Backups (`backup/portfolio/`)

**When created:**
- Every time you save changes to your portfolio definition through the Asset Definition Editor
- Before overwriting the existing `portfolio.json` file

**Naming convention:**
- `portfolio-backup-{timestamp}.json`
- Example: `portfolio-backup-2025-01-15T10-30-00.json`

**What's backed up:**
- The complete portfolio.json file including all asset definitions and account structures

### 2. Rename Operation Backups (`backup/renames/`)

**When created:**
- When you rename an asset that is referenced in existing portfolio update files
- Includes both the portfolio definition and all affected update files

**Naming convention:**
- Folder: `{oldAssetName-newAssetName-timestamp}/`
- Files: `portfolio.json` and original `portfolio-update-*.json` files
- Example folder: `富国信用债-长期混合基金-2025-01-15T10-30-00/`

**What's backed up:**
- `portfolio.json`: The portfolio definition before the rename operation (without timestamp)
- All portfolio update files that contained references to the renamed asset

## Key Benefits

### 1. **Centralized Organization**
- All backups are in one location: `.portfolio-insight/backup/`
- No more scattered backup files in different folders
- Easy to locate and manage backup files

### 2. **Clear Naming Convention**
- Rename backups use descriptive `oldName-newName-timestamp` format for unique identification
- Portfolio backups include timestamps for easy identification
- Folders are automatically organized by operation type

### 3. **Selective Backup Strategy**
- Rename operations only backup files that actually reference the renamed asset
- Reduces backup size and clutter
- Portfolio.json backups during rename operations are stored with the rename backup (not in the general portfolio backup folder)

### 4. **Automatic Conflict Resolution**
- If a backup folder already exists, a timestamp is automatically added
- No risk of overwriting existing backups
- All backup operations are safe and non-destructive

## Usage Examples

### Example 1: Regular Portfolio Save
When you save portfolio changes through the Asset Definition Editor:

```
Before: Assets/portfolio.json exists
Action: Save portfolio changes
Result: .portfolio-insight/backup/portfolio/portfolio-backup-2025-01-15T10-30-00.json
```

### Example 2: Asset Rename Operation
When you rename "股票基金" to "指数基金":

```
Before: AssetUpdates/portfolio-update-2025-01-10.json references "股票基金"
Action: Rename "股票基金" to "指数基金"
Result: 
  .portfolio-insight/backup/renames/股票基金-指数基金-2025-01-15T10-30-00/
    ├── portfolio.json                    # Portfolio state before rename
    └── portfolio-update-2025-01-10.json  # Original update file
```

### Example 3: Rename with No References
When you rename an asset that isn't referenced in any update files:

```
Before: No portfolio update files reference "未使用资产"
Action: Rename "未使用资产" to "新资产"
Result: 
  .portfolio-insight/backup/portfolio/portfolio-backup-2025-01-15T10-35-00.json
  (Only portfolio.json is backed up to the general backup folder)
```

## Best Practices

### 1. **Regular Cleanup**
- Periodically review and clean up old backup files
- Keep recent backups for safety, archive or delete older ones
- The `.portfolio-insight` folder can be added to `.gitignore` if desired

### 2. **Backup Before Major Changes**
- The extension automatically creates backups, but you can manually copy files for extra safety
- Consider creating manual snapshots before bulk operations

### 3. **Understanding Backup Triggers**
- Portfolio backups: Created when portfolio.json already exists and you save changes
- Rename backups: Created only when the renamed asset has references in update files
- First-time portfolio saves don't create backups (no existing file to backup)

## Recovery Procedures

### Restoring from Portfolio Backup
1. Navigate to `.portfolio-insight/backup/portfolio/`
2. Find the appropriate backup file by timestamp
3. Copy the backup file to `Assets/portfolio.json`
4. Refresh the Portfolio Explorer

### Restoring from Rename Backup
1. Navigate to `.portfolio-insight/backup/renames/{oldName-newName-timestamp}/`
2. Copy `portfolio.json` to `Assets/portfolio.json`
3. Copy the portfolio update files back to `AssetUpdates/`
4. Refresh the Portfolio Explorer

## Technical Notes

- All backup operations preserve UTF-8 encoding for Unicode characters (Chinese, etc.)
- Backup folders are created with proper permissions and recursive directory creation
- The system automatically handles timestamp conflicts and folder naming collisions
- Backup operations are atomic and don't interfere with normal extension operation
