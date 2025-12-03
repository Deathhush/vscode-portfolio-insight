// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { PortfolioExplorerProvider } from './providers/portfolioExplorerProvider';
import { AssetNode } from './providers/assetNode';
import { CategoryNode } from './providers/categoryNode';
import { CategoryTypeNode } from './providers/categoryTypeNode';
import { AccountNode } from './providers/accountNode';
import { TagNode } from './providers/tagNode';
import { PortfolioNode } from './providers/portfolioNode';
import { CollectionPageView } from './views/collectionPage/collectionPageView';
import { AssetCollection } from './data/assetCollection';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "vscode-portfolio-insight" is now active!');
	// Create the Portfolio Explorer provider
	const portfolioExplorerProvider = new PortfolioExplorerProvider(context);

	// Track active collection views
	const collectionViews: CollectionPageView[] = [];

	// Register the tree data provider
	const treeView = vscode.window.createTreeView('portfolioExplorer', {
		treeDataProvider: portfolioExplorerProvider,
		showCollapseAll: true
	});
	
	// Track the current selection for other commands
	let currentSelection: any = null;
	treeView.onDidChangeSelection(e => {
		if (e.selection && e.selection.length > 0) {
			currentSelection = e.selection[0];
		} else {
			currentSelection = null;
		}
	});
	context.subscriptions.push(treeView);
	// Register commands
	const disposableHelloWorld = vscode.commands.registerCommand('vscode-portfolio-insight.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from vscode-portfolio-insight!');
	});	
	const disposableRefresh = vscode.commands.registerCommand('vscode-portfolio-insight.refresh', () => {
		portfolioExplorerProvider.refresh();
		vscode.window.showInformationMessage('Portfolio Explorer refreshed!');
	});	// Register command to open Portfolio Update View
	const disposableUpdateAssets = vscode.commands.registerCommand('vscode-portfolio-insight.updateAssets', () => {
		portfolioExplorerProvider.openPortfolioUpdate();
	});

	// Register command to open Asset Page
	const disposableOpenAssetPage = vscode.commands.registerCommand(
		'vscode-portfolio-insight.openAssetPage',
		async (assetNode: AssetNode) => {
			if (assetNode && assetNode.nodeType === 'asset') {
				await assetNode.openAssetPage(context);
			}
		}
	);

	// Register command to view asset collection details (categories, accounts, tags, portfolio)
	const disposableViewAssetCollectionDetails = vscode.commands.registerCommand(
		'vscode-portfolio-insight.viewAssetCollectionDetails',
		async (node: CategoryNode | CategoryTypeNode | AccountNode | TagNode | PortfolioNode) => {
			let collection;
			let collectionType: 'category' | 'account' | 'tag' | 'portfolio' = 'category';

			// Handle different node types
			if (node.nodeType === 'category') {
				collection = (node as CategoryNode).category;
				collectionType = 'category';
			} else if (node.nodeType === 'categoryType') {
				collection = (node as CategoryTypeNode).categoryType;
				collectionType = 'category';
			} else if (node.nodeType === 'account') {
				collection = (node as AccountNode).account;
				collectionType = 'account';
			} else if (node.nodeType === 'tag') {
				// For tags, we need to create a wrapper object
				const tagNode = node as TagNode;
				const assets = await tagNode.provider.dataAccess.getAssetsByTag(tagNode.tag);
				collection = {
					name: tagNode.tag,
					calculateCurrentValue: async () => {
						return await AssetCollection.calculateCurrentValue(assets);
					},
					calculateValueHistory: async () => {
						return await AssetCollection.calculateValueHistory(assets);
					},
					getAssets: async () => assets
				};
				collectionType = 'tag';
			} else if (node.nodeType === 'portfolio') {
				// For portfolio, we need to create a wrapper object
				const portfolioNode = node as PortfolioNode;
				const accounts = await portfolioNode.provider.dataAccess.getAllAccounts();
				const standaloneAssets = await portfolioNode.provider.dataAccess.getStandaloneAssets();

				// Collect all assets from accounts and standalone
				const allAssets = [...standaloneAssets];
				for (const account of accounts) {
					const accountAssets = await account.getAssets();
					allAssets.push(...accountAssets);
				}

				collection = {
					name: 'Portfolio',
					calculateCurrentValue: async () => {
						return await AssetCollection.calculateCurrentValue(allAssets);
					},
					calculateValueHistory: async () => {
						return await AssetCollection.calculateValueHistory(allAssets);
					},
					getAssets: async () => allAssets
				};
				collectionType = 'portfolio';
			}

			if (collection) {
				const view = new CollectionPageView(context.extensionUri, collection, collectionType);
				collectionViews.push(view);

				view.onDispose(() => {
					const index = collectionViews.indexOf(view);
					if (index > -1) {
						collectionViews.splice(index, 1);
					}
				});
			}
		}
	);

	context.subscriptions.push(disposableHelloWorld, disposableRefresh, disposableUpdateAssets, disposableOpenAssetPage, disposableViewAssetCollectionDetails);
	context.subscriptions.push(vscode.commands.registerCommand('vscode-portfolio-insight.editAssetDefinition', 
		() => {
			portfolioExplorerProvider.openAssetDefinitionEditor();
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand('vscode-portfolio-insight.editAssetDefinitionFromHeader', () => {
		// Check if the current selection is an asset collection node
		if (currentSelection && currentSelection.contextValue === 'assets') {
			portfolioExplorerProvider.openAssetDefinitionEditor();
		} else {
			// Show a message that assets node should be selected
			vscode.window.showInformationMessage('Please select the Assets node to edit asset definitions.');
		}
	}));
}

// This method is called when your extension is deactivated
export function deactivate() {}
