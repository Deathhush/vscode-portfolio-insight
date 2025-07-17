# Sub-Category Feature Implementation Summary

## Overview
Implemented support for sub-categories in the tree view, allowing hierarchical organization of assets within categories. Sub-categories filter assets from their parent category, ensuring proper inheritance and avoiding cross-category asset leakage.

## Key Changes

### 1. Data Structure Updates
- **interfaces.ts**: Extended `CategoryData` interface to include optional `categories?: CategoryData[]` property for sub-categories
- **category.ts**: Updated `Category` class constructor to accept optional `parentCategory` parameter

### 2. Category Class Enhancements
- **getSubCategories()**: New method to retrieve sub-categories as `Category` instances
- **getStandaloneAssets()**: New method to get assets that don't belong to any sub-category
- **getAssets()**: Modified to respect parent category filtering - sub-categories only consider assets from their parent
- **calculateCurrentValue()**: Updated to sum values from both standalone assets and sub-categories

### 3. Tree View Provider Updates
- **CategoryNode**: 
  - Added `parentCategory` parameter to constructor
  - Updated `getChildren()` to return both sub-category nodes and standalone asset nodes
  - Modified `getDescription()` to calculate percentages against appropriate parent (CategoryType or Category)
  - Added `getChildSubCategoryNodes()` method

### 4. Data Access Layer
- **PortfolioDataAccess**: Updated `createCategory()` method to handle the new constructor signature

## Asset Filtering Logic

### Parent Category Inheritance
- **Top-level categories**: Load assets from all available assets in the portfolio
- **Sub-categories**: Load assets only from their parent category's asset pool
- **Tag filtering**: Within the candidate assets, filter by the category's own tags

### Standalone Asset Calculation
For categories with sub-categories:
1. Get all assets matching the category's tags
2. Get all sub-category tags
3. Filter out assets that have any sub-category tags
4. Remaining assets are "standalone" assets for this category

### Value Calculation
Total category value = Standalone assets value + Sum of all sub-categories values

## Tree View Structure
```
Categories
└── CategoryType (e.g., "资产配置")
    └── Category (e.g., "长期")
        ├── Sub-Category (e.g., "个股")
        │   └── Assets with "股票" tag (only those also in "长期")
        ├── Sub-Category (e.g., "指数基金")
        │   └── Assets with "指数基金" tag (only those also in "长期")
        └── Standalone Assets (assets in "长期" but not in any sub-category)
```

## Test Coverage
- Sub-category creation and retrieval
- Asset inheritance from parent categories
- Standalone asset filtering
- Value calculation including sub-categories
- Tree node generation with proper parent relationships

## Implementation Files Modified
- `src/data/interfaces.ts` - Extended CategoryData interface
- `src/data/category.ts` - Core business logic for sub-categories
- `src/data/asset.ts` - Added tags getter
- `src/data/portfolioDataAccess.ts` - Updated constructor calls
- `src/providers/categoryNode.ts` - Tree view support
- `test/category.test.ts` - Comprehensive test coverage
- `test/testAssets/testSimpleLayout/Assets/category.json` - Test data
