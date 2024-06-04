import { javascript } from "@codemirror/lang-javascript";
import { keymap } from "@codemirror/view";
import { EditorView, basicSetup } from "codemirror";
import { EventDispatcher } from "three";
import { renderPlugin } from "./render-plugin";

interface EditorEventMap {
  save: {};
}

export class Editor extends EventDispatcher<EditorEventMap> {
  view: EditorView;

  constructor(initialDocument = "") {
    super();
    this.view = new EditorView({
      doc: initialDocument,
      parent: document.body,
      extensions: [
        basicSetup,
        javascript({ typescript: true }),
        renderPlugin({
          size: 0.01,
          x: -0.2,
          y: 1,
          z: -0.5,
        }),
        keymap.of([
          {
            key: "Ctrl-s",
            run: () => {
              this.dispatchEvent({ type: "save" });
              return true;
            },
          },
        ]),
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
