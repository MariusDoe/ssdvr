import "core-js/actual";
import "./controllers";
import "./demo";
import "./editor/editor";
import { EditorMovableController } from "./editor/editor";
import { fontFromFlags } from "./editor/fonts";
import { FilePicker } from "./file-picker";
import { preserve } from "./hmr/preserve";
import { materialFromColor } from "./materials";
import { openInMovable, openInMovableScroller } from "./open";
import "./scene";
import { TreeScrollerController } from "./tree";
import "./vr";
import { Workspace } from "./workspace";

preserve("file-picker", () => {
  const filePicker = new FilePicker(".", {
    size: 0.1,
    indent: 0.1,
    font: fontFromFlags({ bold: false, italic: false }),
    backgroundMaterial: materialFromColor("darkblue"),
    foregroundMaterial: materialFromColor("white"),
  });
  openInMovableScroller(filePicker, 1, TreeScrollerController);
  return filePicker;
});

preserve("workspace", () => {
  const workspace = new Workspace();
  openInMovable(workspace, EditorMovableController);
  return workspace;
});
