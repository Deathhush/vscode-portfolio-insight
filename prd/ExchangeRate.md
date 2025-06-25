In the current implement, when currency is omitted, it is defaulted to CNY.

Implement the following feature to allow users input exchange rate.

- In the portfolioUpdate.html, when there are assets with non-default currency, add a section to let user input the exchange rate to the default currency (CNY). 
- When save the update, send the exchange rate to the extension and save it to the update file. A sample is given at portfolioUpdateWithExchangeRateSample.json