import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import {
    CategoryDefinitionData,
    PortfolioData,
    PortfolioUpdateData
} from './interfaces';

export class PortfolioDataStore {
    constructor(private workspaceFolder: vscode.WorkspaceFolder) {}

    // Portfolio definition operations
    async loadPortfolioData(): Promise<PortfolioData | undefined> {
        console.log('Loading portfolio data from file');
        return await this.loadPortfolioDataFromFile();
    }

    private async loadPortfolioDataFromFile(): Promise<PortfolioData | undefined> {
        try {
            const assetsFolder = path.join(this.workspaceFolder.uri.fsPath, 'Assets');
            const portfolioJsonPath = path.join(assetsFolder, 'portfolio.json');
            
            if (!fs.existsSync(portfolioJsonPath)) {
                return undefined;
            }

            const portfolioContent = fs.readFileSync(portfolioJsonPath, 'utf8');
            const rawPortfolioData = JSON.parse(portfolioContent) as PortfolioData;
            
            // Validate the structure
            if (!rawPortfolioData.assets || !Array.isArray(rawPortfolioData.assets)) {
                console.error('Invalid portfolio.json: "assets" array is required');
                return undefined;
            }
            
            // Validate each asset
            for (const asset of rawPortfolioData.assets) {
                if (!asset.name || !asset.type) {
                    console.error('Invalid portfolio.json: Each asset must have "name" and "type" fields');
                    return undefined;
                }
                
                if (!['simple', 'investment', 'composite', 'stock'].includes(asset.type)) {
                    console.error(`Invalid asset type "${asset.type}". Must be one of: simple, investment, composite, stock`);
                    return undefined;
                }
            }
            
            return rawPortfolioData;
        } catch (error) {
            console.error('Error loading portfolio.json:', error);
            return undefined;
        }
    }

    async savePortfolioData(data: PortfolioData): Promise<void> {
        try {
            const assetsFolder = path.join(this.workspaceFolder.uri.fsPath, 'Assets');
            const portfolioJsonPath = path.join(assetsFolder, 'portfolio.json');
            
            // Create Assets folder if it doesn't exist
            if (!fs.existsSync(assetsFolder)) {
                fs.mkdirSync(assetsFolder, { recursive: true });
            }
            
            // Create backup if file exists
            if (fs.existsSync(portfolioJsonPath)) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                const backupPath = path.join(assetsFolder, `portfolio-backup-${timestamp}.json`);
                fs.copyFileSync(portfolioJsonPath, backupPath);
                console.log(`Backup created: ${backupPath}`);
            }

            // Format and save the data
            const jsonContent = JSON.stringify(data, null, 2);
            fs.writeFileSync(portfolioJsonPath, jsonContent, 'utf8');
            
            console.log(`Portfolio saved with ${data.assets.length} asset definitions`);
        } catch (error) {
            console.error('Error saving portfolio data:', error);
            throw error;
        }
    }

    // Asset update operations
    async loadAssetUpdates(): Promise<PortfolioUpdateData[]> {
        return await this.loadAssetUpdateFiles();
    }

    private async loadAssetUpdateFiles(): Promise<PortfolioUpdateData[]> {
        const assetUpdatesFolder = path.join(this.workspaceFolder.uri.fsPath, 'AssetUpdates');
        
        if (!fs.existsSync(assetUpdatesFolder)) {
            return [];
        }

        const files = fs.readdirSync(assetUpdatesFolder)
            .filter(file => file.endsWith('.json'))
            .sort(); // Sort to ensure chronological order

        const updates: PortfolioUpdateData[] = [];
        
        for (const file of files) {
            try {
                const filePath = path.join(assetUpdatesFolder, file);
                const content = fs.readFileSync(filePath, 'utf8');
                const update = JSON.parse(content) as PortfolioUpdateData;
                updates.push(update);
            } catch (error) {
                console.error(`Error loading asset update file ${file}:`, error);
            }
        }

        return updates;
    }

    async saveAssetUpdate(update: PortfolioUpdateData): Promise<string> {
        try {
            const assetUpdatesFolder = path.join(this.workspaceFolder.uri.fsPath, 'AssetUpdates');
            
            // Create AssetUpdates folder if it doesn't exist
            if (!fs.existsSync(assetUpdatesFolder)) {
                fs.mkdirSync(assetUpdatesFolder, { recursive: true });
            }

            // Create filename with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const filename = `portfolio-update-${timestamp}.json`;
            const filePath = path.join(assetUpdatesFolder, filename);

            // Format and save the data
            const jsonContent = JSON.stringify(update, null, 2);
            fs.writeFileSync(filePath, jsonContent, 'utf8');

            console.log(`Asset update saved to ${filename}`);
            return filename;
        } catch (error) {
            console.error('Error saving asset update:', error);
            throw error;
        }
    }

    // Category definition operations
    async loadCategoryDefinitions(): Promise<CategoryDefinitionData | undefined> {
        console.log('Loading category definitions from file');
        return await this.loadCategoryDefinitionsFromFile();
    }

    private async loadCategoryDefinitionsFromFile(): Promise<CategoryDefinitionData | undefined> {
        try {
            const assetsFolder = path.join(this.workspaceFolder.uri.fsPath, 'Assets');
            const categoryJsonPath = path.join(assetsFolder, 'category.json');
            
            if (!fs.existsSync(categoryJsonPath)) {
                console.log('category.json not found');
                return undefined;
            }

            const categoryContent = fs.readFileSync(categoryJsonPath, 'utf8');
            const rawCategoryData = JSON.parse(categoryContent) as CategoryDefinitionData;
            
            // Validate the structure
            if (!rawCategoryData.categoryTypes || !Array.isArray(rawCategoryData.categoryTypes)) {
                console.error('Invalid category.json: "categoryTypes" array is required');
                return undefined;
            }
            
            // Validate each category type
            for (const categoryType of rawCategoryData.categoryTypes) {
                if (!categoryType.name || !categoryType.categories || !Array.isArray(categoryType.categories)) {
                    console.error('Invalid category.json: Each categoryType must have "name" and "categories" fields');
                    return undefined;
                }
                
                // Validate each category
                for (const category of categoryType.categories) {
                    if (!category.name || !category.tags || !Array.isArray(category.tags)) {
                        console.error('Invalid category.json: Each category must have "name" and "tags" fields');
                        return undefined;
                    }
                }
            }
            
            return rawCategoryData;
        } catch (error) {
            console.error('Error loading category.json:', error);
            return undefined;
        }
    }
}
