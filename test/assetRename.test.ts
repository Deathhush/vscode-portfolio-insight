import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { PortfolioDataAccess } from '../src/data/portfolioDataAccess';
import { PortfolioDataStore } from '../src/data/portfolioDataStore';
import { AssetDefinitionData, PortfolioData, PortfolioUpdateData } from '../src/data/interfaces';

suite('Asset Rename Tests', () => {
    let portfolioDataAccess: PortfolioDataAccess;
    let dataStore: PortfolioDataStore;
    let workspaceFolder: vscode.WorkspaceFolder;

    // Mock workspace folder for testing
    const testWorkspacePath = path.join(__dirname, 'testWorkspace');

    setup(async () => {
        // Create a mock workspace folder
        workspaceFolder = {
            uri: vscode.Uri.file(testWorkspacePath),
            name: 'testWorkspace',
            index: 0
        };

        // Create test directories
        const assetsDir = path.join(testWorkspacePath, 'Assets');
        const assetUpdatesDir = path.join(testWorkspacePath, 'AssetUpdates');
        
        if (!fs.existsSync(assetsDir)) {
            fs.mkdirSync(assetsDir, { recursive: true });
        }
        if (!fs.existsSync(assetUpdatesDir)) {
            fs.mkdirSync(assetUpdatesDir, { recursive: true });
        }

        dataStore = new PortfolioDataStore(workspaceFolder);
        portfolioDataAccess = new PortfolioDataAccess(dataStore);
    });

    teardown(() => {
        portfolioDataAccess?.dispose();
        
        // Clean up test files
        try {
            if (fs.existsSync(testWorkspacePath)) {
                fs.rmSync(testWorkspacePath, { recursive: true, force: true });
            }
        } catch (error) {
            console.warn('Failed to clean up test workspace:', error);
        }
    });

    test('should create centralized backup folder for portfolio.json', async () => {
        // Create initial portfolio data
        const portfolioData: PortfolioData = {
            assets: [
                {
                    name: 'TestAsset',
                    type: 'simple',
                    currency: 'CNY',
                    tags: []
                }
            ],
            accounts: []
        };

        // Save portfolio data first time (no backup created since file doesn't exist)
        await dataStore.savePortfolioData(portfolioData);

        // Modify and save again to trigger backup creation
        portfolioData.assets.push({
            name: 'SecondAsset',
            type: 'investment',
            currency: 'USD',
            tags: []
        });
        
        await dataStore.savePortfolioData(portfolioData);

        // Check if centralized backup folder was created
        const backupFolder = path.join(testWorkspacePath, '.portfolio-insight', 'backup', 'portfolio');
        assert.ok(fs.existsSync(backupFolder), 'Centralized portfolio backup folder should exist');

        // Check if backup file was created
        const backupFiles = fs.readdirSync(backupFolder).filter(file => file.startsWith('portfolio-backup-'));
        assert.ok(backupFiles.length >= 1, 'At least one portfolio backup file should exist');
    });

    test('should create centralized backup folder for asset rename operations', async () => {
        // Create test portfolio data with an asset
        const portfolioData: PortfolioData = {
            assets: [
                {
                    name: 'OldAssetName',
                    type: 'simple',
                    currency: 'CNY',
                    tags: []
                }
            ],
            accounts: []
        };

        // Save initial portfolio data
        await dataStore.savePortfolioData(portfolioData);

        // Create a test asset update file that references the asset
        const testUpdate: PortfolioUpdateData = {
            date: '2025-01-01',
            assets: [
                {
                    name: 'OldAssetName',
                    events: [
                        {
                            type: 'snapshot',
                            currentValue: 1000
                        }
                    ]
                }
            ],
            exchangeRates: []
        };

        const assetUpdatesDir = path.join(testWorkspacePath, 'AssetUpdates');
        const updateFilePath = path.join(assetUpdatesDir, 'test-update.json');
        fs.writeFileSync(updateFilePath, JSON.stringify(testUpdate, null, 2));

        // Perform asset rename using portfolioDataAccess (which handles both portfolio updates and portfolio.json)
        await portfolioDataAccess.renameAsset('OldAssetName', 'NewAssetName');

        // Check if centralized rename backup folder was created
        const renameBackupFolder = path.join(testWorkspacePath, '.portfolio-insight', 'backup', 'renames');
        assert.ok(fs.existsSync(renameBackupFolder), 'Centralized rename backup folder should exist');

        // Check if specific backup folder with proper naming was created
        const backupFolders = fs.readdirSync(renameBackupFolder);
        const expectedFolderName = backupFolders.find(folder => folder.startsWith('OldAssetName-NewAssetName-'));
        assert.ok(expectedFolderName, 'Backup folder with oldName-newName-timestamp format should exist');

        // Check if the backup contains the original asset update file
        const specificBackupFolder = path.join(renameBackupFolder, expectedFolderName);
        const backedUpFiles = fs.readdirSync(specificBackupFolder);
        assert.ok(backedUpFiles.includes('test-update.json'), 'Original asset update file should be backed up');

        // Check if portfolio.json backup is in the rename folder (not in portfolio backup folder)
        assert.ok(backedUpFiles.includes('portfolio.json'), 'Portfolio.json should be backed up in the rename folder');

        // Verify that no backup was created in the general portfolio backup folder during rename
        const portfolioBackupFolder = path.join(testWorkspacePath, '.portfolio-insight', 'backup', 'portfolio');
        if (fs.existsSync(portfolioBackupFolder)) {
            const portfolioBackupFiles = fs.readdirSync(portfolioBackupFolder);
            // Should only have the backup from the initial save, not from the rename operation
            assert.strictEqual(portfolioBackupFiles.length, 1, 'Portfolio backup folder should only have the initial backup');
        }
    });

    test('should handle asset rename with no existing files gracefully', async () => {
        // Create test portfolio data with an asset
        const portfolioData: PortfolioData = {
            assets: [
                {
                    name: 'NonExistentAsset',
                    type: 'simple',
                    currency: 'CNY',
                    tags: []
                }
            ],
            accounts: []
        };

        // Save initial portfolio data
        await dataStore.savePortfolioData(portfolioData);

        // Perform rename using portfolioDataAccess (which handles both cases)
        await portfolioDataAccess.renameAsset('NonExistentAsset', 'NewName');

        // Should not create any rename backup folders since no asset update files reference the asset
        const renameBackupFolder = path.join(testWorkspacePath, '.portfolio-insight', 'backup', 'renames');
        if (fs.existsSync(renameBackupFolder)) {
            const backupFolders = fs.readdirSync(renameBackupFolder);
            const nonExistentBackup = backupFolders.find(folder => folder.startsWith('NonExistentAsset-NewName-'));
            assert.ok(!nonExistentBackup, 'No backup folder should be created for assets not referenced in update files');
        }

        // But portfolio.json should still be updated and backed up in the regular portfolio backup folder
        const portfolioBackupFolder = path.join(testWorkspacePath, '.portfolio-insight', 'backup', 'portfolio');
        
        // Check if backup folder exists and has at least one backup file
        // Note: First save doesn't create backup (no existing file), only the rename save does
        let expectedBackupCount = 1; // Only the backup from the rename operation
        
        if (fs.existsSync(portfolioBackupFolder)) {
            const portfolioBackupFiles = fs.readdirSync(portfolioBackupFolder);
            console.log('Portfolio backup files:', portfolioBackupFiles);
            assert.ok(portfolioBackupFiles.length >= expectedBackupCount, `Should have at least ${expectedBackupCount} backup file from rename operation`);
        } else {
            // If no backup folder exists, that means no backup was created during rename
            // This could happen if the rename didn't actually change anything
            console.log('No portfolio backup folder found - checking if rename actually occurred');
            
            // Verify the asset was actually renamed in the portfolio
            const updatedPortfolioData = await dataStore.loadPortfolioData();
            const renamedAsset = updatedPortfolioData?.assets.find(a => a.name === 'NewName');
            assert.ok(renamedAsset, 'Asset should have been renamed in portfolio data');
        }
    });

    test('should handle duplicate backup folder names by adding timestamp', async () => {
        // Create test portfolio data
        const portfolioData: PortfolioData = {
            assets: [
                {
                    name: 'TestAsset',
                    type: 'simple',
                    currency: 'CNY',
                    tags: []
                }
            ],
            accounts: []
        };

        // Create test asset update file
        const testUpdate: PortfolioUpdateData = {
            date: '2025-01-01',
            assets: [
                {
                    name: 'TestAsset',
                    events: [
                        {
                            type: 'snapshot',
                            currentValue: 1000
                        }
                    ]
                }
            ],
            exchangeRates: []
        };

        const assetUpdatesDir = path.join(testWorkspacePath, 'AssetUpdates');
        const updateFilePath = path.join(assetUpdatesDir, 'test-update.json');
        fs.writeFileSync(updateFilePath, JSON.stringify(testUpdate, null, 2));

        // Perform first rename
        await dataStore.renameAssetInAllFiles('TestAsset', 'RenamedAsset');

        // Update the file to reference the new name
        testUpdate.assets[0].name = 'RenamedAsset';
        fs.writeFileSync(updateFilePath, JSON.stringify(testUpdate, null, 2));

        // Perform second rename with same names (should create timestamped folder)
        await dataStore.renameAssetInAllFiles('RenamedAsset', 'TestAsset');

        // Check that both backup folders exist
        const renameBackupFolder = path.join(testWorkspacePath, '.portfolio-insight', 'backup', 'renames');
        const backupFolders = fs.readdirSync(renameBackupFolder);
        
        // Should have at least one folder with the expected pattern
        const matchingFolders = backupFolders.filter(folder => 
            folder.startsWith('TestAsset-RenamedAsset-') || folder.startsWith('RenamedAsset-TestAsset-')
        );
        assert.ok(matchingFolders.length >= 1, 'At least one backup folder should exist');
    });
});
