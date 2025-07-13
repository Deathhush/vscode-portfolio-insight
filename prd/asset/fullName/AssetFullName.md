Feature Description
- This feature is to support assets with same name under different accounts.
- The current design assumes each asset has a globally unique name. But this is not convenient for asset types like stock. Different account may contain stock with same name.
- The proposal is to make sure the global uniqueness for an asset needs to be (assetName, accountName). This allows assets with same name to exist under different account.
    - Introduce a new concept call asset's full name, which is in the form of "accountName.assetName"
- Asset name should still be unique under an account.
- There are also corresponding changes to the different UIs
    - In the treeview, when the asset node is displayed under an account, only show the name as the tree view item's label.
    - In the treeview, when the asset node is not displayed under an account (under category or tag), display the asset's full name (accountName.assetName) as the label for the tree view item.
    - For portfolioUpdate.json
        - In the portfolioUpdate.json, the update of an asset should use asset full name
            - The name property of an asset in the update is the full name.
            - The from and to property of a transfer in the update is the full name.            
        - When processing the total value, needs to match both account name and asset name to find the related updates.
    - For asset rename feature, you now need to look for asset update record based on the full name.
    - For assetPage.html
        - Emit the portfolioUpdate.json using asset full name as well.

Design Hints
- Add a new property called fullName to the asset class which is computed from name and account. **Do not persist it in the portfolio.json**
- Update the related places to use fullName instead of name when needed.