# Account Feature Implementation

This document describes the implementation of the account management feature for the VS Code Portfolio Insight extension.

## Overview

The account feature allows users to organize their assets into logical groupings called accounts. Each account has a type (bank, stock) and can contain multiple assets. This provides better organization and hierarchy in portfolio management.

## Architecture

### Data Model

#### AccountDefinitionData Interface
```typescript
export interface AccountDefinitionData {
    name: string;
    type: string;
    assets?: AssetDefinitionData[]; // Assets can be nested in accounts
}
```

#### Updated AssetDefinitionData Interface
```typescript
export interface AssetDefinitionData {
    name: string;
    type: 'simple' | 'investment' | 'composite' | 'stock';
    currency?: string;
    tags?: string[];
    account?: string; // Reference to account name
}
```

#### PortfolioData Structure
```typescript
export interface PortfolioData {
    assets: AssetDefinitionData[];
    accounts?: AccountDefinitionData[]; // Accounts are optional
}
```

### Business Logic Classes

#### Account Class
Located in `src/data/account.ts`, the `Account` class provides:

- **Asset Retrieval**: `getAssets()` method finds all assets belonging to the account
- **Value Calculation**: `calculateTotalValue()` computes the combined value of all assets
- **Summary Generation**: `generateSummary()` creates account summary with asset details
- **Multi-source Assets**: Supports assets referenced by account name or nested in account definition

Key methods:
```typescript
class Account {
    public async getAssets(): Promise<Asset[]>
    public async calculateTotalValue(): Promise<AssetNetValueData>
    public async generateSummary(): Promise<AccountSummaryData>
}
```

#### Updated PortfolioDataAccess
Enhanced with account management capabilities:

- **Account Creation**: `createAccount()` method with caching
- **Account Retrieval**: `getAllAccounts()` loads all accounts from portfolio data
- **Cache Management**: Separate caching for accounts to improve performance
- **Validation**: Ensures account references are valid

### Tree View Implementation

#### PortfolioNode (Root Node)
New root node that replaces the previous AssetCollectionNode as the main container:

- **Hierarchical Structure**: Shows accounts as immediate children, then standalone assets
- **Account Grouping**: Assets assigned to accounts appear under their respective account nodes
- **Standalone Assets**: Assets without accounts appear directly under the root
- **Value Aggregation**: Calculates total portfolio value across all accounts and standalone assets

#### AccountNode
Implements `PortfolioExplorerNode` interface and acts as an `AssetCollectionNode`:

- **Asset Children**: Shows all assets belonging to the account
- **Visual Representation**: Displays account name, type, and total value
- **Context Menu**: Provides account-specific actions
- **Value Display**: Shows aggregated value of all assets in the account

### UI Implementation

#### Asset Definition Editor
The Asset Definition Editor has been completely overhauled to support account management:

##### Accounts Section
- **Dedicated Table**: Clean table interface for managing accounts
- **CRUD Operations**: Create, edit, and remove accounts
- **Account Types**: Dropdown selection for account types (bank, stock)
- **Validation**: Ensures unique account names and required fields
- **Dependency Checking**: Warns when removing accounts that have assigned assets

##### Enhanced Assets Section
- **Account Assignment**: Dropdown to assign assets to accounts
- **"(No Account)" Option**: Explicit option to leave assets unassigned
- **Dynamic Updates**: Account dropdown updates when accounts are added/removed
- **Validation**: Prevents invalid account assignments

##### Unified Submission
- **PortfolioData Structure**: Always submits both assets and accounts in a unified structure
- **Data Cleaning**: Filters out empty entries and normalizes data
- **Backward Compatibility**: Maintains compatibility with existing portfolio files

#### Key UI Features

1. **Separate Sections**: Clear separation between account and asset management
2. **Live Updates**: Changes to accounts immediately reflect in asset dropdowns
3. **Validation Feedback**: Real-time validation with error messages
4. **Confirmation Dialogs**: Warns before destructive operations
5. **Responsive Design**: Works well on different screen sizes

## Implementation Details

### Data Storage
Accounts are stored in the `portfolio.json` file alongside assets:

