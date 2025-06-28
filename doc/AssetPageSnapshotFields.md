# Asset Page Activity Type and Fields Feature

## Overview

The Asset Page now displays different activity types and fields in the "Add Activity" modal based on the current asset's type. This provides a more streamlined and relevant user experience when adding activities.

## Activity Type Availability by Asset Type

### All Asset Types
- **Snapshot**: Available for all asset types (default selection)
- **Transfer In/Out**: Available for all asset types

### Simple Assets Only
- **Income**: Only available for simple assets
- **Expense**: Only available for simple assets

## Field Mapping by Asset Type

### Simple Assets
- **Snapshot Fields**: Current Value (required)
- **Income/Expense Fields**: Amount (required)
- **Transfer Fields**: Amount + Related Asset (both required)
- **Description**: Simple assets track monetary value and cash flows
- **Example**: Savings accounts, checking accounts

```
Activity Type Options: Snapshot*, Income, Expense, Transfer In, Transfer Out
(*default selection)

Snapshot Details
Fields shown are specific to the asset type (simple).

┌─────────────────────────────────┐
│ Current Value *                 │
│ [        0.00        ]          │
└─────────────────────────────────┘
```

### Investment Assets
- **Snapshot Fields**: Current Value (required)
- **Transfer Fields**: Amount + Related Asset (both required)
- **Description**: Investment assets track their current market value
- **Example**: Mutual funds, ETFs, investment accounts

```
Activity Type Options: Snapshot*, Transfer In, Transfer Out
(*default selection)

Snapshot Details
Fields shown are specific to the asset type (investment).

┌─────────────────────────────────┐
│ Current Value *                 │
│ [        0.00        ]          │
└─────────────────────────────────┘
```

### Composite Assets
- **Snapshot Fields**: Current Value (required), Market Value (optional)
- **Transfer Fields**: Amount + Related Asset (both required)
- **Description**: Composite assets can track both current value and market value
- **Example**: Asset portfolios, complex financial products

```
Activity Type Options: Snapshot*, Transfer In, Transfer Out
(*default selection)

Snapshot Details
Fields shown are specific to the asset type (composite).

┌─────────────────────────────────┐ ┌─────────────────────────────────┐
│ Current Value *                 │ │ Market Value (optional)         │
│ [        0.00        ]          │ │ [        0.00        ]          │
└─────────────────────────────────┘ └─────────────────────────────────┘
```

### Stock Assets
- **Snapshot Fields**: Shares/Units (required), Price per Share (required)
- **Transfer Fields**: Amount + Related Asset (both required)
- **Description**: Stock assets track quantity and price separately
- **Example**: Individual stocks, stock awards

```
Activity Type Options: Snapshot*, Transfer In, Transfer Out
(*default selection)

Snapshot Details
Fields shown are specific to the asset type (stock).

┌─────────────────────────────────┐ ┌─────────────────────────────────┐
│ Shares/Units *                  │ │ Price per Share *               │
│ [        0.00        ]          │ │ [        0.00        ]          │
└─────────────────────────────────┘ └─────────────────────────────────┘
```

## Technical Implementation

### Dynamic Activity Type Population
The system populates appropriate activity types using the `populateActivityTypeOptions()` function based on the current asset's type:

```javascript
function populateActivityTypeOptions() {
    let optionsHtml = '<option value="snapshot">Snapshot (Current Value)</option>';
    
    // Income and Expense are only available for simple assets
    if (currentAsset && currentAsset.type === 'simple') {
        optionsHtml += '<option value="income">Income</option>';
        optionsHtml += '<option value="expense">Expense</option>';
    }
    
    // Transfer options are available for all asset types
    optionsHtml += '<option value="transfer_in">Transfer In</option>';
    optionsHtml += '<option value="transfer_out">Transfer Out</option>';
    
    // Default to snapshot
    activityTypeSelect.value = 'snapshot';
}
```

### Dynamic Field Generation
The system generates appropriate fields using the `generateSnapshotFields()` function based on the current asset's type:

```javascript
function generateSnapshotFields(assetType) {
    switch (assetType) {
        case 'simple':
        case 'investment':
            // Show only Current Value field
            break;
        case 'composite':
            // Show Current Value + Market Value fields
            break;
        case 'stock':
            // Show Shares + Price fields
            break;
    }
}
```

### Asset Type Detection
The current asset information is stored when the asset page loads:

```javascript
function updateAssetDisplay(assetSummary) {
    // Store current asset information for later use
    currentAsset = assetSummary.definition;
    // ... other display logic
}
```

### Validation Logic
Each asset type has specific validation rules:

- **Simple/Investment**: Requires valid current value > 0
- **Composite**: Requires valid current value > 0, optional market value ≥ 0
- **Stock**: Requires valid shares > 0 and price > 0

## User Experience Benefits

1. **Intelligent Defaults**: Snapshot is pre-selected as the most common activity type
2. **Context-Aware Options**: Users only see activity types relevant to their asset type
3. **Reduced Complexity**: Irrelevant options (Income/Expense for non-simple assets) are hidden
4. **Clear Requirements**: Required fields are marked with asterisks (*)
5. **Type Awareness**: The modal shows which asset type the fields are for
6. **Validation Feedback**: Specific error messages for each field type and asset type restrictions
7. **Consistent Behavior**: Matches the field structure used in portfolio updates

## Activity Type Rules

### Simple Assets
- ✅ **Snapshot**: Track current value
- ✅ **Income**: Record money received
- ✅ **Expense**: Record money spent  
- ✅ **Transfer In/Out**: Move money between assets

### Investment/Composite/Stock Assets
- ✅ **Snapshot**: Track current value/market data
- ❌ **Income**: Not applicable (investments don't have direct income flows)
- ❌ **Expense**: Not applicable (investments don't have direct expenses)
- ✅ **Transfer In/Out**: Move value between assets

## Backend Compatibility

The activity data structure sent to the backend varies by asset type:

### Simple Assets (with Income/Expense)
```json
{
    "type": "income",
    "date": "2025-06-27",
    "amount": 1500,
    "description": "Monthly salary"
}
```

### All Asset Types (Snapshot)
```json
{
    "type": "snapshot",
    "date": "2025-06-27",
    "currentValue": 15000,
    "description": "Monthly snapshot"
}
```

### Composite Assets
```json
{
    "type": "snapshot", 
    "date": "2025-06-27",
    "currentValue": 15000,
    "marketValue": 14500,
    "description": "Monthly snapshot"
}
```

### Stock Assets
```json
{
    "type": "snapshot",
    "date": "2025-06-27", 
    "shares": 100,
    "price": 150.50,
    "description": "Monthly snapshot"
}
```

The backend calculates the effective current value based on the asset type and provided fields.
