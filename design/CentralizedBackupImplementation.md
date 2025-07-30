# Centralized Backup Folder Implementation Design

## Overview

This document describes the implementation of the centralized backup folder feature that consolidates all backup operations under a unified `.portfolio-insight/backup/` structure.

## Problem Statement

Previously, backup files were scattered across different locations:
- Portfolio.json backups were stored in the `Assets/` folder alongside the main files
- Asset rename backups were stored in ad-hoc folders with unclear naming conventions
- This made backup management confusing and difficult to maintain

## Solution Design

### 1. Centralized Folder Structure

```
.portfolio-insight/
└── backup/
    ├── portfolio/                    # Regular portfolio.json backups
    │   └── portfolio-backup-{timestamp}.json
    └── renames/                     # Asset rename operation backups
        └── {oldName-newName-timestamp}/
            ├── portfolio.json       # Portfolio state before rename (no timestamp)
            └── *.json              # Asset update files that referenced the renamed asset
```

### 2. Implementation Architecture

#### Core Components Modified

1. **PortfolioDataStore.ts**
   - `savePortfolioData()`: Extended to accept optional custom backup folder
   - `createPortfolioBackup()`: Creates timestamped backups in portfolio folder
   - `createPortfolioBackupToFolder()`: Creates non-timestamped backups in custom folders
   - `renameAssetInAllFiles()`: Returns backup folder path for coordination
   - `createRenameBackupFolder()`: Creates rename-specific backup folders

2. **PortfolioDataAccess.ts**
   - `savePortfolioData()`: Extended to pass through custom backup folder parameter
   - `renameAsset()`: Coordinates between file updates and portfolio saves

#### Key Design Decisions

1. **Backup Location Strategy**
   - **Regular saves**: Portfolio.json backups go to `backup/portfolio/` with timestamps
   - **Rename operations**: If asset update files are affected, portfolio.json backup goes to the rename folder without timestamp
   - **Rename operations (no files affected)**: Portfolio.json backup goes to `backup/portfolio/` with timestamp

2. **Naming Conventions**
   - Rename folders: `{oldName-newName-timestamp}` format for uniqueness and chronological ordering
   - Portfolio backups: `portfolio-backup-{timestamp}.json` for chronological ordering
   - Rename portfolio backups: `portfolio.json` (no timestamp needed as it's operation-specific)

3. **Conflict Resolution**
   - Automatic timestamp suffix addition when backup folders already exist
   - UTF-8 encoding support for Unicode asset names
   - Atomic operations to prevent partial backup states

## Implementation Details

### Method Flow for Regular Portfolio Save

```
savePortfolioData(data) 
  → Check if portfolio.json exists
  → If exists: createPortfolioBackup(file, timestamp)
  → Save new portfolio.json
```

### Method Flow for Asset Rename

```
renameAsset(oldName, newName)
  → renameAssetInAllFiles(oldFullName, newFullName)
    → Find files referencing asset
    → If files found:
      → createRenameBackupFolder(oldName-newName-timestamp)
      → Backup affected files
      → Update files
      → Return backup folder path
    → Else: Return undefined
  → Update asset name in portfolio data
  → savePortfolioData(data, renameBackupFolder)
    → If renameBackupFolder provided:
      → createPortfolioBackupToFolder(file, renameBackupFolder)
    → Else:
      → createPortfolioBackup(file, timestamp)
```

### File Organization Logic

#### Portfolio Backup Files
- **Location**: `.portfolio-insight/backup/portfolio/`
- **Trigger**: Any portfolio.json save when file already exists AND no custom backup folder specified
- **Content**: Complete portfolio.json snapshot
- **Naming**: `portfolio-backup-{ISO-timestamp}.json`

#### Rename Backup Files
- **Location**: `.portfolio-insight/backup/renames/{oldName-newName-timestamp}/`
- **Trigger**: Asset rename when portfolio update files reference the asset
- **Content**: 
  - `portfolio.json`: Portfolio state before rename (no timestamp)
  - `portfolio-update-*.json`: All update files that referenced the renamed asset
- **Naming**: Folder uses `oldName-newName-timestamp` format, files keep original names

## Testing Strategy

### Test Coverage Areas

1. **Portfolio Backup Creation**
   - Verify centralized folder structure creation
   - Test timestamp-based naming
   - Validate backup content accuracy

2. **Rename Backup Creation**
   - Test `oldName-newName-timestamp` folder naming
   - Verify selective file backup (only affected files)
   - Test portfolio.json inclusion in rename folder

3. **Edge Cases**
   - Rename with no affected files (portfolio backup goes to general folder)
   - Duplicate folder name handling with timestamps
   - Unicode character support in asset names

4. **Integration Testing**
   - End-to-end rename operations through PortfolioDataAccess
   - Coordination between file updates and portfolio saves
   - Cache invalidation and data consistency

### Sample Test Data

Updated `test/testAssets/testSimpleLayout/` with:
- Sample portfolio backup in `.portfolio-insight/backup/portfolio/`
- Sample rename backup in `.portfolio-insight/backup/renames/富国信用债-长期混合基金-2025-01-15T10-30-00/`
- Demonstrates both timestamped and non-timestamped backup strategies

## Backward Compatibility

### Legacy Support
- Existing `createBackupFolder()` method retained with deprecation warning
- Old backup files remain in their original locations (not migrated)
- All existing functionality continues to work without modification

### Migration Strategy
- No automatic migration of existing backups (to avoid data loss risk)
- New backups use the centralized structure
- Users can manually consolidate old backups if desired

## Performance Considerations

### Optimization Features
1. **Selective Backup**: Only backup files that actually reference renamed assets
2. **Lazy Folder Creation**: Backup folders created only when needed
3. **Atomic Operations**: Single file copy operations, no intermediate states

### Resource Impact
- Minimal memory footprint (no in-memory backup storage)
- Fast backup operations (simple file copy)
- Efficient folder structure (hierarchical organization)

## Security and Reliability

### Data Protection
- All backup operations use atomic file operations
- UTF-8 encoding preservation for international characters
- Automatic conflict resolution prevents data overwrites

### Error Handling
- Graceful degradation when backup folders can't be created
- Comprehensive error logging for troubleshooting
- Transaction-like behavior (complete success or complete rollback)

## Future Enhancement Opportunities

### Potential Improvements
1. **Backup Cleanup**: Automatic removal of old backups based on retention policies
2. **Backup Compression**: Optional ZIP compression for space efficiency
3. **Backup Metadata**: JSON manifest files with operation details and timestamps
4. **Migration Tools**: Utilities to consolidate legacy backup files

### Extension Points
- Plugin architecture for custom backup strategies
- Integration with external backup services
- Backup notification and monitoring features

## Conclusion

The centralized backup implementation provides a clean, organized, and efficient backup solution that addresses the previous scattered backup file issues while maintaining full backward compatibility and adding enhanced functionality for rename operations.
