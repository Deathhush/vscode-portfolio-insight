# Portfolio Current Value Display Demo

This demonstrates how the current value feature displays asset information in the Portfolio Explorer tree view.

## Expected Tree View Display

```
Assets                                    Total: ¥235,160.00
├── 招行.活期                             simple • ¥20,000.00
├── 招行.沪深300ETF                       investment • ¥35,000.00  
├── 国金                                  composite • ¥40,000.00
└── StockAward                           stock • USD 19,200.00 (¥140,160.00)
```

## Calculation Breakdown

### Portfolio Total: ¥235,160.00
- **招行.活期**: ¥20,000 (CNY) = ¥20,000
- **招行.沪深300ETF**: ¥35,000 (CNY) = ¥35,000
- **国金**: ¥40,000 (CNY) = ¥40,000  
- **StockAward**: $19,200 (USD) × 7.3 rate = ¥140,160

### Asset Value Sources
Values are calculated from the latest snapshot events in AssetUpdates files:

#### From `portfolio-update-2025-06-26.json`:
```json
{
  "assets": [
    {
      "name": "招行.活期",
      "events": [{ "type": "snapshot", "currentValue": 20000 }]
    },
    {
      "name": "StockAward", 
      "events": [{ "type": "snapshot", "shares": 120, "price": 160 }]
    }
  ],
  "exchangeRates": [
    { "from": "USD", "rate": 7.3 }
  ]
}
```

### Key Features
- **Real-time Updates**: Values update when asset update files change
- **Multi-Currency Support**: Shows original currency and CNY equivalent
- **Latest Data Priority**: Always uses the most recent snapshot data
- **Graceful Fallback**: Shows just asset type if value calculation fails

## Tooltip Information
Hovering over an asset shows additional details:
```
招行.活期 (simple)
StockAward (stock, USD)
```

## Date-Based Exchange Rate Demo

This example shows how exchange rates are selected based on dates:

### Test Data Setup

#### `portfolio-update-2025-06-20.json`
```json
{
  "date": "2025-06-20",
  "exchangeRates": [
    { "from": "USD", "rate": 7.1 },
    { "from": "EUR", "rate": 7.8 }
  ]
}
```

#### `portfolio-update-2025-06-24.json`
```json
{
  "date": "2025-06-24", 
  "assets": [
    {
      "name": "EU.Stock",
      "events": [
        {
          "type": "snapshot",
          "shares": 60,
          "price": 180,
          "date": "2025-06-23"
        }
      ]
    }
  ],
  "exchangeRates": [
    { "from": "USD", "rate": 7.25 },
    { "from": "EUR", "rate": 7.65 }
  ] 
}
```

#### `portfolio-update-2025-06-26.json`
```json
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

### Exchange Rate Selection Logic

1. **StockAward (USD)**: 
   - Snapshot Date: 2025-06-26 (from portfolio update date)
   - Available USD Rates: 7.1 (2025-06-20), 7.25 (2025-06-24), 7.3 (2025-06-26)  
   - **Selected Rate**: 7.3 (exact date match)
   - **Value**: $19,200 × 7.3 = ¥140,160

2. **EU.Stock (EUR)**:
   - Snapshot Date: 2025-06-23 (explicit event date)
   - Available EUR Rates: 7.8 (2025-06-20), 7.65 (2025-06-24)
   - **Selected Rate**: 7.65 (closest to 2025-06-23, only 1 day difference vs 3 days)
   - **Value**: €10,800 × 7.65 = ¥82,620

### Visual Result
```
Assets                                    Total: ¥317,780.00
├── 招行.活期                             simple • ¥20,000.00
├── 招行.沪深300ETF                       investment • ¥35,000.00
├── 国金                                  composite • ¥40,000.00  
├── StockAward                           stock • USD 19,200.00 (¥140,160.00)
└── EU.Stock                             stock • EUR 10,800.00 (¥82,620.00)
```

This demonstrates how the system intelligently selects the most appropriate exchange rate based on temporal proximity to the asset snapshot date.

## Error Handling Demo

### Missing Exchange Rate Scenario

When exchange rates are missing for foreign currency assets:

```
Assets                                    Total: Exchange rate missing
├── 招行.活期                             simple • ¥25,000.00
├── 招行.沪深300ETF                       investment • ¥35,000.00
├── 国金                                  composite • ¥40,000.00
└── StockAward                           stock • Exchange rate missing
```

**Error Details:**
- Portfolio total cannot be calculated
- Foreign currency assets show "Exchange rate missing"
- User receives error dialog with option to open AssetUpdates folder

### Fixed Scenario

After adding exchange rates to asset update files:

```
Assets                                    Total: ¥283,500.00
├── 招行.活期                             simple • ¥25,000.00
├── 招行.沪深300ETF                       investment • ¥35,000.00
├── 国金                                  composite • ¥40,000.00
└── StockAward                           stock • USD 35,000.00 (¥248,500.00)
```

**Resolution Steps:**
1. Add exchange rate to latest asset update file
2. Refresh Portfolio Explorer
3. Values calculated correctly with proper currency conversion
