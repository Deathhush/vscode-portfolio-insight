# Feature Description

Display the tags in the tree view
- Add a new root node (TagCollectionNode) to the tree view.
- Display all the tags detected from portfolio.json under the TagCollectionNode as a TagNode.
- Display a total value of TagNode based on the Assets with that tag.
- Display all the Assets under the TagNode.

# Design Hints
- Implement the select asset by tag functionality in data access class. Also refactor the Category related classes to use that to eliminate duplication.