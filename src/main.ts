import "core-js/actual";
import {
  AmbientLight,
  Color,
  Mesh,
  MeshPhysicalMaterial,
  PlaneGeometry,
  TextureLoader,
} from "three";
import uvTexture from "../textures/uv_grid_opengl.jpg?url";
import { Button } from "./button";
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
import { scene } from "./scene";
import { TreeScrollerController } from "./tree";
import "./vr";
import { Workspace } from "./workspace";

preserve("environment", async () => {
  const texture = await new TextureLoader().loadAsync(uvTexture);
  const floor = new Mesh(
    new PlaneGeometry(5, 5),
    new MeshPhysicalMaterial({ map: texture })
  );

  floor.rotateX(-Math.PI / 2);
  scene.add(floor);
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
  scene.add(light, lightSwitch);
  lightSwitch.position.set(1, 1, -1);
});

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
