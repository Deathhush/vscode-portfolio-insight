# Tags Feature Implementation

This document describes the implementation of the tagging feature for assets in the VS Code Portfolio Insight extension.

## Overview

The tagging feature allows users to add, remove, and manage tags for their assets through the Asset Definition Editor. Tags help organize and categorize assets for better portfolio management.

## Architecture

### PortfolioDataAccess Class

A new `PortfolioDataAccess` class has been introduced that serves as a bridge between the on-disk store (`PortfolioDataStore`) and in-memory structures (`Asset`). This class provides:

- **Asset caching**: Manages cached Asset instances to avoid recreating them
- **Tag management**: Provides `getAllTags()` method to retrieve all unique tags from the portfolio
- **Cache invalidation**: Coordinates cache invalidation between different layers
- **Event handling**: Fires events when portfolio data is updated

### Updated Data Interfaces

The `AssetDefinitionData` interface now includes an optional `tags` property:

```typescript
export interface AssetDefinitionData {
    name: string;
    type: 'simple' | 'investment' | 'composite' | 'stock';
    currency?: string;
    tags?: string[];
}
```

### UI Implementation

The Asset Definition Editor webview has been enhanced with a **clean separate-row tag interface**:

- **Dedicated tag rows**: Each asset has a separate row below it dedicated to tags, maintaining perfect column alignment
- **Input-first layout**: The tag input field appears first in the row, followed by existing tags
- **Spanning design**: Tag rows span all columns providing maximum space for tag management
- **Visual separation**: Tag rows have a subtle background color to distinguish them from asset rows
- **Compact tag chips**: Tags appear as small, rounded badges with gradient backgrounds and hover effects
- **Intuitive editing**: Type in the input field and click "Add" or press Enter to add tags, click "×" to remove them
- **Smart suggestions**: Dropdown shows available tags when typing or focusing the input field
- **Responsive design**: Layout adapts to smaller screens with vertical stacking for mobile devices

#### Key UI Features:

1. **Perfect Alignment**: Asset data (name, type, currency, actions) remain perfectly aligned in their columns
2. **Dedicated Space**: Tags get their own row with full width, preventing table from becoming too wide
3. **Input-First Design**: Tag input is prominently placed at the beginning of each tag row for immediate access
4. **Visual Hierarchy**: Clear separation between asset data and tag management
5. **Scalable Layout**: Can accommodate many tags without breaking the table layout
6. **Mobile-Friendly**: On small screens, tag input and tags stack vertically for better usability

## Features

### Adding Tags

Users can add tags in two ways:

1. **Manual entry**: Type a tag name and click "Add" or press Enter
2. **From suggestions**: Select from existing tags in the dropdown

### Removing Tags

Click the "×" button on any tag chip to remove it from the asset.

### Tag Suggestions

The system provides intelligent tag suggestions by:

- Showing all existing tags when the input field is focused
- Filtering suggestions based on typed text
- Excluding tags already assigned to the current asset

### Data Persistence

Tags are saved to the `portfolio.json` file along with other asset data:

```json
{
    "assets": [
        {
            "name": "招行.活期",
            "type": "simple",
            "tags": ["现金", "活钱"]
        }
    ]
}
```

## Technical Details

### Message Flow

1. **GET_ALL_TAGS**: Webview requests all available tags from the extension
2. **ALL_TAGS**: Extension responds with array of unique tags
3. **ASSET_DEFINITION_SUBMIT**: Webview sends updated asset data including tags

### Caching Strategy

- **Asset cache**: Maintained in `PortfolioDataAccess`
- **Tags cache**: Unique tags are cached and updated when portfolio data changes
- **Cache invalidation**: All caches are invalidated when portfolio data is saved

### Error Handling

- Invalid or empty tags are filtered out
- Duplicate tags are prevented at the UI level
- Graceful fallback when tag data is unavailable

## Usage

1. Open the Asset Definition Editor from the Portfolio Explorer
2. For each asset, use the Tags column to manage tags
3. Add tags by typing in the input field or selecting from suggestions
4. Remove tags by clicking the × button on tag chips
5. Save changes to persist tags to the portfolio file

## Future Enhancements

- Tag-based filtering in the Portfolio Explorer
- Tag statistics and analytics
- Bulk tag operations
- Tag color coding or categories
