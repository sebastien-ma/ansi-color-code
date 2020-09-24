// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import AnsiColoredTextProvider, { createURI } from './provider';

function showMessage(msg: string) {
	let d = vscode.window.setStatusBarMessage(msg);
	setTimeout(() => d.dispose(), 2000);
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "ansi-color" is now active!');

	context.subscriptions.push(vscode.commands.registerTextEditorCommand('ansi-color.remove',
		(textEditor: vscode.TextEditor, edit: vscode.TextEditorEdit) => {
			let regex = /( |\u001b)?\[(\d+;)*\d+m/gm;
			if (!textEditor.selection.isEmpty) {
				let source: string = textEditor.document.getText(textEditor.selection);
				if (source !== null && source.length > 0) {
					edit.replace(textEditor.selection, source.replace(regex, ''));
				}
				showMessage('Removed ANSI color codes in the selection.');
			} else {
				let source: string = textEditor.document.getText();
				const fullRange = new vscode.Range(
					textEditor.document.positionAt(0), textEditor.document.positionAt(source.length));
				if (source !== null && source.length > 0) {
					let ret = source.replace(regex, '');
					edit.replace(fullRange, ret);
				}
				showMessage('Removed ANSI color codes in the document.');
			}
		})
	);

	// #2
	const provider = new AnsiColoredTextProvider();
	// register content provider for scheme `references`
	// register document link provider for scheme `references`
	const providerRegistrations = vscode.Disposable.from(
		vscode.workspace.registerTextDocumentContentProvider(AnsiColoredTextProvider.scheme, provider)
		// vscode.languages.registerDocumentLinkProvider({ scheme: AnsiColoredTextProvider.scheme }, provider)
	);
	const cmdReg = vscode.commands.registerTextEditorCommand('ansi-color.view',
		(textEditor: vscode.TextEditor, edit: vscode.TextEditorEdit) => {
			console.log("Executing command 'ansi-color.view'");
			let tmp = textEditor.document.fileName.split('/');
			let title = "Preview " + tmp[tmp.length - 1];
			vscode.workspace
				.openTextDocument(createURI(textEditor.document.uri))
				.then(doc => {
					console.log("After openTextDocument", doc.getText().length);
					// vscode.window.showTextDocument(doc, textEditor.viewColumn! + 1);
					// doc.
					AnsiColoredTextViewPanel.createOrShow(title, doc.getText());
				});
		});
	context.subscriptions.push(provider, providerRegistrations, cmdReg);
}

// this method is called when your extension is deactivated
export function deactivate() { }

class AnsiColoredTextViewPanel {

	public static currentPanel: AnsiColoredTextViewPanel | undefined;

	private readonly _panel: vscode.WebviewPanel;

	private _disposables: vscode.Disposable[] = [];

	public static createOrShow(title: string, content: string) {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		// If we already have a panel, show it.
		if (AnsiColoredTextViewPanel.currentPanel) {
			console.log("already have a panel, show it");
			AnsiColoredTextViewPanel.currentPanel._panel.reveal(column);
			return;
		}

		// Otherwise, create a new panel.
		const panel = vscode.window.createWebviewPanel(
			title,
			title,
			column || vscode.ViewColumn.One,
			{
				enableScripts: false,
				localResourceRoots: []
			}
		);

		AnsiColoredTextViewPanel.currentPanel = new AnsiColoredTextViewPanel(panel, title, content);
	}

	private constructor(panel: vscode.WebviewPanel, title: string, content: string) {
		this._panel = panel;
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
		this._panel.onDidChangeViewState(
			e => {
				if (this._panel.visible) {
					this._update(title, content);
				}
			},
			null,
			this._disposables
		);

		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'alert':
						vscode.window.showErrorMessage(message.text);
						return;
				}
			},
			null,
			this._disposables
		);

		this._update(title, content);
	}

	private _update(title: string, html: string) {
		console.log('_update');
		this._panel.title = title;
		this._panel.webview.html = html;
	}

	public dispose() {
		AnsiColoredTextViewPanel.currentPanel = undefined;

		// Clean up our resources
		this._panel.dispose();

		this._disposables.forEach(d => d.dispose);
		this._disposables = [];
	}
}
