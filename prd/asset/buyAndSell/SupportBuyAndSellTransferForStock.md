Feature Overview
- This feature is to allow the user to add "buy and sell" information for stock asset.

Feature Description
- In the portfolioUpdate page, for stock asset, add "buy" and "sell" transfer type in addition to the normal "transfer in" and "transfer out" options in the transfer type dropdown.
- For buy and sell transfer, the transfer row should support the user to input the following information
    - (required) The share number for buy/sell operation.
    - (required) The target asset for the transfer
        - For buy operation, add a corresponding "transfer out" record under the target asset.
        - For sell operation, add a corresponding "transfer in" record under the target asset.
    - One of the following field will be required
        - The price for buy/sell operation.
        - Total value of the buy/sell operation.
- The "Add Activity" in the asset page also needs corresponding change.

Design Hints
- A sample portfolioUpdate.json is provided (portfolioUpdate.withBuyAndSell.sample.json) for the new "buy/sell" transfer type.
- Update the tranferData interface:
    - Make amount optional
    - Add optional "totalValue"
    - Add optional "unitPrice"
    - **Do not add type to transferData**, we do not need the "buy" and "sell" as type in the persisted transferData just like we don't have "transfer_in" and "transfer_out" concept. They are pure UI level concepts.
        - Any transfer whose "from" is a stock asset will be considered as "sell operation"
            - Show a "sell" operation under the stock asset.
            - Show a "transfer in" operation under the target asset (the "to" asset).
        - Any transfer whose "to" is a stock asset will be considered as "buy operation"
            - Show a "buy" operation under the stock asset.
            - Show a "transfer out" operation under the target asset (the "from" asset).
        - Do the similar change for Asset Page as well.



    
    
