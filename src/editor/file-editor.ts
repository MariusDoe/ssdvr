import { read, write } from "../files";
import { Editor } from "./editor";

export class FileEditor extends Editor {
  constructor(public path: string) {
    super();
    read(this.path).then((contents) => this.load(contents));
  }

  onSave() {
    super.onSave();
    write(this.path, this.getDocument());
  }
}
