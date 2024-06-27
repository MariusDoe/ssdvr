import { javascript } from "@codemirror/lang-javascript";
import { keymap } from "@codemirror/view";
import { EditorView, basicSetup } from "codemirror";
import { Object3D, Object3DEventMap } from "three";
import { ForwardingMovableController } from "../movable-controller";
import { ForwardingScrollerController } from "../scroller-controller";
import {
  RenderPlugin,
  RenderPluginMovableController,
  RenderPluginScrollerController,
  renderPlugin,
} from "./render-plugin";

interface EditorEventMap extends Object3DEventMap {
  save: {};
}

export class Editor extends Object3D<EditorEventMap> {
  view: EditorView;
  renderPlugin!: RenderPlugin;

  constructor(initialDocument = "") {
    super();
    this.view = new EditorView({
      doc: initialDocument,
      parent: document.body,
      extensions: [
        basicSetup,
        javascript({ typescript: true }),
        renderPlugin(
          {
            size: 0.01,
          },
          this
        ),
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

export const EditorMovableController = ForwardingMovableController(
  (editor: Editor) => editor.renderPlugin,
  RenderPluginMovableController
);

export const EditorScrollerController = ForwardingScrollerController(
  (editor: Editor) => editor.renderPlugin,
  RenderPluginScrollerController
);
