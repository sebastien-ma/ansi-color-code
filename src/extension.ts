import * as vscode from 'vscode';

function showMessage(msg: string) {
	let disposable = vscode.window.setStatusBarMessage(msg);
	setTimeout(() => disposable.dispose(), 2000);
}

function removeAnsiColorCode(text: string): string {
	if (text === null || text.length === 0) {
		return text;
	}
	return text.replace(/(\u001b)\[(\d+;)*\d+m/gm, '');
}

export function activate(context: vscode.ExtensionContext) {

	console.log('Extension [ansi-color-code] activated');

	context.subscriptions.push(vscode.commands.registerTextEditorCommand('ansi-color-code.remove',
		(textEditor: vscode.TextEditor, edit: vscode.TextEditorEdit) => {
			let hasSelection = false;
			let source;
			let location;
			if (!textEditor.selection.isEmpty) {
				source = textEditor.document.getText(textEditor.selection);
				location = textEditor.selection;
				hasSelection = true;
			} else {
				source = textEditor.document.getText();
				location = new vscode.Range(textEditor.document.positionAt(0), textEditor.document.positionAt(source.length));
				hasSelection = false;
			}
			if (source !== null && source.length > 0) {
				edit.replace(location, removeAnsiColorCode(source));
			}
			showMessage(`Removed ANSI color codes from the ${hasSelection ? "selection" : "document"}.`);
		})
	);

}

export function deactivate() {
	console.log('Extension [ansi-color-code] is deactivated');
}
