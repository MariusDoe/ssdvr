import { javascript } from "@codemirror/lang-javascript";
import { keymap } from "@codemirror/view";
import * as three from "three";
import { Editor } from "./editor/editor";
import { execute } from "./execute";

const helpText = [
  "// Enter JavaScript code here",
  "// Use Ctrl-d with a selection to execute it",
  "// Use Ctrl-d without a selection to execute the line at the cursor",
  "// Use this.myVar to preserve data across multiple executions",
  "// You cannot use top-level import statements, but you can use await import(...)",
  "// These properties are predefined:",
  "// - this.three: the three.js module",
].join("\n");

export class Workspace extends Editor {
  scope: Object;

  constructor() {
    super(helpText);
    this.scope = { three };
  }

  *getExtensions() {
    yield keymap.of([
      {
        key: "Ctrl-d",
        run: () => {
          this.onExecute();
          return true;
        },
      },
    ]);
    yield* super.getExtensions();
    yield javascript();
  }

  getStringToExecute() {
    const { doc, selection } = this.view.state;
    const selections = selection.ranges.map((range) =>
      range.empty
        ? doc.lineAt(range.anchor).text
        : doc.sliceString(range.from, range.to)
    );
    return selections.join(";");
  }

  onExecute() {
    const source = this.getStringToExecute();
    execute(source, this.scope);
  }
}
