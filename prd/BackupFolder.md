# Feature Description 

- Today, the backup files for portfolio.json and rename backup are under their corresponding folder which is very confusing and hard to manage.
- The feature aims to centralize where the backup files should be stored.
- All the backup files should be stored in .portfolio-insight/backup
    - portfolio.json backups will be stored in .portfolio-insight/backup/portfolio
    - renames will be stored in .portfolio-insight/backup/renames
        - Each rename operation will stil have its own folder for all the portfolio-updates file.
        - The folder name should be improved to "olderName-newName-timestamp"

# Implementation Status

✅ **COMPLETED** - The centralized backup folder feature has been implemented with the following changes:

## Changes Made

### 1. PortfolioDataStore.ts Updates
- Added `createPortfolioBackup()` method for centralized portfolio.json backups
- Added `createRenameBackupFolder()` method for centralized rename operation backups
- Modified existing backup logic to use the new centralized structure
- Improved folder naming for rename operations to use "oldName-newName-timestamp" format for unique identification
- Maintained backward compatibility with existing `createBackupFolder()` method

### 2. Backup Folder Structure
- Portfolio backups: `.portfolio-insight/backup/portfolio/portfolio-backup-{timestamp}.json`
- Rename backups: `.portfolio-insight/backup/renames/{oldName-newName}/`
- Automatic timestamp disambiguation for duplicate backup folder names

### 3. Test Coverage
- Created comprehensive test suite in `assetRename.test.ts`
- Tests cover portfolio backup creation, rename backup creation, and edge cases
- Updated `testSimpleLayout` folder with sample backup structure

### 4. Backward Compatibility
- Existing backup functionality continues to work
- Graceful handling of non-existent assets during rename operations
- Proper UTF-8 encoding support for Unicode characters in folder names