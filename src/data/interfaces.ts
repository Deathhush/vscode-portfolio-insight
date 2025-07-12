// Data interfaces representing on-disk JSON structures
export interface AssetDefinitionData {
    name: string;
    type: 'simple' | 'investment' | 'composite' | 'stock';
    currency?: string;
    tags?: string[];
    account?: string; // Add account reference
}

export interface AccountDefinitionData {
    name: string;
    type: string;
    assets?: AssetDefinitionData[]; // Assets can be nested in accounts
}

export interface PortfolioData {
    assets: AssetDefinitionData[];
    accounts?: AccountDefinitionData[]; // Add accounts array
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
    amount?: number;
    totalValue?: number;
    unitPrice?: number;
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

// In-memory business logic interfaces
export interface AssetCurrentValueData {
    currentValue: number;
    currency: string;
    valueInCNY: number;
    lastUpdateDate?: string;
}

export interface AssetActivityData {
    id: string;
    type: 'income' | 'expense' | 'transfer_in' | 'transfer_out' | 'buy' | 'sell' | 'snapshot';
    amount?: number; // Optional - for stock snapshots, this represents shares; for others, it's the monetary amount
    totalValue: number; // Always calculated and required
    date: string;
    description?: string;
    relatedAsset?: string; // For transfers
    unitPrice?: number; // For buy/sell operations
    exchangeRate?: number; // Exchange rate used for currency conversion in this activity
}

export interface AssetSummaryData {
    definition: AssetDefinitionData;
    currentValue: AssetCurrentValueData;
    lastMonthIncome?: number; // For simple assets
    activities: AssetActivityData[];
}

// Category-related interfaces
export interface CategoryData {
    name: string;
    tags: string[];
}

export interface CategoryTypeData {
    name: string;
    categories: CategoryData[];
}

export interface CategoryDefinitionData {
    categoryTypes: CategoryTypeData[];
}

// In-memory business logic interfaces for categories
export interface CategorySummaryData {
    definition: CategoryData;
    assets: AssetSummaryData[];
    totalValue: AssetCurrentValueData;
}

export interface CategoryTypeSummaryData {
    definition: CategoryTypeData;
    categories: CategorySummaryData[];
    totalValue: AssetCurrentValueData;
}

// Account-related interfaces
export interface AccountSummaryData {
    definition: AccountDefinitionData;
    assets: AssetSummaryData[];
    totalValue: AssetCurrentValueData;
}
