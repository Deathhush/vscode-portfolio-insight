Add a message from asset-input.html to host.html. The message type should be called "ASSET_UPDATE". The message data is the AssetUpdate in JSON format. A sample is provided in the assetUpdate.json.

When received the message. Print out the assetUpdate json to console.

Also extract the "postMessage" function in the asset-update.html as a separate function. For now, use parent.postMessage to post message to host.html. In future, it may be extended to post message to a VSCode webview extension.

