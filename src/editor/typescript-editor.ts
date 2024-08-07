import { javascript } from "@codemirror/lang-javascript";
import { StateEffect } from "@codemirror/state";
import WebSocketTransport from "../../lib/@open-rpc/client-js/transports/WebSocketTransport";
import { languageServerWithTransport } from "../../lib/codemirror-languageserver";
import { preserveOnce } from "../hmr/preserve";
import { FileEditor } from "./file-editor";

const languageServerTransport = preserveOnce(
  "languageServerTransport",
  () => new WebSocketTransport("ws://localhost:9999")
);

export class TypeScriptEditor extends FileEditor {
  constructor(path: string) {
    super(path);
    // languageServer depends on this.path,
    // which is not yet set during this.getExtensions
    this.view.dispatch({
      effects: StateEffect.appendConfig.of(this.languageServer()),
    });
  }

  *getExtensions() {
    yield* super.getExtensions();
    yield javascript({ typescript: true });
  }

  languageServer() {
    return languageServerWithTransport({
      languageId: "typescript",
      rootUri: "source://.",
      documentUri: `source://${this.path}`,
      transport: languageServerTransport,
      workspaceFolders: [],
    });
  }
}
