# AssetPage Feature Design Document

## Overview
This document outlines the design for implementing the AssetPage feature as described in the PRD, along with a comprehensive refactoring to improve data handling and architecture.

## Current Architecture Analysis

### Issues with Current Architecture
1. **PortfolioValueCalculator Anti-pattern**: The current `PortfolioValueCalculator` class violates the Single Responsibility Principle by handling:
   - File I/O operations
   - Asset event merging logic
   - Exchange rate calculations
   - Value calculations

2. **Redundant File Operations**: Multiple components (tree view, asset nodes, webviews) independently load and parse asset data files, leading to:
   - Performance issues due to repeated file I/O
   - Inconsistent data state across components
   - Difficult caching and state management

3. **Tight Coupling**: Asset nodes directly instantiate `PortfolioValueCalculator`, making testing and maintenance difficult.

4. **No Central Data Management**: Each component manages its own data loading and caching, leading to potential inconsistencies.

## Proposed Architecture

### 1. Core Data Model Refactoring

#### 1.1 Data Interfaces (On-Disk Structures)
```typescript
// All data interfaces representing on-disk JSON structures
export interface AssetDefinitionData {
    name: string;
    type: 'simple' | 'investment' | 'composite' | 'stock';
    currency?: string;
}

export interface PortfolioData {
    assets: AssetDefinitionData[];
}

export interface AssetEventData {
    type: 'snapshot' | 'income' | 'expense';
    currentValue?: number;
    marketValue?: number;
    shares?: number;
    price?: number;
    amount?: number;
    date?: string;
    description?: string;
}

export interface AssetUpdateData {
    name: string;
    date?: string;
    events: AssetEventData[];
}

export interface TransferData {
    from: string;
    to: string;
    amount: number;
    date?: string;
    description?: string;
}

export interface ExchangeRateData {
    from: string;
    rate: number;
    date?: string;
}

export interface PortfolioUpdateData {
    date: string;
    assets: AssetUpdateData[];
    transfers?: TransferData[];
    exchangeRates?: ExchangeRateData[];
}
```

#### 1.2 PortfolioDataStore Class
```typescript
export class PortfolioDataStore {
    private workspaceFolder: vscode.WorkspaceFolder;
    private portfolioDataCache?: PortfolioData;
    private assetUpdatesCache?: PortfolioUpdateData[];

    constructor(workspaceFolder: vscode.WorkspaceFolder);
    
    // Portfolio definition operations
    async loadPortfolioData(): Promise<PortfolioData | undefined>;
    async savePortfolioData(data: PortfolioData): Promise<void>;
    invalidatePortfolioCache(): void;
    
    // Asset update operations
    async loadAssetUpdates(): Promise<PortfolioUpdateData[]>;
    async saveAssetUpdate(update: PortfolioUpdateData): Promise<string>;
    invalidateAssetUpdatesCache(): void;
    
    // Exchange rate operations
    getAllExchangeRates(updates?: PortfolioUpdateData[]): Map<string, ExchangeRateData[]>;
    findClosestExchangeRate(currency: string, targetDate: string, allRates: Map<string, ExchangeRateData[]>): number | undefined;
}
```

#### 1.3 Asset Class (In-Memory Business Logic)
```typescript
export interface AssetCurrentValue {
    name: string;
    currentValue: number;
    currency: string;
    valueInCNY: number;
    lastUpdateDate?: string;
}

export interface AssetActivity {
    id: string;
    type: 'income' | 'expense' | 'transfer_in' | 'transfer_out' | 'snapshot';
    amount: number;
    date: string;
    description?: string;
    relatedAsset?: string; // For transfers
}

export interface AssetSummary {
    definition: AssetDefinitionData;
    currentValue: AssetCurrentValue;
    lastMonthIncome?: number; // For simple assets
    activities: AssetActivity[];
}

export class Asset {
    private definition: AssetDefinitionData;
    private latestSnapshot?: { event: AssetEventData; date: string };
    private activities: AssetActivity[] = [];
    private currentValueCache?: AssetCurrentValue;
    
    constructor(
        definition: AssetDefinitionData,
        private dataStore: PortfolioDataStore
    );
    
    // Core properties
    get name(): string;
    get type(): string;
    get currency(): string;
    
    // Value calculations
    async calculateCurrentValue(): Promise<AssetCurrentValue>;
    private calculateAssetValue(event: AssetEventData): number;
    
    // Activity management
    async loadActivities(): Promise<AssetActivity[]>;
    getLastMonthIncome(): number;
    
    // Summary generation
    async generateSummary(): Promise<AssetSummary>;
    
    // Cache management
    invalidateCache(): void;
}
```

### 2. AssetPage Implementation

#### 2.1 AssetPageView Class
```typescript
export class AssetPageView {
    private panel: vscode.WebviewPanel;
    private asset: Asset;
    private disposables: vscode.Disposable[] = [];
    
    constructor(
        extensionUri: vscode.Uri,
        asset: Asset
    );
    
    // Activity management
    private onAddActivity(data: any): void;
    private onUpdateActivity(data: any): void;
    private onDeleteActivity(data: any): void;
    
    // Data synchronization
    private async refreshData(): Promise<void>;
    private sendAssetData(): void;
    
    public dispose(): void;
}
```

