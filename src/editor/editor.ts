import { javascript } from "@codemirror/lang-javascript";
import { EditorView, basicSetup } from "codemirror";
import { registerKeepAliveClass } from "../hmr/keep-alive";
import { renderPlugin } from "./render-plugin";

export class Editor {
  view: EditorView;

  constructor(initialDocument = "") {
    this.view = new EditorView({
      doc: initialDocument,
      parent: document.body,
      extensions: [
        basicSetup,
        javascript({ typescript: true }),
        renderPlugin({
          size: 0.1,
          x: -2,
          y: 2,
          z: -2,
        }),
      ],
    });
  }

  focus() {
    this.view.contentDOM.focus();
  }

  load(document: string) {
    this.view.dispatch({
      changes: [
        {
          from: 0,
          to: this.view.state.doc.length,
          insert: document,
        },
      ],
    });
  }

  getDocument() {
    return this.view.state.doc.toString();
  }
}
registerKeepAliveClass(Editor);
