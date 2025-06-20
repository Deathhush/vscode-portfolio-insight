import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { PortfolioUpdateView } from '../views/portfolioUpdateView';

export interface AssetDefinitionData {
    name: string;
    type: 'simple' | 'investment' | 'composite' | 'stock';
    currency?: string;  // Make currency optional
}

export interface PortfolioData {
    assets: AssetDefinitionData[];
}

export class UpdatePortfolioCommand {
    
    public static async execute(context: vscode.ExtensionContext): Promise<void> {
        try {
            // Get the current workspace folder
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No workspace folder is open. Please open a folder to use Portfolio Update.');
                return;
            }

            // Look for portfolio.json in the workspace root
            const portfolioJsonPath = path.join(workspaceFolder.uri.fsPath, 'portfolio.json');
            
            let portfolioData: PortfolioData | null = null;
              // Try to read portfolio.json
            if (fs.existsSync(portfolioJsonPath)) {                try {
                    const portfolioContent = fs.readFileSync(portfolioJsonPath, 'utf8');
                    const rawPortfolioData = JSON.parse(portfolioContent) as PortfolioData;
                    
                    // Validate the structure
                    if (!rawPortfolioData.assets || !Array.isArray(rawPortfolioData.assets)) {
                        vscode.window.showErrorMessage('Invalid portfolio.json: "assets" array is required');
                        return;
                    }
                    
                    // Validate each asset
                    for (const asset of rawPortfolioData.assets) {
                        if (!asset.name || !asset.type) {
                            vscode.window.showErrorMessage('Invalid portfolio.json: Each asset must have "name" and "type" fields');
                            return;
                        }
                        
                        if (!['simple', 'investment', 'composite', 'stock'].includes(asset.type)) {
                            vscode.window.showErrorMessage(`Invalid asset type "${asset.type}". Must be one of: simple, investment, composite, stock`);
                            return;
                        }
                    }
                    
                    // Normalize the assets by adding default currency if missing
                    portfolioData = {
                        assets: rawPortfolioData.assets.map(asset => ({
                            ...asset,
                            currency: asset.currency || 'CNY'  // Default to CNY if not specified
                        }))
                    };
                    
                    console.log('Portfolio data loaded from portfolio.json:', portfolioData);
                }catch (parseError) {
                    console.error('Error parsing portfolio.json:', parseError);
                    vscode.window.showErrorMessage('Error reading portfolio.json: Invalid JSON format');
                    return;
                }
            }else {
                // If portfolio.json doesn't exist, show info and create default
                const createDefault = await vscode.window.showInformationMessage(
                    'portfolio.json not found in workspace. Would you like to create a default one?',
                    'Create Default',
                    'Continue Without'
                );
                
                if (createDefault === 'Create Default') {
                    portfolioData = UpdatePortfolioCommand.createDefaultPortfolio();
                    await UpdatePortfolioCommand.savePortfolioToFile(portfolioJsonPath, portfolioData);
                    vscode.window.showInformationMessage('Default portfolio.json created in workspace root.');
                }
            }

            // Create or show the Portfolio Update View
            PortfolioUpdateView.createOrShow(context.extensionUri);
            
            // If we have portfolio data, send it to the webview after a short delay
            // to ensure the webview is loaded
            if (portfolioData && portfolioData.assets) {
                setTimeout(() => {
                    PortfolioUpdateView.sendInitializeAssets(portfolioData!.assets);
                }, 1000);
            }
            
        } catch (error) {
            console.error('Error in UpdatePortfolioCommand:', error);
            vscode.window.showErrorMessage(`Failed to open Portfolio Update: ${error}`);
        }
    }

    private static createDefaultPortfolio(): PortfolioData {
        return {
            assets: [
                { name: "Cash Account", type: "simple", currency: "USD" },
                { name: "Investment Portfolio", type: "investment", currency: "USD" },
                { name: "Retirement Fund", type: "composite", currency: "USD" },
                { name: "Stock Holdings", type: "stock", currency: "USD" }
            ]
        };
    }

    private static async savePortfolioToFile(filePath: string, portfolioData: PortfolioData): Promise<void> {
        try {
            const jsonContent = JSON.stringify(portfolioData, null, 2);
            fs.writeFileSync(filePath, jsonContent, 'utf8');
        } catch (error) {
            console.error('Error saving portfolio.json:', error);
            throw new Error(`Failed to save portfolio.json: ${error}`);
        }
    }
}