#### 2.2 AssetPage HTML Structure
```html
<!DOCTYPE html>
<html>
<head>
    <title>Asset Details</title>
    <!-- Styling consistent with other views -->
</head>
<body>
    <!-- Asset Header Section -->
    <div class="asset-header">
        <h1 class="asset-name">{{assetName}}</h1>
        <span class="asset-type-badge">{{assetType}}</span>
    </div>
    
    <!-- Asset Key Data Section -->
    <div class="asset-key-data">
        <div class="current-value">
            <label>Current Value</label>
            <span class="value">{{currentValue}}</span>
        </div>
        <div class="last-month-income" id="lastMonthIncome" style="display: none;">
            <label>Last Month Income</label>
            <span class="value">{{lastMonthIncome}}</span>
        </div>
    </div>
    
    <!-- Asset Activities Section -->
    <div class="asset-activities">
        <div class="activities-header">
            <h2>Activities</h2>
            <button class="btn btn-primary" onclick="addActivity()">Add Activity</button>
        </div>
        <div class="activities-list" id="activitiesList">
            <!-- Activities will be populated here -->
        </div>
    </div>
    
    <!-- Add Activity Modal -->
    <div class="modal" id="addActivityModal">
        <!-- Modal content similar to portfolioUpdate.html -->
    </div>
</body>
</html>
```

### 3. Integration with Existing Components

#### 3.1 Updated AssetNode Class
```typescript
export class AssetNode extends vscode.TreeItem implements PortfolioExplorerNode {
    public nodeType: 'asset' = 'asset';
    public assetData: AssetDefinitionData;
    public asset: Asset; // Reference to Asset instance
    
    constructor(asset: Asset, description?: string);
    
    static async createWithCurrentValue(asset: Asset): Promise<AssetNode>;
    
    // Command handling
    async openAssetPage(context: vscode.ExtensionContext): Promise<void>;
}
```

#### 3.2 Updated PortfolioExplorerProvider
```typescript
export class PortfolioExplorerProvider implements vscode.TreeDataProvider<PortfolioExplorerNode> {
    private dataStore: PortfolioDataStore;
    private assetCache: Map<string, Asset> = new Map();
    
    constructor(private context: vscode.ExtensionContext);
    
    // Asset management
    private async createAsset(definition: AssetDefinitionData): Promise<Asset>;
    private getCachedAsset(name: string): Asset | undefined;
    public invalidateAssetCache(): void;
    
    // Asset page handling
    public async openAssetPage(assetName: string): Promise<void>;
}
```

### 4. Extension Commands

#### 4.1 New Command Registration
```typescript
// In extension.ts
const disposableOpenAssetPage = vscode.commands.registerCommand(
    'vscode-portfolio-insight.openAssetPage',
    async (assetNode: AssetNode) => {
        if (assetNode && assetNode.nodeType === 'asset') {
            await assetNode.openAssetPage(context);
        }
    }
);
```

#### 4.2 Tree View Click Handler
```typescript
// In extension.ts
treeView.onDidChangeSelection(e => {
    if (e.selection && e.selection.length > 0) {
        currentSelection = e.selection[0];
        // Auto-open asset page when asset is clicked
        if (currentSelection.nodeType === 'asset') {
            vscode.commands.executeCommand('vscode-portfolio-insight.openAssetPage', currentSelection);
        }
    } else {
        currentSelection = null;
    }
});
```

### 5. Migration Strategy

#### 5.1 Phase 1: Data Layer Refactoring
1. Create `PortfolioDataStore` class
2. Create `Asset` class with basic functionality
3. Update existing tests to use new architecture
4. Migrate `PortfolioValueCalculator` functionality

#### 5.2 Phase 2: Provider Integration
1. Update `PortfolioExplorerProvider` to use `PortfolioDataStore`
2. Update `AssetNode` to use `Asset` instances
3. Add asset caching mechanism
4. Update existing webviews to use new data layer

#### 5.3 Phase 3: AssetPage Implementation
1. Create `AssetPageView` class
2. Implement asset page HTML/CSS
3. Add activity management functionality
4. Register commands and event handlers

### 6. Testing Strategy

#### 6.1 Unit Tests
```typescript
describe('PortfolioDataStore', () => {
    // Test file operations
    // Test caching behavior
    // Test error handling
});

describe('Asset', () => {
    // Test value calculations
    // Test activity management
    // Test cache invalidation
});

describe('AssetPageView', () => {
    // Test webview creation
    // Test data synchronization
    // Test activity operations
});
```

#### 6.2 Integration Tests
```typescript
describe('AssetPage Integration', () => {
    // Test end-to-end asset page opening
    // Test data flow between components
    // Test error scenarios
});
```

### 7. File Structure

```
src/
├── data/
│   ├── portfolioDataStore.ts
│   ├── asset.ts
│   └── interfaces.ts
├── services/
│   └── (portfolioValueCalculator.ts - deprecated)
├── providers/
│   ├── portfolioExplorerProvider.ts (updated)
│   ├── assetNode.ts (updated)
│   └── assetCollectionNode.ts (updated)
├── views/
│   ├── assetPage/
│   │   ├── assetPageView.ts
│   │   ├── assetPage.html
│   │   └── assetPage.css
│   ├── portfolioUpdate/ (existing)
│   └── portfolioEdit/ (existing)
└── extension.ts (updated)
```

### 8. Benefits of This Architecture

1. **Separation of Concerns**: Clear separation between data access, business logic, and presentation
2. **Performance**: Caching at multiple levels reduces file I/O operations
3. **Maintainability**: Single responsibility classes are easier to test and modify
4. **Extensibility**: New features can be added without modifying existing components
5. **Consistency**: Central data management ensures consistent state across components
6. **Testability**: Dependency injection makes unit testing straightforward

### 9. Backward Compatibility

- Existing file formats remain unchanged
- Existing commands continue to work
- Gradual migration path allows testing at each step
- Deprecated classes can be removed after migration is complete

### 10. Performance Considerations

- Asset instances are cached and reused
- File operations are minimized through caching
- Lazy loading of asset data
- Efficient data structures for large portfolios

This architecture provides a solid foundation for the AssetPage feature while addressing the current technical debt and setting up the codebase for future enhancements.
