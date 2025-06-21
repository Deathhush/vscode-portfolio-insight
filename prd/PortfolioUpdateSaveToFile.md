Implement the feature to save the asset update user specified in the protfolioUpdate.html to file:

- Update the portfolioUpdate.html to be able to send the PORTFOLIO_UPDATE to a webview hosted in vscode.
- Save a portfolioUpdateView instance in assetExplorerProvider instead of using singleton anymore.
- Make the assetExplorerProvider to handle the PORTFOLIO_UPDATE message and save the received date into a file.