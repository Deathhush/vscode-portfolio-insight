# Feature Overview
After implementing sub category feature, the Category class now can have children. This makes CategoryType class redundant.

# Feature Description
- The category.json now support defining tags for the top level categoryTypes. A CategoryType doesn't need to contain all the assets

# Implementation Hints
- Remove the CategoryType as its functionalities are a subset of Category class
- Remove the CategoryTypeData as it is now identical to CategoryData. Updating the CategoryDefinitionData as follows:
```typescript
export interface CategoryDefinitionData {
    categoryTypes: CategoryTypeData[];
}
```
- Keep the CategoryTypeNode, and make it to accept a Category in ctor.
- Keep the hierarchy of the tree view.


