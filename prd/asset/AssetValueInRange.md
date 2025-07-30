# Feature Overview
The current value diagram in asset page should count in other activities not only snapshot activity and show activity details on hover.

# Feature Description
- The current value of an asset should be calculated on the day when there is an activity (like transfer or buy/sell or income/expense).
- The diagram in asset page should use these values to show the daily value line chart.
- When hovering over chart points, users should see detailed information about all activities that occurred on that date.

# Implementation Hint
- The calculation should all be done by the backend in the typescript
- Add a new field call valueHistory (the type of this variable can be an interface called AssetDailyRecordData) in the ASSET_DATA message so that the backend (typescript extension code) can send the calculated data to the front end (AssetPage.html)
    - The field should be a list
    - Each element should contain the following:
        - A date
        - A currentValue structure indicates the current value of the asset for that date.
        - A list of activities that happened in that date.
- Refactor the extractCurrentValue in the Asset class so that
    - A method to populate the AssetDailyRecordData list from the first activity all the way to the current date
    - Return the last element's current value as the currentValue for current date.
- Enhance the chart tooltips to show activity information when hovering on chart points
    - Display all activities that occurred on the selected date
    - Show activity types, amounts, and related assets
    - Provide proper formatting and truncation for readability
