// Data interfaces representing on-disk JSON structures
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

// In-memory business logic interfaces
export interface AssetCurrentValueData {
    name: string;
    currentValue: number;
    currency: string;
    valueInCNY: number;
    lastUpdateDate?: string;
}

export interface AssetActivityData {
    id: string;
    type: 'income' | 'expense' | 'transfer_in' | 'transfer_out' | 'snapshot';
    amount: number;
    date: string;
    description?: string;
    relatedAsset?: string; // For transfers
}

export interface AssetSummaryData {
    definition: AssetDefinitionData;
    currentValue: AssetCurrentValueData;
    lastMonthIncome?: number; // For simple assets
    activities: AssetActivityData[];
}
