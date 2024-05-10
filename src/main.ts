import "./controllers";
import "./editor/editor";
import { Editor } from "./editor/editor";
import { keepAlive } from "./hmr/keep-alive";
import { preserve } from "./hmr/preserve";
import "./scene";
import { renderer } from "./scene";
import "./vr";

preserve("editor", () => {
  const editor = keepAlive(new Editor());
  renderer.xr.addEventListener("sessionstart", () => {
    editor.focus();
  });
});
