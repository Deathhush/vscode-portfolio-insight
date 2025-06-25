Implement a feature that allows the user to define multiple Asset and merge into the Portfolio.json in the current workspace.

- Add a "Add Assets" button in the "Assets" node in the PortfolioExplorer.
- When click, display a WebView (Add Assets) to accept user's input.
- The WebView should include the following     
    - A table to allow user input the following:
        - The name of the asset
        - A drop down to pick the type of the asset (simple, investment, composite and stock)
        - (optional) Currency field to let user select non-default currency. The current available choice is limited to USD, CNY and HKD. CNY is the default currency and if not specified, assets are considered to be in CNY. Only non-CNY currencies are stored in the portfolio.json file.
    - The table should already be populated with existing assets so that users can modify them including delete.
    - A button to submit the result back to the vscode extension.
- When user submits the result, merge the content into the current Portfolio.json file.
- Follow the pattern of portfolioUpdateView.ts/host.html/portfolioUpdate.html to create a host so that the html can be tested outside of the extension.

## Clarifying Questions & Design Decisions

### User Experience & Interface
1. **Table Interaction**: Users should be able to add/remove rows dynamically in the table

2. **Currency Field**: Currency field should be included as optional.

3. **Validation**: 
   - Asset names should be unique within the portfolio.
   - Asset names be trimmed of whitespace.
   - There are no character restriction of the name
   - Empty rows be flagged as errors.
4. **User Feedback**: 
   - Show validation errors inline in the table.   
   - Show a success message after successful merge.

### Data Handling & Persistence
5. **Merge Strategy**: When merging with existing portfolio.json:
   - Should preserve the order of existing assets?
   - New assets be appended to the end of the portfolio.json?
6. **File Creation**: If portfolio.json doesn't exist, create it automatically.
7. **Backup/Undo**: Create a backup of the original portfolio.json before overwriting.
8. **Error Handling**: Display error messages to user.

### Technical Implementation
9. **Asset Type Validation**: The asset types should be exactly limited to the four specified types (simple, investment, composite, stock)?

### Testing & Development
14. **Host Testing**: For the standalone host.html testing:
    - It simulates the VS Code extension environment.
    - It include sample data loading capabilities.
    - It prints the submitted data to console.
15. **Sample Data**: Should provide sample/default data for testing purposes.
