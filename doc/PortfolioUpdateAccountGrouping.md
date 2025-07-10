# Portfolio Update View - Account Grouping Enhancement

## Changes Made

### Overview
Updated the Portfolio Update View to group assets by their associated accounts, providing better organization and visual hierarchy in the portfolio update interface.

### Key Changes

#### 1. Data Structure Enhancement
- **New Message Type**: Added `INITIALIZE_PORTFOLIO_DATA` message type to send full portfolio data including accounts
- **Backward Compatibility**: Maintained `INITIALIZE_ASSETS` message type for legacy support
- **Global Variables**: Added `accounts` array to track account data alongside assets

#### 2. Portfolio Update View (TypeScript)
**File**: `src/views/portfolioUpdate/portfolioUpdateView.ts`
- Added `sendInitializePortfolioData()` method to send complete portfolio data
- Maintained existing `sendInitializeAssets()` method for backward compatibility

#### 3. Portfolio Explorer Provider (TypeScript)
**File**: `src/providers/portfolioExplorerProvider.ts`
- Updated to send full portfolio data instead of just assets using `sendInitializePortfolioData()`

#### 4. HTML Interface Enhancement
**File**: `src/views/portfolioUpdate/portfolioUpdate.html`

##### CSS Styling
- **Account Groups**: Added styling for account containers with distinct visual hierarchy
- **Account Headers**: Gradient backgrounds with account name and type badges
- **Standalone Assets**: Special styling for assets without accounts
- **Nested Asset Styling**: Adjusted asset group margins within accounts

##### JavaScript Logic
- **Message Handling**: Added handler for `INITIALIZE_PORTFOLIO_DATA` message type
- **Asset Grouping**: Implemented `groupAssetsByAccount()` function to organize assets
- **Account Group Generation**: Added `generateAccountGroup()` function for account containers
- **Standalone Assets**: Added `generateStandaloneAssetsGroup()` function
- **Fallback Logic**: Creates default account data when referenced accounts are missing

### Visual Hierarchy

#### With Accounts:
```
Portfolio Update
├── 招行 (bank) 📊
│   ├── 招行.活期 (simple)
│   └── 招行.沪深300ETF (investment)
├── 国金 (stock) 📈
│   └── 贵州茅台 (stock)
└── Other Assets
    ├── 富国信用债 (investment)
    └── StockAward (stock)
```

#### Key Features:
1. **Account Headers**: Display account name and type with distinctive styling
2. **Visual Grouping**: Assets are clearly grouped under their parent accounts
3. **Standalone Section**: Assets without accounts appear in "Other Assets" section
4. **Nested Styling**: Assets within accounts have adjusted visual styling
5. **Fallback Handling**: Gracefully handles missing account definitions

### Compatibility
- **Full Backward Compatibility**: Existing setups without accounts continue to work
- **Legacy Message Support**: Still handles `INITIALIZE_ASSETS` messages
- **Progressive Enhancement**: Accounts are optional - assets without accounts display in standalone section

### Data Flow
1. **Portfolio Explorer Provider** loads complete portfolio data including accounts
2. **Portfolio Update View** receives both assets and accounts via `INITIALIZE_PORTFOLIO_DATA`
3. **HTML Interface** groups assets by their account associations
4. **Visual Rendering** displays organized account groups with proper styling

### Benefits
- **Better Organization**: Assets are logically grouped by their financial accounts
- **Visual Clarity**: Clear hierarchy makes it easier to understand portfolio structure
- **Scalability**: Supports large portfolios with many accounts and assets
- **Consistency**: Matches the tree view organization in the main extension interface
