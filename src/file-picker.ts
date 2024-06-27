import { Editor, EditorScrollerController } from "./editor/editor";
import { list, read, write } from "./files";
import { openInMovableScroller } from "./open";
import { Tree, TreeOptions } from "./tree";

class FileTree extends Tree {
  declare parentTree: FileTree;

  constructor(
    public name: string,
    public type: "file" | "directory" | "other",
    options: TreeOptions
  ) {
    super(name, options);
  }

  getPath(): string {
    return `${this.parentTree.getPath()}/${this.name}`;
  }

  click() {
    super.click();
    switch (this.type) {
      case "file":
        this.openEditor();
        break;
      case "directory":
        if (this.childTrees.length === 0) {
          this.loadEntries();
        } else {
          this.clearTrees();
        }
        break;
    }
  }

  async openEditor() {
    const editor = new Editor();
    openInMovableScroller(editor, 0.4, EditorScrollerController);
    const path = this.getPath();
    editor.load(await read(path));
    editor.addEventListener("save", () => {
      write(path, editor.getDocument());
    });
  }

  async loadEntries() {
    const entries = await list(this.getPath());
    this.addTrees(
      ...entries.map(
        (entry) => new FileTree(entry.name, entry.type, this.options)
      )
    );
  }
}

export class FilePicker extends FileTree {
  constructor(public basePath: string, options: TreeOptions) {
    super("File picker", "directory", options);
  }

  getPath() {
    return this.basePath;
  }
}
