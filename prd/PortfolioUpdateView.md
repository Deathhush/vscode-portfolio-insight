You need to implement the Portfolio Update View.

- Portfolio Update View is a webview in vscode.
- The content of the webview should be the html in portfolioUpdate.html
- Add a button to the Asset Explorer and when clicked open the Portfolio Update View
    - The button triggers the UpdatePortfolio command.
    - The command should be placed in the commands/UpdatePortfolioCommand.ts
    - The command reads a portfolio.json file from the current workspace, and use that to send the INITIALIZE_ASSETS message to the webview.
- The code of Portfolio Update View should be in the portfolioUpdateView.ts
