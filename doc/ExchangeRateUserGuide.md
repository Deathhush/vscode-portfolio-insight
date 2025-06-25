# Exchange Rate User Guide

## Quick Start

This guide explains how to use the Exchange Rate feature in the Portfolio Update view to handle assets in multiple currencies.

## When Exchange Rates Appear

The Exchange Rate section automatically appears when your portfolio contains assets with currencies other than CNY (Chinese Yuan). 

### Example Portfolio
If your portfolio contains:
- `招行.活期` (CNY - default)
- `StockAward` (USD) 
- `EU.Stock` (EUR)

Then the Exchange Rate section will show inputs for USD and EUR rates.

## Step-by-Step Usage

### 1. Open Portfolio Update
1. Open your workspace with a `portfolio.json` file in the `Assets/` folder
2. In the Portfolio Explorer view, click "Portfolio Update" or use the command palette
3. The Portfolio Update view will open

### 2. Locate Exchange Rate Section
- The Exchange Rate section appears below the asset list
- It shows "Exchange Rates 💱" with the help text "Enter rates to convert non-CNY assets"
- You'll see one input field for each non-CNY currency in your portfolio

### 3. Enter Exchange Rates
For each currency shown:
1. Find the current exchange rate (e.g., from financial websites)
2. Enter how many CNY equals 1 unit of the foreign currency
3. Example: If 1 USD = 7.2500 CNY, enter `7.2500` in the USD field

```
1 USD = [7.2500] CNY
1 EUR = [7.8000] CNY  
1 GBP = [9.1000] CNY
```

### 4. Update Asset Values
- Fill in asset values as normal
- Add transfers or income/expenses if needed
- The exchange rates will be automatically included

### 5. Save Portfolio Update
1. Click "Save Asset Update" button
2. The system saves a file like `portfolio-update-2025-06-25T10-30-00.json`
3. Exchange rates are included in the `exchangeRates` section

## Exchange Rate Sources

### Recommended Sources
- **Bank rates**: Use your bank's published exchange rates
- **Financial websites**: Yahoo Finance, XE.com, etc.
- **Central bank rates**: Official rates from central banks
- **Trading platform rates**: If you trade currencies

### Rate Timing
- Use rates from the same time as your asset valuations
- Consider market open/close times for accuracy
- Document your rate source if needed for records

## Example Scenarios

### Scenario 1: Simple USD Assets
**Portfolio**: CNY cash account + USD stock
**Exchange Rate**: 1 USD = 7.2500 CNY
**Steps**:
1. Open Portfolio Update
2. See exchange rate input for USD
3. Enter `7.2500` in USD field
4. Enter cash and stock values
5. Save update

**Result**: Portfolio update includes USD exchange rate

### Scenario 2: Multiple Currencies
**Portfolio**: CNY, USD, EUR, GBP assets
**Exchange Rates**:
- 1 USD = 7.2500 CNY
- 1 EUR = 7.8000 CNY  
- 1 GBP = 9.1000 CNY

**Steps**:
1. Open Portfolio Update
2. See three exchange rate inputs
3. Enter all three rates
4. Update asset values
5. Save update

**Result**: Portfolio update includes all three exchange rates

### Scenario 3: All CNY Portfolio  
**Portfolio**: Only CNY assets
**Exchange Rates**: None needed
**Result**: No exchange rate section appears

## Tips and Best Practices

### Rate Precision
- **2-4 decimal places** are usually sufficient
- **Example**: 7.2500 instead of 7.25000000
- Match precision to your calculation needs

### Rate Updates
- **Regular updates**: Exchange rates change daily
- **Consistency**: Use the same rate source for comparability
- **Documentation**: Note your rate source in descriptions if needed

### Validation
- **Cross-check**: Verify rates against multiple sources
- **Reasonableness**: Ensure rates make sense (e.g., USD/CNY around 6-8)
- **Timing**: Use rates from the same date as asset values

## Troubleshooting

### Exchange Rate Section Not Showing
**Problem**: You have foreign currency assets but don't see exchange rates
**Solution**: 
- Check that assets have `"currency": "USD"` (or other currency) in portfolio.json
- Refresh the Portfolio Update view
- Verify currency codes are correct (USD, EUR, GBP, etc.)

### Cannot Enter Exchange Rate
**Problem**: Input field doesn't accept values
**Solution**:
- Ensure you're entering numeric values only
- Use decimal point (.) not comma (,) 
- Check for minimum value (must be > 0)

### Exchange Rates Not Saved
**Problem**: Rates disappear or aren't included in saved file
**Solution**:
- Ensure rates are entered before clicking "Save Asset Update"
- Check that rate values are valid numbers > 0
- Verify the saved JSON file includes `exchangeRates` section

### Wrong Currency Showing  
**Problem**: Wrong currencies appear in exchange rate section
**Solution**:
- Check currency fields in your portfolio.json file
- Ensure currency codes are standard (USD, EUR, GBP, not usd, eur, gbp)
- Reload the Portfolio Update view after fixing portfolio.json

## Data Format

### Portfolio Definition (portfolio.json)
```json
{
  "assets": [
    {
      "name": "CNY.Cash",
      "type": "simple"
    },
    {
      "name": "USD.Stock", 
      "type": "stock",
      "currency": "USD"
    }
  ]
}
```

### Portfolio Update Output
```json
{
  "date": "2025-06-25",
  "assets": [...],
  "transfers": [...],
  "exchangeRates": [
    {
      "from": "USD",
      "rate": 7.25
    }
  ]
}
```

## Common Exchange Rate Values (Reference Only)

> **Note**: These are example values only. Always use current market rates.

| Currency | Typical Range vs CNY | Symbol |
|----------|---------------------|---------|
| USD      | 6.0 - 8.0          | $       |
| EUR      | 7.0 - 9.0          | €       |
| GBP      | 8.0 - 10.0         | £       |
| JPY      | 0.04 - 0.06        | ¥       |
| HKD      | 0.8 - 1.0          | HK$     |
| SGD      | 5.0 - 6.0          | S$      |

## Support and Feedback

### Getting Help
- Check this documentation first
- Look at example files in `test/testAssets/sampleData/`
- Review the technical documentation in `doc/ExchangeRateFeature.md`

### Reporting Issues
- Provide your portfolio.json structure
- Include error messages if any
- Describe expected vs actual behavior
- Share sample data if possible (remove sensitive information)
