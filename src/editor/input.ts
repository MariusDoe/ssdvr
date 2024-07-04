import { EditorState } from "@codemirror/state";
import { Editor } from "./editor";

export class Input extends Editor {
  *getExtensions() {
    yield* super.getExtensions();
    yield singleLineExtension;
  }
}

const singleLineExtension = EditorState.transactionFilter.of((transaction) =>
  transaction.newDoc.lines > 1 ? [] : transaction
);
