import "./controllers";
import "./editor/editor";
import { Editor } from "./editor/editor";
import { preserve } from "./hmr/preserve";
import "./scene";
import { renderer } from "./scene";
import "./vr";

preserve("editor", () => {
  const editor = new Editor();
  renderer.xr.addEventListener("sessionstart", () => {
    editor.focus();
  });
});
