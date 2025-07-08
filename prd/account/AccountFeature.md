Feature Description
- You need to add Account concept to the extension.
- Account is a collection of Assets.
- You need to update the portfolioEdit page to 
    - Add a section for the users to create/edit/remove new account.
    - Allow the user to select an Account for an Asset as its parent.
    - Display assets under the account.
- Each asset can only belong to a single account. An account can have multiple assets. Account is optional to asset.
- You need to update the treeview so that in the Assets node, you need to display the accounts node as immediate children. Asset nodes will be moved to under their parent account node.
- For assets without an account, still display it directly under the root "assets" node.
- A sample of the updated portfolio.json is provided as portfolio.withAccount.sample.json

Design Hints
- Introduce account class and update the asset class. Update the related method in the data access class to read write the definition of accounts from portfolio.json.
- Introduce AccountNode which is also an AssetCollectionNode
- Introduce a new PortfolioNode as the new root node, which can have child AccountNode and AssetNode.