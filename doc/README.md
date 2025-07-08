# VS Code Portfolio Insight Documentation

Welcome to the VS Code Portfolio Insight documentation! This directory contains comprehensive guides and technical documentation for all features.

## User Guides

### Getting Started
- **[Main README](../README.md)** - Quick start guide and feature overview
- **[Account User Guide](AccountUserGuide.md)** - Step-by-step account management instructions
- **[Exchange Rate User Guide](ExchangeRateUserGuide.md)** - Multi-currency portfolio management

### Core Features
- **[Portfolio Display Guide](PortfolioTotalValueFeature.md)** - Understanding portfolio value calculations
- **[Tags Feature Guide](TagsFeatureImplementation.md)** - Asset categorization and tagging

## Technical Documentation

### Feature Implementation
- **[Account Feature Implementation](AccountFeatureImplementation.md)** - Complete technical overview of account management
- **[Exchange Rate Implementation](ExchangeRateImplementationSummary.md)** - Technical details of currency support
- **[Category Feature Implementation](CategoryFeatureImplementation.md)** - Asset categorization system

### Architecture & Design
- **[Asset Page Feature Design](../design/AssetPageFeatureDesign.md)** - UI/UX design specifications
- **[Exchange Rate Feature](ExchangeRateFeature.md)** - Exchange rate system architecture

## Product Requirements

See the **[PRD directory](../prd/)** for detailed product requirements and specifications:

### Core Features
- **[Account Feature](../prd/account/AccountFeature.md)** - Account management requirements
- **[Asset Page](../prd/AssetPage.md)** - Asset detail view specifications
- **[Exchange Rate](../prd/ExchangeRate.md)** - Multi-currency support requirements

### Portfolio Management
- **[Portfolio Display](../prd/PortfolioDisplay.md)** - Tree view and navigation
- **[Portfolio Update](../prd/PortfolioUpdateView.md)** - Value tracking and updates
- **[Bulk Define Portfolio](../prd/BulkDefinePortfolio.md)** - Batch asset definition

### Advanced Features
- **[Tags Support](../prd/tags/SupportTaggingForAsset.md)** - Asset tagging system
- **[Category Management](../prd/category/AssetCategory.md)** - Asset categorization

## Sample Data

Explore example portfolios in the **test/testAssets/sampleData/** directory:
- **[Basic Portfolio](../test/testAssets/sampleData/portfolio.json)** - Simple portfolio structure
- **[Multi-Currency Portfolio](../test/testAssets/sampleData/portfolioWithMultiCurrency.json)** - International assets
- **[Tagged Portfolio](../test/testAssets/sampleData/portfolioWithTags.json)** - Asset tagging examples
- **[Account Portfolio](../prd/account/portfolio.withAccount.sample.json)** - Account-organized portfolio

## Quick Reference

### Account Types
- **bank**: Checking, savings, and cash accounts
- **stock**: Brokerage and trading accounts

### Asset Types
- **simple**: Basic assets with current value only
- **investment**: Investment accounts with current value
- **composite**: Assets with both current value and market value
- **stock**: Stock holdings with shares and price per share

### Supported Currencies
- **CNY** (Chinese Yuan) - Default base currency
- **USD** (US Dollar)
- **EUR** (Euro)
- **GBP** (British Pound)
- Any other ISO currency code

## Development

### Building and Testing
```bash
npm install
npm run watch
npm test
```

### Extension Structure
```
src/
├── data/           # Data models and access layer
├── providers/      # Tree view providers and nodes
├── views/          # WebView panels and editors
└── extension.ts    # Main extension entry point
```

## Contributing

1. Read the relevant technical documentation before making changes
2. Update documentation when adding new features
3. Include sample data for new functionality
4. Ensure all tests pass before submitting changes

## Need Help?

1. Check the **[User Guides](#user-guides)** for step-by-step instructions
2. Review **[Technical Documentation](#technical-documentation)** for implementation details
3. Examine **[Sample Data](#sample-data)** for examples
4. Consult **[Product Requirements](#product-requirements)** for feature specifications
