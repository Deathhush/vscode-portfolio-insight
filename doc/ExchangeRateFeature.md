# Exchange Rate Feature

## Overview

The Exchange Rate feature allows users to specify exchange rates for assets denominated in non-default currencies (currencies other than CNY). This enables proper valuation and conversion of multi-currency portfolios.

## How It Works

### Default Currency
- **CNY (Chinese Yuan)** is the default currency for the portfolio system
- Assets without an explicit `currency` field are assumed to be in CNY
- Assets with `"currency": "CNY"` are also treated as default currency assets

### Non-Default Currencies
When assets in the portfolio have currencies other than CNY (such as USD, EUR, GBP, etc.), the Exchange Rate section will automatically appear in the Portfolio Update view.

### Exchange Rate Input Section

The Exchange Rate section appears between the assets list and includes:

- **Header**: "Exchange Rates" with a currency exchange icon (💱)
- **Help text**: "Enter rates to convert non-CNY assets"
- **Rate inputs**: One input field for each non-default currency found in the portfolio

Each exchange rate input shows:
```
1 [CURRENCY] = [INPUT FIELD] CNY
```

For example:
```
1 USD = [7.0000] CNY
1 EUR = [7.6000] CNY
```

### Auto-Detection
The system automatically:
- Scans all assets for non-default currencies
- Shows only the currencies that are actually used in the portfolio
- Hides the Exchange Rate section entirely if all assets use CNY

## Usage

### Setting Exchange Rates

1. Open the Portfolio Update view
2. If you have assets with non-CNY currencies, the Exchange Rate section will appear
3. Enter the current exchange rate for each currency relative to CNY
4. The rates are automatically saved when you input them
5. Click "Save Asset Update" to include exchange rates in the portfolio update file

### Exchange Rate Format

- **Input**: Numeric value with up to 4 decimal places
- **Meaning**: How many CNY equals 1 unit of the foreign currency
- **Example**: If 1 USD = 7.0000 CNY, enter `7.0000` in the USD field

### Data Storage

Exchange rates are saved in the portfolio update JSON file under the `exchangeRates` array:

```json
{
  "date": "2025-06-25",
  "assets": [...],
  "transfers": [...],
  "exchangeRates": [
    {
      "from": "USD",
      "rate": 7.0
    },
    {
      "from": "EUR", 
      "rate": 7.6
    }
  ]
}
```

## Supported Currencies

The system supports any currency code. Common currencies include:

- **USD** - US Dollar ($)
- **EUR** - Euro (€)
- **GBP** - British Pound (£)
- **JPY** - Japanese Yen (¥)
- **HKD** - Hong Kong Dollar
- **SGD** - Singapore Dollar
- And any other currency codes defined in your assets

## Visual Design

### Currency Icons
Each currency displays with an appropriate symbol:
- USD: $ 
- EUR: €
- GBP: £
- JPY: ¥
- Others: Generic currency background

### Responsive Design
- Desktop: Horizontal layout with labeled inputs
- Mobile: Stacked layout for better touch interaction

### Theme Support
- Light theme: Clean, minimal appearance
- Dark theme: Dark backgrounds with appropriate contrast
- High contrast: Enhanced visibility for accessibility

## Technical Implementation

### Detection Logic
```javascript
function getNonDefaultCurrencies() {
  const currencies = new Set();
  assets.forEach(asset => {
    if (asset.currency && asset.currency !== 'CNY') {
      currencies.add(asset.currency);
    }
  });
  return Array.from(currencies).sort();
}
```

### Data Collection
Exchange rates are collected during the portfolio update process and included in the JSON output alongside asset values and transfers.

### State Management
- Exchange rates are stored in a JavaScript Map for efficient lookup
- Rates persist during the session until new assets are loaded
- Invalid or empty rates are automatically removed from the collection

## Example Scenarios

### Single Foreign Currency
Portfolio with CNY and USD assets:
- Exchange Rate section shows: "1 USD = [input] CNY"
- User enters current USD/CNY rate
- Rate is saved with the portfolio update

### Multiple Foreign Currencies
Portfolio with CNY, USD, and EUR assets:
- Exchange Rate section shows inputs for both USD and EUR
- User enters rates for both currencies
- Both rates are saved in the portfolio update

### All CNY Assets
Portfolio with only CNY assets:
- Exchange Rate section is hidden
- No exchange rate data is included in the portfolio update
- Clean interface without unnecessary elements

## Best Practices

### Rate Updates
- Update exchange rates regularly as they fluctuate
- Use current market rates for accuracy
- Consider using rates from reliable financial sources

### Rate Precision
- Enter rates with appropriate precision (typically 4 decimal places)
- Avoid overly precise rates unless required for specific calculations
- Round rates to meaningful precision levels

### Consistency
- Use consistent rate sources across updates
- Document rate sources if needed for audit purposes
- Consider time-of-day effects for rate accuracy
