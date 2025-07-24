# Enhanced Virtual Tags Implementation

## Overview
This document describes the enhanced virtual tags feature that adds both account names and asset full names as virtual tags for improved category filtering capabilities.

## Implementation Details

### Virtual Tags Behavior
The `virtualTags` getter in the Asset class now returns:
- **For standalone assets**: `[fullName]` (e.g., `["StockAward"]`)
- **For account assets**: `[accountName, fullName]` (e.g., `["招行", "招行.活期"]`)

### Benefits

#### 1. Account-Level Filtering
Users can create categories that filter by account name:
```json
{
  "name": "招行资产",
  "tags": ["招行"]
}
```
This will automatically include all assets from the 招行 account.

#### 2. Precise Asset Targeting
Users can create categories for specific assets:
```json
{
  "name": "活期存款",
  "tags": ["招行.活期", "工行.活期"]
}
```
This enables precise targeting without requiring manual tag maintenance.

#### 3. Hierarchical Organization
The combination enables both broad and specific filtering:
- Broad: Filter by account (`"招行"`)
- Specific: Filter by exact asset (`"招行.活期"`)

### Code Changes

#### Asset.ts
```typescript
get virtualTags(): string[] {
    const virtualTags: string[] = [];
    
    // Add account name as virtual tag if asset belongs to an account
    if (this.account) {
        virtualTags.push(this.account);
    }

    // Add full name as virtual tag for all assets
    virtualTags.push(this.fullName);
    
    return virtualTags;
}
```

#### Test Updates
Tests updated to expect:
- Standalone assets: `virtualTags = [assetName]`
- Account assets: `virtualTags = [accountName, fullAssetName]`

### Use Cases

1. **Account Portfolio View**: Show all assets in a specific account
2. **Asset-Specific Categories**: Target individual assets without manual tagging
3. **Flexible Category Rules**: Mix user tags with system-generated tags
4. **Automated Organization**: System maintains tags automatically as assets are added/moved

### Backward Compatibility
- User-defined tags remain unchanged
- Existing categories continue to work
- New virtual tags are additive, not replacing existing functionality

## Testing
All tests pass with the enhanced virtual tag implementation, confirming:
- Correct tag separation (user vs virtual)
- Proper sorting in `allTags`
- Category filtering works with virtual tags
- Persistence only affects user tags
