# VSCode Portfolio Insight

A Visual Studio Code extension for managing and tracking investment portfolios with multi-currency support.

## Features

### Portfolio Management
- **Asset Definition**: Define assets with different types (simple, investment, composite, stock)
- **Portfolio Updates**: Track asset values, transfers, and transactions over time
- **Multi-Currency Support**: Handle assets in different currencies with exchange rate conversion

### Asset Types
- **Simple**: Basic assets with current value only
- **Investment**: Investment accounts with current value
- **Composite**: Assets with both current value and market value
- **Stock**: Stock holdings with shares and price per share

### Exchange Rate Support
- **Automatic Detection**: Automatically detects non-CNY currencies in your portfolio
- **Real-time Input**: Enter current exchange rates during portfolio updates
- **Flexible Currencies**: Support for USD, EUR, GBP, and any other currency codes
- **CNY Base**: Uses Chinese Yuan (CNY) as the default base currency

### Transfer and Transaction Tracking
- **Inter-Asset Transfers**: Track money movement between assets
- **Income & Expenses**: Record cash flows for simple assets
- **Auto-Pairing**: Automatically creates paired transfer entries
- **Date Flexibility**: Override dates for individual transactions

## Getting Started

### 1. Setup Your Portfolio
Create an `Assets/portfolio.json` file in your workspace:

```json
{
  "assets": [
    {
      "name": "Cash Account",
      "type": "simple"
    },
    {
      "name": "US Stocks",
      "type": "stock",
      "currency": "USD"
    },
    {
      "name": "EU Investment",
      "type": "investment", 
      "currency": "EUR"
    }
  ]
}
```

### 2. Open Portfolio Update
- Use the Portfolio Explorer view in the sidebar
- Click "Portfolio Update" to open the update interface
- Enter asset values and exchange rates
- Save updates to track portfolio changes over time

### 3. Multi-Currency Assets
When your portfolio includes non-CNY assets:
- Exchange Rate section appears automatically
- Enter current rates (e.g., 1 USD = 7.25 CNY)
- Rates are saved with your portfolio update

## Documentation

- **[Exchange Rate Feature Guide](doc/ExchangeRateFeature.md)** - Technical overview of exchange rate functionality
- **[Exchange Rate User Guide](doc/ExchangeRateUserGuide.md)** - Step-by-step user instructions
- **[Product Requirements](prd/)** - Detailed feature specifications

## File Structure

```
workspace/
├── Assets/
│   └── portfolio.json          # Asset definitions
├── AssetUpdates/
│   └── portfolio-update-*.json # Portfolio update history
└── README.md
```

## Exchange Rate Example

For a portfolio with USD and EUR assets:

```json
{
  "date": "2025-06-25",
  "assets": [...],
  "transfers": [...],
  "exchangeRates": [
    {
      "from": "USD",
      "rate": 7.25
    },
    {
      "from": "EUR", 
      "rate": 7.80
    }
  ]
}
```

## Development

### Build and Run
```bash
npm install
npm run watch
```

### Testing
- Sample portfolios available in `test/testAssets/sampleData/`
- Multi-currency examples included
- Exchange rate test cases provided

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests and documentation
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.