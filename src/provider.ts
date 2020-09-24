import * as vscode from 'vscode';

export default class AnsiColoredTextProvider implements vscode.TextDocumentContentProvider {

  private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
  // private _editorDecoration = vscode.window.createTextEditorDecorationType({ textDecoration: 'underline' });

  // private _subscriptions: vscode.Disposable;

  // private _documents = new Map<string, ReferencesDocument>();

  static scheme = "ansicoloredtext";

  constructor() {

    // Listen to the `closeTextDocument`-event which means we must
    // clear the corresponding model object - `ReferencesDocument`
    // this._subscriptions = vscode.workspace.onDidCloseTextDocument(doc => this._documents.delete(doc.uri.toString()));
  }

  dispose() {
    // this._subscriptions.dispose();
    // this._documents.clear();
    // this._editorDecoration.dispose();
    this._onDidChange.dispose();
  }

  // Expose an event to signal changes of _virtual_ documents to the editor
  get onDidChange() {
    this._onDidChange.fire(vscode.Uri.parse(""));
    let event = this._onDidChange.event;
    // console.log(`Called onDidChange ${event}`);
    return event;
  }

  // Provider method that takes an uri of the `references`-scheme and
  // resolves its content by (1) running the reference search command
  // and (2) formatting the results
  provideTextDocumentContent(uri: vscode.Uri): string | Thenable<string> {
    console.log('provideTextDocumentContent called');

    // already loaded?
    // let document = this._documents.get(uri.toString());
    // if (document) {
    //   return document.value;
    // }
    this._onDidChange.fire(uri);

    let sourceUri = resolveURI(uri);
    return vscode.workspace
      .openTextDocument(sourceUri)
      .then(doc => {
        let text = doc.getText();
        let sections = [];
        let pos = 0;
        let style = null;

        let code = codeRegex.exec(text);
        if (code === null) { // no ANSI color code found.
          return text;
        }

        sections.push({
          text: text.substring(pos, codeRegex.lastIndex - code[0].length),
          style: style || ""
        });
        pos = codeRegex.lastIndex;
        style = code[0];

        while ((code = codeRegex.exec(text)) !== null) {
          // console.log(`Found ${code[0]}. Next starts at ${codeRegex.lastIndex}.`);
          sections.push({
            text: text.substring(pos, codeRegex.lastIndex - code[0].length),
            style: style
          });
          pos = codeRegex.lastIndex;
          style = code[0];
        }
        sections.push({
          text: text.substring(pos),
          style: style
        });

        let content = '';
        for (let e of sections) {
          if (e.text === null || e.text === '') { continue; }
          content += convertHtmlTag(e.text, e.style);
        }
        htmlTemplate = htmlTemplate.replace(/\$content/, content);
        // console.log(htmlTemplate);
        return htmlTemplate;
      });
  }
}

/**
 * Converts ANSI escape code to HTML tags.
 * @param text 
 * @param code 
 */
function convertHtmlTag(text: string, code: string): string {
  let ret = text
    .split('\n')
    .map(e => {
      let cssClass = "";
      let match;
      if ((match = brightColorCodeRegex.exec(code)) !== null) {
        if (match !== null && match.length >= 2) {
          cssClass = `bright ${colorMap[match[1]]}`;
        }
      } else if ((match = normalColorCodeRegex.exec(code)) !== null) {
        if (match !== null && match.length >= 2) {
          cssClass = colorMap[match[1]];
        }
      } else {
        cssClass = "";
      }
      // console.log(`Converted ${code} -> CSS class [${cssClass}]`);
      return `<span class="${cssClass}">${e}</span>\n`;
    })
    .join('<br>\n');
  return ret;
}

let codeRegex = /( |\u001b)\[(\d+;)*\d+m/g;

let brightColorCodeRegex = /\[(3[0-7]);1m/;

let normalColorCodeRegex = /\[(3[0-7])m/;

let htmlTemplate =
  `<html>
    <style>
      .black {
        color: black
      }
      .red {
        color: red
      }
      .green {
        color: green
      }
      .yellow {
        color: yellow
      }
      .blue {
        color: blue
      }
      .magenta {
        color: magenta
      }
      .cyan {
        color: cyan
      }
      .white {
        color: white
      }
      .bright {
        font-weight: bold
      }
    </style>
    $content
</html>`;

let colorMap: { [key: string]: string } = {
  "30": "black",
  "31": "red",
  "32": "green",
  "33": "yellow",
  "34": "blue",
  "35": "magenta",
  "36": "cyan",
  "37": "white"
};

export function createURI(sourceURI: vscode.Uri): vscode.Uri {
  const query = JSON.stringify([sourceURI.toString(), Math.random()]);
  let ret = vscode.Uri.parse(`${AnsiColoredTextProvider.scheme}:ref?${query}`);
  console.log(`create URI: ${ret.toString()}`);
  return ret;
}

export function resolveURI(uri: vscode.Uri): vscode.Uri {
  let [source] = <[string]>JSON.parse(uri.query);
  return vscode.Uri.parse(source);
}