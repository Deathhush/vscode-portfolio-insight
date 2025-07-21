# VSCode Portfolio Insight - AI Coding Agent Instructions

## Project Overview
A VS Code extension for managing investment portfolios with multi-currency support, account organization, and asset categorization. Built with TypeScript using VS Code's TreeView API and webview-based editors.

## Architecture Pattern
- **Data Layer**: `src/data/` - Core business logic with clear separation between on-disk storage (`PortfolioDataStore`) and in-memory access (`PortfolioDataAccess`)
- **Tree View Providers**: `src/providers/` - Hierarchical display using VS Code TreeView with polymorphic nodes implementing `PortfolioExplorerNode`
- **WebView UIs**: `src/views/` - HTML-based editors for portfolio updates, asset definition, and detail pages
- **Extension Entry**: `src/extension.ts` - Command registration and provider initialization

## Key Conventions

### Code Struction
- /src/ for source code
- /test/ for test code, you need to compile the test code as well after code changes.
- /prd/ for Product Requirements Documents
- /doc/ for user-facing documentation
- /design/ for design and implementation summaries

### File Structure
- Portfolio data lives in `Assets/portfolio.json` (asset definitions, accounts, tags)
- Updates stored in `AssetUpdates/*.json` (time-series value tracking)
- Category definitions in `Assets/category.json` (tag-based grouping rules)
- Sample/test data in `test/testAssets/` and `prd/*/sample.json`

### Data Access Pattern
Always use `PortfolioDataAccess` instead of direct `PortfolioDataStore` access. The access layer provides:
- Caching of Asset/Account/Category objects
- Event emission for UI refresh (`onDataUpdated`)
- Higher-level operations (e.g., `getAssetsByTag`, `getAllAssets`)

### Node Hierarchy
Tree nodes implement `PortfolioExplorerNode` with `nodeType` and polymorphic `getChildren()`:
```typescript
// Root level: Portfolio, Categories, Tags
// Portfolio children: AccountNode + standalone AssetNode
// Category children: CategoryNode (sub-categories) + AssetNode (standalone assets)
```

### Asset Identification
Assets use compound naming: `accountName.assetName` for account assets, `assetName` for standalone assets. All internal operations use full names from `asset.getFullName()`.

## Development Workflows

### Build & Test
```bash
npm run watch      # Auto-compile TypeScript (background task)
npm run test       # Run all tests
npm run lint       # ESLint validation
```

### Adding New Features
1. Features are usually defined in PRD documents under `prd/` by the user
2. Update interfaces in `src/data/interfaces.ts` for new data structures
3. Extend business logic in `src/data/` classes (Asset, Account, Category)
4. Add tree nodes in `src/providers/` if needed for tree view
5. Register commands in `src/extension.ts`
6. Update the PRD with the clarification the user provided in the chat
7. Generate product doc targeting the end users in /doc folder and decide if the README.md needs to be updated
8. Generate a design/implementation summary in /design folder.

### WebView Pattern
WebViews follow this structure:
- TypeScript class in `src/views/*/` manages lifecycle and messaging
- HTML template with `<script>` for client-side logic
- Message passing via `webview.postMessage()` and `onDidReceiveMessage()`
- Always use `retainContextWhenHidden: true` for complex forms

## Testing Patterns
- Use sample data from `test/testAssets/` for consistent test scenarios
- Tests should be written in vscode test framework
- Business logic tests focus on data layer (`*.test.ts`)
- Manual testing scripts in `test/manual*.js` for UI interactions
- Test data includes multi-currency, account, and tag scenarios

## Integration Points
- **File System**: Portfolio/update files in workspace `Assets/` directory
- **VS Code APIs**: TreeDataProvider, WebviewPanel, commands, file watching
- **Currency**: CNY as base currency with USD/EUR/GBP exchange rate support
- **External Data**: No external APIs - all data is workspace-local JSON

## Critical Implementation Notes
- Always add suffix `Data` to interfaces representing JSON data structures
- Always invalidate caches after data updates (`dataAccess.invalidateAllCaches()`)
- Use `asset.getFullName()` for consistent asset identification across the system
- Category membership determined by tag intersection, not parent/child relationships
- Exchange rates are entered manually during portfolio updates, not fetched automatically
- Asset types: `simple` (current value), `investment` (current value), `composite` (current + market value), `stock` (shares × price)
- Always update the testAssets/testSimpleLayout to include sample data for test after implementing new features.
