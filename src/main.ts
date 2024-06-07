import "core-js/actual";
import "./controllers";
import "./demo";
import "./editor/editor";
import { fontFromFlags } from "./editor/fonts";
import { FilePicker } from "./file-picker";
import { preserve } from "./hmr/preserve";
import { materialFromColor } from "./materials";
import { openInMovable } from "./movable";
import "./scene";
import "./vr";

preserve("file-picker", async () => {
  const filePicker = new FilePicker(".", {
    size: 0.1,
    indent: 0.1,
    font: fontFromFlags({ bold: false, italic: false }),
    backgroundMaterial: materialFromColor("darkblue"),
    foregroundMaterial: materialFromColor("white"),
  });
  openInMovable(filePicker);
  return filePicker;
});