```json
{
  "accounts": [
    {
      "name": "Main Bank",
      "type": "bank"
    }
  ],
  "assets": [
    {
      "name": "Checking Account",
      "type": "simple",
      "account": "Main Bank"
    }
  ]
}
```

### Asset-Account Relationship
- **One-to-Many**: One account can have multiple assets
- **Optional**: Assets don't require an account assignment
- **Reference-based**: Assets reference accounts by name
- **Flexible**: Both nested and reference-based asset storage supported

### Tree View Hierarchy
```
Assets (PortfolioNode)
├── Account 1 (AccountNode)
│   ├── Asset A (AssetNode)
│   └── Asset B (AssetNode)
├── Account 2 (AccountNode)
│   └── Asset C (AssetNode)
└── Standalone Asset (AssetNode)
```

### Caching Strategy
- **Account Cache**: Separate cache for Account instances
- **Asset Cache**: Maintains existing asset caching
- **Coordinated Invalidation**: Cache invalidation across accounts and assets
- **Event-driven Updates**: Cache updates trigger UI refresh

## User Workflows

### Creating an Account
1. Open Asset Definition Editor
2. Navigate to Accounts section
3. Click "Add Account"
4. Enter account name and select type
5. Save changes

### Assigning Assets to Accounts
1. Open Asset Definition Editor
2. In Assets section, select asset
3. Choose account from dropdown
4. Select "(No Account)" to unassign
5. Save changes

### Removing Accounts
1. Open Asset Definition Editor
2. In Accounts section, click "Remove" for account
3. If assets are assigned, confirm action
4. Assets become unassigned automatically
5. Save changes

## Error Handling

### Validation Rules
- **Unique Names**: Account names must be unique
- **Required Fields**: Account name and type are required
- **Valid References**: Asset account references must exist
- **Type Validation**: Account types must be from predefined list

### User Feedback
- **Real-time Validation**: Immediate feedback on invalid entries
- **Error Aggregation**: Summary of all validation errors
- **Confirmation Dialogs**: Warnings for destructive operations
- **Success Notifications**: Confirmation of successful operations

## Migration and Compatibility

### Backward Compatibility
- **Optional Accounts**: Existing portfolios without accounts continue to work
- **Graceful Degradation**: Missing account references are handled gracefully
- **Legacy Support**: Pure asset arrays are still supported in data loading

### Migration Strategy
- **Automatic Migration**: Existing portfolios automatically gain account support
- **No Data Loss**: All existing asset data is preserved
- **Incremental Adoption**: Users can gradually adopt account organization

## Testing

### Unit Tests
- Account class methods tested for correctness
- PortfolioDataAccess account operations verified
- Tree view node generation validated

### Integration Tests
- End-to-end asset-account workflows tested
- UI validation and error handling verified
- Data persistence and loading validated

### Manual Testing
- Complete user workflows tested
- Edge cases and error conditions verified
- UI responsiveness and usability confirmed

## Performance Considerations

### Caching
- **Lazy Loading**: Accounts and assets loaded on demand
- **Memory Management**: Caches can be invalidated to free memory
- **Event-driven**: Updates only trigger when necessary

### UI Optimization
- **Efficient Rendering**: Only re-render affected UI sections
- **Debounced Validation**: Validation runs after user input stabilizes
- **Progressive Enhancement**: Core functionality works without accounts

## Future Enhancements

### Potential Features
- **Account Hierarchies**: Support for nested accounts
- **Account Categories**: Grouping accounts by category
- **Account Templates**: Predefined account configurations
- **Account Import/Export**: Bulk account operations
- **Account Analytics**: Account-specific reporting and analysis

### Technical Improvements
- **Enhanced Validation**: More sophisticated validation rules
- **Better Error Messages**: More descriptive error feedback
- **Performance Optimization**: Further caching and optimization
- **Accessibility**: Enhanced accessibility features
- **Internationalization**: Multi-language support for account types

## Conclusion

The account feature provides a robust foundation for organizing portfolio assets into logical groupings. The implementation maintains backward compatibility while offering powerful new organizational capabilities. The clean separation of concerns between accounts and assets, combined with comprehensive validation and user feedback, creates a reliable and user-friendly experience.
