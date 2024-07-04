import { javascript } from "@codemirror/lang-javascript";
import { FileEditor } from "./file-editor";

export class TypeScriptEditor extends FileEditor {
  *getExtensions() {
    yield* super.getExtensions();
    yield javascript({ typescript: true });
  }
}
