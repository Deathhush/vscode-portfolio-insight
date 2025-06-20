import * as vscode from 'vscode';

export interface AssetExplorerNode extends vscode.TreeItem {
}

export class AssetExplorerProvider implements vscode.TreeDataProvider<AssetExplorerNode> {
    private _onDidChangeTreeData: vscode.EventEmitter<AssetExplorerNode | undefined | null | void> = new vscode.EventEmitter<AssetExplorerNode | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<AssetExplorerNode | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private context: vscode.ExtensionContext) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: AssetExplorerNode): vscode.TreeItem {
        return element;
    }

    getChildren(element?: AssetExplorerNode): Thenable<AssetExplorerNode[]> {
        // Return empty array to show nothing in the tree view
        return Promise.resolve([]);
    }
}
