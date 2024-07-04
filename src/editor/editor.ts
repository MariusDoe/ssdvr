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
      extensions: [...this.getExtensions()],
    });
  }

  *getExtensions() {
    yield basicSetup;
    yield renderPlugin(
      {
        size: 0.01,
      },
      this
    );
    yield keymap.of([
      {
        key: "Ctrl-s",
        run: () => {
          this.onSave();
          return true;
        },
      },
    ]);
  }

  onSave() {
    this.dispatchEvent({ type: "save" });
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
