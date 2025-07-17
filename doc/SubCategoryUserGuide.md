# Sub-Category Feature User Guide

## Overview
The Sub-Category feature allows you to create hierarchical organization within your portfolio categories. Sub-categories help you break down larger categories into more specific groupings while maintaining the logical relationship between parent and child categories.

## How Sub-Categories Work

### Basic Concept
- **Categories** can now contain **sub-categories**
- **Sub-categories** automatically inherit assets from their parent category
- **Assets** in sub-categories must first belong to the parent category
- **Standalone assets** in a category are those that don't match any sub-category criteria

### Asset Inheritance
When you create sub-categories, the system ensures that:
1. Sub-categories only consider assets that already belong to the parent category
2. Assets are filtered by the sub-category's specific tags
3. Assets that don't match any sub-category remain as "standalone" assets in the parent category

## Configuration

### Setting Up Sub-Categories
Sub-categories are defined in your `Assets/category.json` file. Here's the structure:

```json
{
    "categoryTypes": [
        {
            "name": "资产配置",
            "categories": [
                {
                    "name": "长期",
                    "tags": ["股票", "指数基金", "混合基金"],
                    "categories": [
                        {
                            "name": "个股",
                            "tags": ["股票"]
                        },
                        {
                            "name": "指数基金",
                            "tags": ["指数基金"]
                        }
                    ]
                }
            ]
        }
    ]
}
```

### Example Asset Organization
With the above configuration and these assets:

```json
{
    "assets": [
        {
            "name": "腾讯控股",
            "type": "stock",
            "tags": ["股票", "港股"]
        },
        {
            "name": "沪深300ETF",
            "type": "investment",
            "tags": ["指数基金"]
        },
        {
            "name": "混合型基金A",
            "type": "investment",
            "tags": ["混合基金"]
        },
        {
            "name": "货币基金",
            "type": "simple",
            "tags": ["活期"]
        }
    ]
}
```

The organization would be:
- **长期** category contains: 腾讯控股, 沪深300ETF, 混合型基金A
  - **个股** sub-category contains: 腾讯控股
  - **指数基金** sub-category contains: 沪深300ETF
  - **Standalone assets**: 混合型基金A (has "混合基金" tag but no matching sub-category)
- **货币基金** would not appear in 长期 category (doesn't have required tags)

## Tree View Display

### Visual Organization
In the VS Code tree view, you'll see:
```
Categories
└── 资产配置
    └── 长期 ¥150,000 • 75.0%
        ├── 个股 ¥50,000 • 33.3%
        │   └── 腾讯控股 ¥50,000
        ├── 指数基金 ¥30,000 • 20.0%
        │   └── 沪深300ETF ¥30,000
        └── 混合型基金A ¥70,000
```

### Value Display
- **Category totals** include both sub-categories and standalone assets
- **Percentages** for sub-categories are calculated against their parent category
- **Percentages** for top-level categories are calculated against the category type total

## Best Practices

### Tag Strategy
1. **Parent category tags** should be broader and include all relevant asset types
2. **Sub-category tags** should be more specific subsets of parent tags
3. **Avoid overlapping** sub-category tags to prevent confusion

### Hierarchical Design
- Keep sub-category depth reasonable (1-2 levels recommended)
- Ensure sub-category tags are meaningful and distinct
- Consider leaving some assets as standalone in the parent category

### Asset Tagging
- Tag assets with both general and specific tags when appropriate
- Example: An index fund might have tags ["指数基金", "A股", "大盘"] to appear in multiple relevant categories

## Troubleshooting

### Assets Not Appearing in Sub-Categories
1. Check that the asset has the required parent category tags
2. Verify the asset also has the specific sub-category tag
3. Ensure tag names match exactly (case-sensitive)

### Incorrect Value Calculations
1. Refresh the tree view to update cached calculations
2. Check that all asset updates are properly saved
3. Verify exchange rates are current for multi-currency portfolios

### Tree View Not Updating
1. Use the refresh command in the portfolio tree view
2. Check that the category.json file is properly formatted
3. Restart VS Code if configuration changes aren't reflected
