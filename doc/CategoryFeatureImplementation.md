# Asset Category Feature Implementation

## Overview
The Asset Category feature allows you to organize and view your assets by categories based on their tags. This provides a different perspective on your portfolio, grouping assets by their characteristics rather than their individual nature.

## File Structure

### New Files Added:
- `src/data/category.ts` - Category and CategoryType business logic classes
- `src/providers/categoryCollectionNode.ts` - Root Categories node in the tree view
- `src/providers/categoryTypeNode.ts` - Individual category type nodes
- `src/providers/categoryNode.ts` - Individual category nodes that contain assets
- `test/category.test.ts` - Unit tests for the category feature

### Modified Files:
- `src/data/interfaces.ts` - Added category-related data interfaces
- `src/data/portfolioDataStore.ts` - Added category.json loading capability
- `src/data/portfolioDataAccess.ts` - Added category data access and caching methods
- `src/providers/portfolioExplorerProvider.ts` - Updated to include Categories root node

## Configuration

### category.json Structure
Create a `category.json` file in your Assets folder with the following structure:

```json
{
    "categoryTypes": [
        {
            "name": "资产配置",
            "categories": [
                {
                    "name": "活钱",
                    "tags": ["活期", "定期", "货币基金"]
                },
                {
                    "name": "稳健",
                    "tags": ["信用债基金", "利率债基金"]
                },
                {
                    "name": "长期",
                    "tags": ["股票", "指数基金"]
                }
            ]
        }
    ]
}
```

### portfolio.json Tag Requirements
Make sure your assets in `portfolio.json` have tags that match your category definitions:

```json
{
  "assets": [
    {
      "name": "招行.活期",
      "type": "simple",
      "currency": "CNY",
      "tags": ["活期"]
    },
    {
      "name": "招行.沪深300ETF",
      "type": "investment",
      "currency": "CNY",
      "tags": ["指数基金"]
    }
  ]
}
```

## Features

### Tree View Structure
The Portfolio Explorer now shows:
```
📁 Assets
  ├── Asset 1
  ├── Asset 2
  └── ...
📁 Categories
  └── 📂 资产配置 (Total: ¥X,XXX.XX)
      ├── 📂 活钱 (XX.X%)
      │   └── 招行.活期
      ├── 📂 稳健 (XX.X%)
      │   └── 国金
      └── 📂 长期 (XX.X%)
          ├── 招行.沪深300ETF
          └── StockAward
```

### Value Calculation
- **CategoryType nodes** show the total value of all assets in all their categories
- **Category nodes** show their percentage of the total CategoryType value
- **CategoryCollection node** doesn't show totals but contains all category types
- Values are calculated by matching asset tags with category tag definitions

### Caching
- Category definitions are cached in PortfolioDataAccess
- Cache is invalidated when portfolio data changes
- Follows the same caching pattern as other data in the application

## Technical Implementation

### Class Hierarchy
```
CategoryType
├── Contains multiple Category instances
├── Calculates total value across all categories
└── Provides summary data

Category
├── Matches assets by tags
├── Calculates total value for matched assets
└── Provides filtered asset list
```

### Data Flow
1. `category.json` → `PortfolioDataStore.loadCategoryDefinitions()`
2. `PortfolioDataAccess` caches and provides category data
3. `CategoryType` and `Category` classes provide business logic
4. Tree view nodes (`CategoryCollectionNode`, `CategoryTypeNode`, `CategoryNode`) handle UI representation

## Usage

1. Create a `category.json` file in your Assets folder with your category definitions
2. Add appropriate tags to your assets in `portfolio.json`
3. Refresh the Portfolio Explorer to see the new Categories section
4. Expand category types to see their categories and the assets within each category

The feature automatically calculates and displays total values for category types, helping you understand your asset allocation at a glance.
