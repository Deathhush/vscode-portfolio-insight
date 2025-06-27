# Portfolio Total Value Feature

## Overview

The Portfolio Total Value feature automatically calculates and displays the total current value of all assets in the portfolio, expressed in CNY (Chinese Yuan). This value is shown as a description in the "Assets" node within the Portfolio Explorer tree view.

## How It Works

### Data Sources

The feature processes data from multiple sources:

1. **Portfolio Definition**: Loaded from `Assets/portfolio.json`, which defines assets and their currencies
2. **Asset Updates**: All JSON files in the `AssetUpdates/` folder containing portfolio update data
3. **Exchange Rates**: Currency conversion rates included in asset update files

### Calculation Process

1. **Load Asset Updates**: Scans the `AssetUpdates/` folder for all `.json` files
2. **Merge Asset Events**: For each asset, finds the latest snapshot event across all update files
3. **Extract Exchange Rates**: Uses the most recent exchange rates from update files
4. **Calculate Current Values**: 
   - For assets with `currentValue`: Uses the value directly
   - For assets with `shares` and `price`: Calculates `shares × price`
5. **Convert to CNY**: Applies exchange rates to convert foreign currency values to CNY
6. **Sum Total**: Adds all asset values in CNY to get the portfolio total

### Currency Handling

- **Default Currency**: CNY is the default currency for all assets
- **Foreign Currencies**: Assets with `currency` field other than CNY are converted using exchange rates
- **Exchange Rate Source**: Rates are taken from the `exchangeRates` array in asset update files
- **Missing Rates**: If no exchange rate is found for a currency, the asset is treated as CNY (with a warning)

### Display Format

The total value is displayed in the Assets node description using the format:
```
Total: ¥123,456.78
```

The value is formatted with:
- Chinese locale formatting (comma separators)
- Two decimal places
- CNY currency symbol (¥)

## Asset-Level Value Display

In addition to the portfolio total, each individual asset in the Portfolio Explorer tree also displays its current value in the description.

### Display Format

Each asset node shows the following information:
- **Asset Type**: simple, investment, composite, or stock
- **Current Value**: Formatted according to the asset's currency

#### CNY Assets
For assets in CNY (or without explicit currency):
```
Asset Name                               simple • ¥15,000.00
```

#### Foreign Currency Assets
For assets in foreign currencies:
```
Asset Name                               stock • USD 19,200.00 (¥140,160.00)
```

This shows:
- Asset type (stock)
- Original currency value (USD 19,200.00)
- CNY equivalent in parentheses (¥140,160.00)

### Example Tree View
```
Assets                                    Total: ¥235,160.00
├── 招行.活期                             simple • ¥20,000.00
├── 招行.沪深300ETF                       investment • ¥35,000.00
├── 国金                                  composite • ¥40,000.00
└── StockAward                           stock • USD 19,200.00 (¥140,160.00)
```

## Example Data Structure

### Portfolio Definition (`Assets/portfolio.json`)
```json
{
  "assets": [
    {
      "name": "招行.活期",
      "type": "simple"
    },
    {
      "name": "StockAward", 
      "type": "stock",
      "currency": "USD"
    }
  ]
}
```

### Asset Update (`AssetUpdates/portfolio-update-2025-06-25.json`)
```json
{
  "date": "2025-06-25",
  "assets": [
    {
      "name": "招行.活期",
      "events": [
        {
          "type": "snapshot",
          "currentValue": 15000
        }
      ]
    },
    {
      "name": "StockAward",
      "events": [
        {
          "type": "snapshot", 
          "shares": 100,
          "price": 150
        }
      ]
    }
  ],
  "exchangeRates": [
    {
      "from": "USD",
      "rate": 7.2
    }
  ]
}
```

### Calculation Result
- 招行.活期: ¥15,000 (CNY)
- StockAward: $15,000 → ¥108,000 (100 shares × $150 × 7.2 rate)
- **Total: ¥123,000**

## Usage Example

### Setup
1. Create a portfolio definition in `Assets/portfolio.json`
2. Add asset update files to the `AssetUpdates/` folder
3. Open the Portfolio Explorer in VS Code

### Expected Result
The "Assets" node in the Portfolio Explorer will show:
```
Assets                                    Total: ¥235,160.00
├── 招行.活期                             simple • ¥20,000.00
├── 招行.沪深300ETF                       investment • ¥35,000.00
├── 国金                                  composite • ¥40,000.00
└── StockAward                           stock • USD 19,200.00 (¥140,160.00)
```

The total value is calculated as:
- 招行.活期: ¥20,000 (CNY)
- 招行.沪深300ETF: ¥35,000 (CNY)  
- 国金: ¥40,000 (CNY)
- StockAward: $19,200 → ¥140,160 (USD converted at rate 7.3)
- **Total: ¥235,160**

