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
                if (!categoryType.name ) {
                    console.error('Invalid category.json: Each categoryType must have "name" and "categories" fields');
                    return undefined;
                }
            }
            
            return rawCategoryData;
        } catch (error) {
            console.error('Error loading category.json:', error);
            return undefined;
        }
    }

    // Asset rename operations
    async renameAssetInAllFiles(oldName: string, newName: string): Promise<void> {
        try {
            console.log(`Starting asset rename: "${oldName}" -> "${newName}"`);
            
            // Step 1: Find files that will be changed
            const filesToChange = await this.findFilesWithAssetReferences(oldName);
            
            if (filesToChange.length === 0) {
                console.log(`No files contain references to asset "${oldName}". No backup or update needed.`);
                return;
            }
            
            // Step 2: Create backup folder with UTF-8 encoded name
            const backupFolderName = `${oldName}.rename.bak`;
            const backupFolder = await this.createBackupFolder(backupFolderName);
            
            // Step 3: Backup only the files that will be changed
            await this.backupSpecificFiles(backupFolder, filesToChange);
            
            // Step 4: Update all portfolio update files
            await this.updateAssetNameInPortfolioUpdates(oldName, newName);
            
            console.log(`Asset rename completed successfully. Backups stored in: ${backupFolder}`);
        } catch (error) {
            console.error('Error during asset rename:', error);
            throw new Error(`Failed to rename asset "${oldName}" to "${newName}": ${error}`);
        }
    }

    private async findFilesWithAssetReferences(assetName: string): Promise<string[]> {
        const assetUpdatesFolder = path.join(this.workspaceFolder.uri.fsPath, 'AssetUpdates');
        
        if (!fs.existsSync(assetUpdatesFolder)) {
            return [];
        }

        const files = fs.readdirSync(assetUpdatesFolder)
            .filter(file => file.endsWith('.json'));

        const filesToChange: string[] = [];
        
        for (const file of files) {
            const filePath = path.join(assetUpdatesFolder, file);
            
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                const update = JSON.parse(content) as PortfolioUpdateData;
                let hasReference = false;
                
                // Check if asset is referenced in the assets array
                if (update.assets && Array.isArray(update.assets)) {
                    for (const asset of update.assets) {
                        if (asset.name === assetName) {
                            hasReference = true;
                            break;
                        }
                    }
                }
                
                // Check if asset is referenced in transfers
                if (!hasReference && update.transfers && Array.isArray(update.transfers)) {
                    for (const transfer of update.transfers) {
                        if (transfer.from === assetName || transfer.to === assetName) {
                            hasReference = true;
                            break;
                        }
                    }
                }
                
                if (hasReference) {
                    filesToChange.push(file);
                    console.log(`Found reference to "${assetName}" in ${file}`);
                }
                
            } catch (error) {
                console.error(`Error reading file ${file}:`, error);
                // Include the file in backup if we can't read it, to be safe
                filesToChange.push(file);
            }
        }
        
        console.log(`Found ${filesToChange.length} files with references to "${assetName}"`);
        return filesToChange;
    }

    private async backupSpecificFiles(backupFolder: string, filesToBackup: string[]): Promise<void> {
        const assetUpdatesFolder = path.join(this.workspaceFolder.uri.fsPath, 'AssetUpdates');
        
        if (filesToBackup.length === 0) {
            console.log('No files to backup');
            return;
        }

        console.log(`Backing up ${filesToBackup.length} specific portfolio update files`);
        
        for (const file of filesToBackup) {
            const sourcePath = path.join(assetUpdatesFolder, file);
            const destPath = path.join(backupFolder, file);
            
            if (fs.existsSync(sourcePath)) {
                fs.copyFileSync(sourcePath, destPath);
                console.log(`Backed up ${file}`);
            } else {
                console.warn(`Source file ${file} not found, skipping backup`);
            }
        }
        
        console.log(`Backup completed: ${filesToBackup.length} files backed up to ${backupFolder}`);
    }

    private async createBackupFolder(folderName: string): Promise<string> {
        // Ensure proper UTF-8 encoding for folder names with Unicode characters
        // This is important for Chinese characters and other non-ASCII characters
        const backupFolder = path.join(this.workspaceFolder.uri.fsPath, folderName);
        
        if (fs.existsSync(backupFolder)) {
            // If backup folder already exists, add timestamp to make it unique
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const uniqueFolderName = `${folderName}-${timestamp}`;
            const uniqueBackupFolder = path.join(this.workspaceFolder.uri.fsPath, uniqueFolderName);
            
            // Use recursive option to ensure proper encoding throughout the path
            fs.mkdirSync(uniqueBackupFolder, { recursive: true });
            console.log(`Created backup folder: ${uniqueBackupFolder}`);
            return uniqueBackupFolder;
        } else {
            // Use recursive option to ensure proper encoding throughout the path
            fs.mkdirSync(backupFolder, { recursive: true });
            console.log(`Created backup folder: ${backupFolder}`);
            return backupFolder;
        }
    }

    private async updateAssetNameInPortfolioUpdates(oldName: string, newName: string): Promise<void> {
        const assetUpdatesFolder = path.join(this.workspaceFolder.uri.fsPath, 'AssetUpdates');
        
        if (!fs.existsSync(assetUpdatesFolder)) {
            console.log('No AssetUpdates folder found, skipping portfolio update file updates');
            return;
        }

        const files = fs.readdirSync(assetUpdatesFolder)
            .filter(file => file.endsWith('.json'));

        let filesUpdated = 0;
        
        for (const file of files) {
            const filePath = path.join(assetUpdatesFolder, file);
            
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                const update = JSON.parse(content) as PortfolioUpdateData;
                let fileModified = false;
                
                // Update asset names in the assets array
                if (update.assets && Array.isArray(update.assets)) {
                    for (const asset of update.assets) {
                        if (asset.name === oldName) {
                            asset.name = newName;
                            fileModified = true;
                            console.log(`Updated asset name in ${file}: ${oldName} -> ${newName}`);
                        }
                    }
                }
                
                // Update asset names in transfers (from/to fields)
                if (update.transfers && Array.isArray(update.transfers)) {
                    for (const transfer of update.transfers) {
                        if (transfer.from === oldName) {
                            transfer.from = newName;
                            fileModified = true;
                            console.log(`Updated transfer 'from' field in ${file}: ${oldName} -> ${newName}`);
                        }
                        if (transfer.to === oldName) {
                            transfer.to = newName;
                            fileModified = true;
                            console.log(`Updated transfer 'to' field in ${file}: ${oldName} -> ${newName}`);
                        }
                    }
                }
                
                // Save the file if it was modified
                if (fileModified) {
                    const updatedContent = JSON.stringify(update, null, 2);
                    fs.writeFileSync(filePath, updatedContent, 'utf8');
                    filesUpdated++;
                }
                
            } catch (error) {
                console.error(`Error updating file ${file}:`, error);
                // Continue with other files even if one fails
            }
        }
        
        console.log(`Portfolio update files processed: ${filesUpdated} files updated out of ${files.length} total files`);
    }
}
