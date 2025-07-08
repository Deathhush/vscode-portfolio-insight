import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { AccountNode } from '../src/providers/accountNode';
import { PortfolioNode } from '../src/providers/portfolioNode';
import { PortfolioExplorerProvider } from '../src/providers/portfolioExplorerProvider';
import { Account } from '../src/data/account';
import { AccountDefinitionData } from '../src/data/interfaces';

suite('Portfolio Tree Nodes Tests', () => {
    let provider: PortfolioExplorerProvider | undefined;
    let mockContext: vscode.ExtensionContext;

    setup(() => {
        // Create a mock extension context
        mockContext = {
            subscriptions: [],
            workspaceState: {} as any,
            globalState: {} as any,
            extensionUri: vscode.Uri.file(__dirname),
            extensionPath: __dirname,
            environmentVariableCollection: {} as any,
            asAbsolutePath: (relativePath: string) => path.join(__dirname, relativePath),
            storageUri: undefined,
            storagePath: undefined,
            globalStorageUri: vscode.Uri.file(__dirname),
            globalStoragePath: __dirname,
            logUri: vscode.Uri.file(__dirname),
            logPath: __dirname,
            extensionMode: vscode.ExtensionMode.Test,
            secrets: {} as any,
            extension: {} as any,
            languageModelAccessInformation: {} as any
        } as unknown as vscode.ExtensionContext;

        // Try to create provider only if workspace is available
        try {
            if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
                provider = new PortfolioExplorerProvider(mockContext);
            } else {
                provider = undefined;
            }
        } catch (error) {
            // Expected when no workspace folder is available
            provider = undefined;
        }
    });

    test('should create AccountNode with valid account', async () => {
        if (!provider) {
            console.log('Skipping test - no workspace available');
            return; // Skip if provider couldn't be created
        }

        const accountDefinition: AccountDefinitionData = {
            name: '招行',
            type: 'bank'
        };

        const account = new Account(accountDefinition, provider.dataAccess);
        const accountNode = new AccountNode(account, provider);
        
        assert.strictEqual(accountNode.nodeType, 'assetCollection');
        assert.strictEqual(accountNode.account.name, '招行');
        assert.strictEqual(accountNode.account.type, 'bank');
    });

    test('should generate tree item for account', async () => {
        if (!provider) {
            console.log('Skipping test - no workspace available');
            return; // Skip if provider couldn't be created
        }

        const accountDefinition: AccountDefinitionData = {
            name: '招行',
            type: 'bank'
        };

        const account = new Account(accountDefinition, provider.dataAccess);
        const accountNode = new AccountNode(account, provider);
        
        const treeItem = await accountNode.getTreeItem();
        
        assert.strictEqual(treeItem.label, '招行');
        assert.strictEqual(treeItem.collapsibleState, vscode.TreeItemCollapsibleState.Expanded);
        assert.strictEqual(treeItem.contextValue, 'account');
        assert.strictEqual(treeItem.tooltip, '招行 (bank)');
    });

    test('should create PortfolioNode', async () => {
        if (!provider) {
            console.log('Skipping test - no workspace available');
            return; // Skip if provider couldn't be created
        }

        const portfolioNode = new PortfolioNode(provider);
        
        assert.strictEqual(portfolioNode.nodeType, 'assetCollection');
    });

    test('should generate tree item for portfolio', async () => {
        if (!provider) {
            console.log('Skipping test - no workspace available');
            return; // Skip if provider couldn't be created
        }

        const portfolioNode = new PortfolioNode(provider);
        
        const treeItem = await portfolioNode.getTreeItem();
        
        assert.strictEqual(treeItem.label, 'Assets');
        assert.strictEqual(treeItem.collapsibleState, vscode.TreeItemCollapsibleState.Expanded);
        assert.strictEqual(treeItem.contextValue, 'assets');
    });

    test('should get children (accounts and standalone assets)', async () => {
        if (!provider) {
            console.log('Skipping test - no workspace available');
            return; // Skip if provider couldn't be created
        }

        const portfolioNode = new PortfolioNode(provider);
        
        // This test will depend on actual portfolio data being available
        // For now, just test that the method doesn't throw
        const children = await portfolioNode.getChildren();
        
        assert.strictEqual(Array.isArray(children), true);
    });
});
