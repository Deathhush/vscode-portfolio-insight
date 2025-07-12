Feature Description
- Need to support rename asset in assetDefinitionEdtior.html
- When asset is renamed, need to update all the portfolioUpdate.json so that updates related to the asset is not lost.
- As usual, backup all the portfolioUpdate.json before making the change. Save all the backup to a standalone folder called "assetOriginalName.rename.bak".

Design Hints
- Consider to move the portfolioUpdate file saving logic to portfolioDataAccess and portfolioDataStore.