### Refresh Behavior
The total value updates automatically when:
- Asset update files are added or modified
- The Portfolio Explorer is refreshed
- The extension is reloaded

## Error Handling

- **Missing AssetUpdates folder**: Shows total as ¥0.00
- **Invalid JSON files**: Skips problematic files and logs errors
- **Missing exchange rates**: Treats foreign currency as CNY with warning
- **Calculation errors**: Shows "Total: Error calculating" in the description

### Error Handling for Missing Exchange Rates

The system now enforces strict exchange rate requirements:

#### Required Exchange Rates
- **All foreign currency assets** must have corresponding exchange rates in the asset update files
- The system will **error out** if an exchange rate is missing for any foreign currency asset
- This prevents incorrect calculations and ensures data integrity

#### Error Messages
When exchange rates are missing, you'll see:

1. **Portfolio Total**: Shows "Total: Exchange rate missing" 
2. **Asset Nodes**: Show "stock • Exchange rate missing"
3. **Error Dialog**: Detailed error message with option to open AssetUpdates folder

#### Example Error Scenarios

**Missing USD Exchange Rate:**
```
Error: Failed to calculate value for asset "StockAward": 
No exchange rate found for currency USD near date 2025-06-27. 
Please provide exchange rates for all foreign currencies in your asset update files.
```

**Tree View with Missing Rate:**
```
Assets                                    Total: Exchange rate missing
├── 招行.活期                             simple • ¥25,000.00
├── 招行.沪深300ETF                       investment • ¥35,000.00
├── 国金                                  composite • ¥40,000.00
└── StockAward                           stock • Exchange rate missing
```

#### Resolution
To fix missing exchange rate errors:

1. Open the AssetUpdates folder (use the error dialog option)
2. Add exchange rates to your portfolio update files:
   ```json
   {
     "date": "2025-06-27",
     "assets": [...],
     "exchangeRates": [
       {
         "from": "USD",
         "rate": 7.1
       }
     ]
   }
   ```
3. Refresh the Portfolio Explorer view

## Performance Considerations

- Asset update files are loaded and processed each time the tree view refreshes
- For better performance with large datasets, consider caching calculated values
- The calculation runs asynchronously to avoid blocking the UI

## Implementation Details

The feature is implemented across several components:

1. **PortfolioValueCalculator** (`src/services/portfolioValueCalculator.ts`): Core calculation logic
2. **AssetCollectionNode** (`src/providers/assetCollectionNode.ts`): Tree node with total value display
3. **PortfolioExplorerProvider** (`src/providers/portfolioExplorerProvider.ts`): Integration with VS Code tree view

The calculator service can be used independently for other features that need portfolio value calculations.

## Enhanced Exchange Rate Handling

### Date-Based Exchange Rate Selection

The system now handles exchange rates with temporal precision:

1. **Multiple Rates Per Currency**: Exchange rates can be provided on different dates for the same currency
2. **Date Matching**: When converting currency values, the system finds the exchange rate closest to the asset's snapshot date
3. **Automatic Fallback**: If no exact date match exists, uses the temporally closest available rate

### Exchange Rate Data Structure

Exchange rates can now include optional date information:

```json
{
  "exchangeRates": [
    {
      "from": "USD",
      "rate": 7.1,
      "date": "2025-06-20"
    },
    {
      "from": "USD", 
      "rate": 7.3,
      "date": "2025-06-26"
    }
  ]
}
```

If no `date` is specified for an exchange rate, it defaults to the portfolio update's date.

### Conversion Logic

When converting an asset value to CNY:

1. **Get Asset Snapshot Date**: Uses the asset's event date, asset update date, or portfolio update date (in priority order)
2. **Find Closest Rate**: Searches all available exchange rates for the currency and finds the one with the date closest to the asset snapshot date
3. **Apply Conversion**: Uses the closest rate to convert the value to CNY

### Example Scenario

```json
// portfolio-update-2025-06-20.json
{
  "date": "2025-06-20",
  "exchangeRates": [
    { "from": "USD", "rate": 7.1 }
  ]
}

// portfolio-update-2025-06-26.json  
{
  "date": "2025-06-26",
  "assets": [
    {
      "name": "StockAward",
      "events": [
        {
          "type": "snapshot",
          "shares": 120,
          "price": 160
        }
      ]
    }
  ],
  "exchangeRates": [
    { "from": "USD", "rate": 7.3 }
  ]
}
```

**Result**: StockAward's $19,200 value uses the 7.3 rate (closest to 2025-06-26) = ¥140,160

### Benefits

- **Accurate Historical Conversion**: Uses exchange rates that were actually available at the time of the asset snapshot
- **Temporal Precision**: Accounts for exchange rate fluctuations over time
- **Flexible Data Entry**: Supports both dated and undated exchange rate entries
