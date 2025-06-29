# Feature Description

Implement the feature to categorize assets based on their tags.
- Show a new root node (CategoryCollectionNode) in the PortfolioExplorer to display all the CategoryType (CategoryTypeNode).
- Under the CategoryTypeNode, display all the category types (CategoryNode)
- Under the CategoryNode, display all the assets belonging to that category.
- Show a total value for CategoryTypeNode, but not the CategoryCollectionNode.
- Show a percentage for CategoryNode (value of the category compared to the total value of the category type).
- The category defintion should be loaded from "Assets/category.json" file.
- There is no need to implement the CRUD for categories themselves. Just read the def from category.json

# Design Hints
- Add read method of category.json to PortfolioStore.
- Any interface that represents the data in the JSON should have sufix of Data
- Also introduce business object classes like Category and CategoryType. 
    - Add methods like CalculateCurrentValue to these classes just like Asset class.
- Expose needed category related methods from PortfolioDataAccess and cache the category data .


