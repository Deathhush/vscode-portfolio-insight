// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { AssetExplorerProvider } from './providers/assetExplorerProvider';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "vscode-portfolio-insight" is now active!');

	// Create the Asset Explorer provider
	const assetExplorerProvider = new AssetExplorerProvider(context);
	
	// Register the tree data provider
	vscode.window.registerTreeDataProvider('assetExplorer', assetExplorerProvider);
	// Register commands
	const disposableHelloWorld = vscode.commands.registerCommand('vscode-portfolio-insight.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from vscode-portfolio-insight!');
	});
	const disposableRefresh = vscode.commands.registerCommand('vscode-portfolio-insight.refresh', () => {
		assetExplorerProvider.refresh();
		vscode.window.showInformationMessage('Asset Explorer refreshed!');
	});	// Register command to open Portfolio Update View
	const disposableUpdateAssets = vscode.commands.registerCommand('vscode-portfolio-insight.updateAssets', () => {
		assetExplorerProvider.openPortfolioUpdate();
	});
	
	context.subscriptions.push(disposableHelloWorld, disposableRefresh, disposableUpdateAssets);
}

// This method is called when your extension is deactivated
export function deactivate() {}
