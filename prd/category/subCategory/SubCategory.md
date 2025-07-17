# Feature Overview
- This feature is to support displaying sub-categories in the tree view.
- The authoring of the category.json is out of scope of this feature.

# Feature Description
- A sample category.json with sub-categories defined is provided in category.withSubCategory.sample.json
- Now, a category can have sub-category defined. 
    - The sub-category is also defined by a list of tags. 
    - The assets belonging to a category will be further divided into sub-categories based on the tags defined in the sub-category.
    - A sub-category can also have sub-categories and form a hierarchy.
- The assets with in a category that do not match any tags of sub-categories will become standalone assets within the category.
- Tree view changes
    - Subcategory should be shown as a sub-node of the category node in the tree view.
    - Standalone assets within a category will also be shown as a sub-node under the category in the tree view.
    - Sub-category node will behavior the same as category node. Having their total value and percentage.

# Implementation Hints
- Update the CategoryData interfaces to include a "categories CategoryData[]" property to represent the new category.json
- Update the Category class to 
    - Add getStandaloneAssets, which returns standalone assets.
    - Add getSubCategories, which returns a list of Category instances representing sub-categories.
    - Update the calculateCurrentValue to sum the current value between standalone assets and sub categories.
- Update the CategoryNode to
    - Return both CategoryNode for sub-categories and AssetNode for standalone assets as child.
    - Correct calculate percentage if a CategoryNode either has a parent CategoryType or parent Category.