import { AccountDefinitionData, AssetCurrentValueData } from './interfaces';
import { PortfolioDataAccess } from './portfolioDataAccess';
import { Asset } from './asset';
import { AssetCollection } from './assetCollection';

/**
 * Represents an Account in the portfolio
 * An Account is a collection of Assets
 */
export class Account {
    public readonly definitionData: AccountDefinitionData;
    private dataAccess: PortfolioDataAccess;

    constructor(definition: AccountDefinitionData, dataAccess: PortfolioDataAccess) {
        this.definitionData = definition;
        this.dataAccess = dataAccess;
    }

    public get name(): string {
        return this.definitionData.name;
    }

    public get type(): string {
        return this.definitionData.type;
    }

    /**
     * Get all assets that belong to this account
     */
    public async getAssets(): Promise<Asset[]> {        
        const assets: Asset[] = [];

        if (this.definitionData.assets) {
            for (const assetDefinition of this.definitionData.assets) {
                const asset = await this.dataAccess.getAsset(assetDefinition.name, this.name);
                assets.push(asset);
            }
        }

        return assets;
    }

    /**
     * Calculate the total current value of all assets in this account
     */
    public async calculateTotalValue(): Promise<AssetCurrentValueData> {
        const assets = await this.getAssets();
        return await AssetCollection.calculateCurrentValue(assets);
    }
}
