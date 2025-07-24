# Feature Description
- Add account name and asset full name as virtual tags that can be used in category selection.
- The tags from account name and full name should not be persisted to portfolio.json

# Design Hint
- Change the tag getter on Asset class
    - Split it into allTags (getter) userTags (getter) and virtualTags (getter)
    - virtualTags are for those tags that not explicted defined by user and not persisted in portfolio.json
    - userTags are those from user and should be read from and write into portfolio.json
    - allTags are union of virtualTags and userTags.
- In the assetEditorView, you should use userTags.
- In the category selection, you should use allTags.

# Implementation Clarifications

## Data Access Layer Architecture
- PortfolioDataAccess should only handle user-defined tags (persistent data)
- Virtual tags like account names and asset full names are computed at the Asset level
- Removed `getAllTags()` from PortfolioDataAccess, only `getUserTags()` remains
- This maintains clear separation between persistent and computed data

## Asset Class Implementation
- `userTags`: Returns `definition.tags` (persistent user-defined tags)
- `virtualTags`: Returns `[accountName, fullName]` for account assets, `[fullName]` for standalone assets  
- `allTags`: Returns sorted union of userTags and virtualTags
- Removed backward-compatible `tags` getter to enforce explicit usage

## Category Selection
- Categories use `asset.allTags` for filtering to include both user and virtual tags
- This allows account names and asset full names to be used as category selection criteria

## Asset Editing
- Asset definition editor only handles `userTags` 
- Virtual tags are read-only and computed, not editable by users
- UI simplified to remove unnecessary virtual tag handling

## Tree View Display
- Tag collection displays only user-defined tags (via `getUserTags()`)
- Virtual tags appear in category filtering but not in the tags tree
- This prevents confusion about which tags are user-editable

## Virtual Tag Benefits
- **Account Name Tag**: Enables filtering assets by account (e.g., "show all assets in 招行 account")
- **Full Name Tag**: Enables precise asset targeting in categories (e.g., "招行.活期" specific filtering)
- Both tags enable more flexible category definitions without requiring users to manually maintain these system-generated tags