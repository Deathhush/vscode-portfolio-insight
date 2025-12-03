# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VSCode Portfolio Insight is a Visual Studio Code extension for managing investment portfolios with multi-currency support. It provides portfolio tracking, asset management, and financial analysis capabilities through a tree view interface in VS Code.

## Architecture

### Core Components

- **Extension Entry**: `src/extension.ts` - Main extension activation point
- **Data Layer**: `src/data/` - Interfaces and data access for portfolio, assets, accounts, and categories
- **Providers**: `src/providers/` - Tree view node implementations for the VS Code explorer
- **Views**: `src/views/` - Webview implementations for portfolio updates and asset editing

### Key Data Structures

- **Portfolio Structure**: Assets organized into accounts, with support for multi-currency
- **Asset Types**: Simple, investment, composite, and stock assets
- **Categories**: Flexible tagging system for asset organization and analysis
- **Exchange Rates**: Multi-currency support with CNY as base currency

### File Structure Expectations

```
workspace/
├── Assets/
│   ├── portfolio.json          # Asset and account definitions
│   └── category.json           # Category definitions (optional)
├── AssetUpdates/
│   └── portfolio-update-*.json # Portfolio update history
├── .portfolio-insight/
│   └── backup/
│       ├── portfolio/          # Automatic backups of portfolio.json
│       └── renames/            # Backup folders for asset rename operations
└── README.md
```

## Development Commands

### Build & Development
```bash
npm install           # Install dependencies
npm run compile       # Build TypeScript
npm run watch         # Watch mode for development
npm run lint          # Run ESLint
npm run test          # Run tests (requires compilation first)
```

### Testing
```bash
npm run pretest       # Compile and lint before testing
npm run test          # Run VS Code extension tests
```

## Key Files & Patterns

### Data Interfaces
- `src/data/interfaces.ts` - Core data structures for portfolio, assets, transfers, exchange rates
- `src/data/portfolioDataAccess.ts` - Main data access layer
- `src/data/portfolioDataStore.ts` - File system persistence

### Tree View Architecture
- `src/providers/portfolioExplorerProvider.ts` - Main tree data provider
- Node types: portfolio, asset, categoryCollection, categoryType, category, tagCollection, tag, account
- Each provider implements `PortfolioExplorerNode` interface

### Web Views
- `src/views/portfolioUpdate/portfolioUpdateView.ts` - Portfolio value update interface
- `src/views/portfolioEdit/assetDefinitionEditorView.ts` - Asset and account management
- `src/views/assetPage/assetPageView.ts` - Individual asset detail view

## Testing Approach

- Tests use VS Code extension testing framework
- Test data in `test/testAssets/` - includes sample portfolios and test cases
- Focus on data transformation, file I/O, and tree view behavior

## Extension Configuration

- **Activation**: Extension activates when VS Code loads (no specific activation events)
- **Views**: Custom activity bar "Asset Insight" with PortfolioExplorer tree view
- **Commands**: Edit asset definitions, update portfolio, refresh tree view

## Data Flow

1. **Asset Definition**: Users define assets and accounts in `Assets/portfolio.json`
2. **Portfolio Updates**: Users update values via webview, saved as `portfolio-update-*.json`
3. **Category System**: Optional `Assets/category.json` defines category structure based on tags
4. **Tree Display**: Real-time updates showing assets, accounts, categories, and tags