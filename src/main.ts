import "core-js/actual";
import "./controllers";
import "./demo";
import "./editor/editor";
import { Editor } from "./editor/editor";
import { read, write } from "./files";
import { preserve } from "./hmr/preserve";
import { openInMovable } from "./movable";
import "./scene";
import { renderer } from "./scene";
import "./vr";

preserve("editor", async () => {
  const editor = new Editor();
  openInMovable(editor);
  renderer.xr.addEventListener("sessionstart", () => {
    editor.focus();
  });
  const path = "src/demo.ts";
  editor.load(await read(path));
  editor.addEventListener("save", () => {
    write(path, editor.getDocument());
  });
});
