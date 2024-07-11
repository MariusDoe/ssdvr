import "core-js/actual";
import {
  AmbientLight,
  Color,
  Mesh,
  MeshPhysicalMaterial,
  PlaneGeometry,
  TextureLoader,
} from "three";
import uvTextureUrl from "../textures/uv_grid_opengl.jpg?url";
import { Button } from "./button";
import "./controllers";
import "./demo";
import { useAdd } from "./dispose-hooks";
import "./editor/editor";
import { EditorMovableController } from "./editor/editor";
import { fontFromFlags } from "./editor/fonts";
import { FilePicker } from "./file-picker";
import { preserveOnce } from "./hmr/preserve";
import { materialFromColor } from "./materials";
import { openInMovable, openInMovableScroller } from "./open";
import "./scene";
import { scene } from "./scene";
import { toolBelt } from "./tool-belt";
import { TreeScrollerController } from "./tree";
import "./vr";
import { Workspace } from "./workspace";

const uvTexture = await preserveOnce("texture", () =>
  new TextureLoader().loadAsync(uvTextureUrl)
);

const floor = new Mesh(
  new PlaneGeometry(5, 5),
  new MeshPhysicalMaterial({ map: uvTexture })
);
floor.rotateX(-Math.PI / 2);
const light = new AmbientLight(new Color("white"));
let lightOn = true;
const updateLight = () => {
  light.intensity = lightOn ? 0.8 : 0.1;
};
updateLight();
const lightSwitch = new Button(new Color("yellow"), () => {
  lightOn = !lightOn;
  updateLight();
});
lightSwitch.position.set(1, 1, -1);
useAdd(scene, floor, light, lightSwitch);

preserveOnce("toolbelt", () => {
  const buttons = [
    new Button(new Color("darkblue"), () => {
      const filePicker = new FilePicker(".", {
        size: 0.1,
        indent: 0.1,
        font: fontFromFlags({ bold: false, italic: false }),
        backgroundMaterial: materialFromColor("darkblue"),
        foregroundMaterial: materialFromColor("white"),
      });
      openInMovableScroller(filePicker, 1, TreeScrollerController);
    }),
    new Button(new Color("gray"), () => {
      const workspace = new Workspace();
      openInMovable(workspace, EditorMovableController);
    }),
  ];
  toolBelt.add(...buttons);
  return buttons;
});
