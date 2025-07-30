# Asset Value History Implementation Design

## Overview
This document details the implementation of the Asset Value in Range feature, which enhances the asset page chart to show value changes based on all activities (not just snapshots) and provides rich tooltip information when hovering over chart points.

## Backend Implementation

### New Data Structures

#### AssetDailyRecordData Interface
```typescript
export interface AssetDailyRecordData {
    date: string;
    currentValue: AssetNetValueData;
    activities: AssetActivityData[];
}
```

#### Enhanced AssetSummaryData
```typescript
export interface AssetSummaryData {
    definition: AssetDefinitionData;
    account?: string;
    currentValue: AssetNetValueData;
    lastMonthIncome?: number;
    activities: AssetActivityData[];
    valueHistory: AssetDailyRecordData[]; // ✅ New field
}
```

### Core Algorithm: calculateValueHistory()

**Key Design Principles:**
- **Sequential Processing**: Process activities one by one in chronological order
- **Date Change Detection**: Save value history entry when date changes
- **Running Value Calculation**: Maintain cumulative effect throughout processing

**Implementation Details:**
1. **Input**: Sorted activities (most recent first)
2. **Process**: Reverse to chronological order (oldest first)
3. **Algorithm**:
   - Track current date and running value
   - For each activity:
     - If date changes: save previous date's value history entry
     - Apply activity effect to running value
     - Add activity to current day's activity list
   - Save final date's value history entry

**Activity Effects:**
- `snapshot`: Set absolute value (`runningValue = activity.totalValue`)
- `income`, `transfer_in`, `buy`: Add value (`runningValue += activity.totalValue`)
- `expense`, `transfer_out`, `sell`: Subtract value (`runningValue -= activity.totalValue`)

### Currency Conversion
- Applied at each date for historical accuracy
- Uses exchange rates closest to the target date
- Fallback to raw value if conversion fails

### Helper Method: saveValueHistoryEntry()
Extracted for code reusability:
- Handles currency conversion
- Creates value history entry with proper structure
- Maintains immutable activity arrays

## Frontend Implementation

### Chart Data Pipeline
1. **Data Source**: `message.data.valueHistory` (instead of activities)
2. **Processing**: `processValueHistoryForChart()` converts value history to chart points
3. **Rendering**: Chart.js displays with enhanced tooltips

### Enhanced Tooltips

#### Tooltip Configuration
```javascript
tooltip: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    maxWidth: 400,
    padding: 16,
    // Enhanced styling for larger content
}
```

#### Tooltip Content Structure
1. **Title**: Formatted date (e.g., "Mon, Jul 30, 2025")
2. **Main Label**: Asset value with currency formatting
3. **Activity Details** (via `afterLabel`):
   - "Activities on this date:" header
   - Up to 5 activities with formatting:
     - Activity type and value with +/- indicators
     - Related asset information
     - Descriptions when available
   - Count indicator for additional activities

#### Activity Formatting
- **Income/Transfer In/Buy**: `+$1,234.56 (from RelatedAsset)`
- **Expense/Transfer Out/Sell**: `-$1,234.56 (to RelatedAsset)`
- **Snapshot**: `$1,234.56` (no prefix)

### Chart Point Processing
```javascript
function processValueHistoryForChart(valueHistory) {
    return valueHistory.map(entry => ({
        x: new Date(entry.date).getTime(),
        y: entry.currentValue.currentValue,
        isValueHistory: true,
        entry: entry // Store for tooltip access
    }));
}
```

## User Experience Improvements

### Before vs After

**Before:**
- Chart showed only snapshot points
- Limited tooltip information
- Sparse data points led to unclear value progression

**After:**
- Chart shows value for every day with activities
- Rich tooltips with complete activity context
- Smooth value progression with proper granularity
- Users can understand exactly what caused value changes

### Interaction Design
- **Hover**: Rich tooltip with activity details
- **Visual Feedback**: Consistent point styling with enhanced hover states
- **Information Hierarchy**: Date → Value → Activities → Details

## Technical Considerations

### Performance
- ✅ **Efficient Processing**: Single pass through activities
- ✅ **Memory Management**: Immutable data structures prevent side effects
- ✅ **Tooltip Optimization**: Limited to 5 activities to prevent overwhelming UI

### Backward Compatibility
- ✅ **Legacy Support**: `processActivitiesForChart()` maintained for compatibility
- ✅ **Graceful Degradation**: Falls back to snapshot-only chart if no value history

### Error Handling
- ✅ **Currency Conversion**: Graceful fallback on conversion errors
- ✅ **Data Validation**: Handles empty activities and missing data
- ✅ **UI Resilience**: Chart displays even with incomplete data

## Testing Strategy

### Backend Testing
- ✅ Unit tests for `calculateValueHistory()` with various activity sequences
- ✅ Currency conversion edge cases
- ✅ Date boundary handling

### Frontend Testing
- ✅ Chart rendering with value history data
- ✅ Tooltip content verification
- ✅ Period filtering functionality

### Integration Testing
- ✅ End-to-end asset page rendering
- ✅ Data flow from backend to frontend
- ✅ Cross-browser tooltip compatibility

## Future Enhancements

### Potential Improvements
- Activity filtering in tooltips (show only specific types)
- Configurable tooltip detail level
- Chart annotations for significant value changes
- Export functionality for value history data

### Scalability Considerations
- Pagination for assets with extensive activity history
- Lazy loading for large date ranges
- Caching strategies for frequently accessed value histories

## Conclusion

The Asset Value History implementation provides a comprehensive solution for visualizing asset value changes over time. By processing all activities (not just snapshots) and providing rich contextual information through enhanced tooltips, users gain deep insights into their asset performance and the factors driving value changes.

The sequential processing approach ensures accurate value calculations while maintaining good performance, and the enhanced UI provides an intuitive way to explore historical asset data.
