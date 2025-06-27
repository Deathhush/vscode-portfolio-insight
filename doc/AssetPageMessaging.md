# Asset Page Messaging Documentation

This document describes the message communication protocol between the Asset Page HTML interface and the AssetPageView TypeScript backend.

## Message Flow Overview

The Asset Page uses VS Code's webview messaging system to communicate between the frontend (HTML) and backend (TypeScript). Messages are sent using `vscode.postMessage()` from the frontend and `webview.postMessage()` from the backend.

## Frontend → Backend Messages (HTML → TypeScript)

### 1. REFRESH_DATA
**Purpose**: Request fresh asset data from the backend  
**Payload**: None  
**Trigger**: Automatically sent after activities are saved to refresh the display  

```javascript
vscode.postMessage({ type: 'REFRESH_DATA' });
```

### 2. GET_ALL_ASSETS
**Purpose**: Request list of all assets for populating transfer dropdowns  
**Payload**: None  
**Trigger**: When user selects transfer_in or transfer_out activity type  

```javascript
vscode.postMessage({ type: 'GET_ALL_ASSETS' });
```

### 3. SAVE_ACTIVITIES
**Purpose**: Save all pending activities to portfolio update files  
**Payload**: Array of activity objects  
**Trigger**: When user clicks "Save Activities" button  

```javascript
vscode.postMessage({
    type: 'SAVE_ACTIVITIES',
    data: [
        {
            type: 'snapshot',
            date: '2025-06-27',
            description: 'Monthly update',
            currentValue: 10000
        },
        // ... more activities
    ]
});
```

## Backend → Frontend Messages (TypeScript → HTML)

### 1. ASSET_DATA
**Purpose**: Provide complete asset information and activities  
**Payload**: Asset summary object  
**Trigger**: On initial load and after data refresh  

```typescript
{
    type: 'ASSET_DATA',
    data: {
        definition: {
            name: 'Asset Name',
            type: 'simple' | 'investment' | 'composite' | 'stock'
        },
        currentValue: {
            currentValue: 10000,
            currency: 'CNY',
            valueInCNY: 10000,
            lastUpdateDate: '2025-06-27'
        },
        activities: [...],
        lastMonthIncome?: 500  // Only for simple assets
    }
}
```

### 2. ERROR
**Purpose**: Notify frontend of error states  
**Payload**: Error details object  
**Trigger**: When asset data cannot be loaded  

```typescript
{
    type: 'ERROR',
    data: {
        message: 'Failed to load asset data: Error details',
        assetName: 'Asset Name'
    }
}
```

### 3. ALL_ASSETS
**Purpose**: Provide list of all assets for transfer operations  
**Payload**: Array of asset objects  
**Trigger**: In response to GET_ALL_ASSETS request  

```typescript
{
    type: 'ALL_ASSETS',
    data: [
        {
            name: 'Asset 1',
            type: 'simple'
        },
        {
            name: 'Asset 2',
            type: 'investment'
        }
        // ... more assets
    ]
}
```

### 4. ACTIVITIES_SAVED
**Purpose**: Confirm successful save of activities  
**Payload**: None  
**Trigger**: After activities are successfully saved to portfolio update files  

```typescript
{
    type: 'ACTIVITIES_SAVED'
}
```

### 5. SAVE_ERROR
**Purpose**: Indicate error during save operation  
**Payload**: Error message string  
**Trigger**: When saving activities fails  

```typescript
{
    type: 'SAVE_ERROR',
    data: 'Error message describing what went wrong'
}
```

## Activity Data Structure

Activities sent in the SAVE_ACTIVITIES message follow this structure:

### Common Fields
- `type`: Activity type ('snapshot', 'income', 'expense', 'transfer_in', 'transfer_out')
- `date`: ISO date string (YYYY-MM-DD)
- `description`: Optional description string

### Snapshot Activities
Additional fields based on asset type:
- **Simple/Investment**: `currentValue` (number)
- **Composite**: `currentValue` (number), optional `marketValue` (number)
- **Stock**: `shares` (number), `price` (number)

### Income/Expense Activities
- `amount`: Monetary amount (number)

### Transfer Activities
- `amount`: Transfer amount (number)
- `relatedAsset`: Name of the related asset (string)

## Message Handling Flow

### Adding New Activities
1. User fills out activity form in HTML
2. Frontend validates form data
3. Activity is added to `pendingActivities` array (local state)
4. UI updates to show pending activity with "NEW" indicator
5. Save button becomes visible
6. When user clicks save, SAVE_ACTIVITIES message is sent
7. Backend processes and saves activities
8. Backend responds with ACTIVITIES_SAVED or SAVE_ERROR
9. On success, frontend clears pending activities and refreshes data

### Data Refresh Cycle
1. Frontend sends REFRESH_DATA message
2. Backend invalidates cache and reloads asset data
3. Backend sends ASSET_DATA message with fresh data
4. Frontend updates display with new information

## Error Handling

- All message handlers include try-catch blocks
- Errors are logged to console and shown to user via VS Code notifications
- Frontend shows inline error messages for validation failures
- Backend errors are communicated via ERROR or SAVE_ERROR messages

## State Management

### Frontend State
- `currentAsset`: Current asset definition for form validation
- `pendingActivities`: Activities waiting to be saved
- `lastLoadedActivities`: Last activities received from backend
- `allAssets`: List of all assets for transfer dropdowns

### Backend State
- Asset data is managed by the Asset class
- Data store handles persistence to portfolio update files
- Webview panel maintains connection to frontend

## Message Security

- All messages are validated for required fields
- Form validation prevents invalid data from being sent
- Backend performs additional validation before saving
- Asset type restrictions are enforced (e.g., income/expense only for simple assets)
