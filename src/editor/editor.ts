import { javascript } from "@codemirror/lang-javascript";
import { EditorView, basicSetup } from "codemirror";
import { renderer } from "../scene";
import { renderPlugin } from "./render-plugin";

const editorContainer = document.body.appendChild(
  document.createElement("div")
);
editorContainer.style.width = "100vw";
editorContainer.style.height = "100vh";

const view = new EditorView({
  doc: 'function test() {\n  console.log("Hello World!");\n}',
  parent: document.body,
  extensions: [
    basicSetup,
    javascript({ typescript: true }),
    renderPlugin({
      size: 0.1,
      x: -2,
      y: 2,
      z: -2,
    }),
  ],
});

renderer.xr.addEventListener("sessionstart", () => {
  view.contentDOM.focus();
});
