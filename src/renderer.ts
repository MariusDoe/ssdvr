import { PerspectiveCamera, Plane, WebGLRenderer } from "three";
import { clippingGroups } from "./clipping-group";
import { defaultLayer, lightsLayer } from "./layers";
import { scene } from "./scene";
import { tickAll } from "./tick";

export const camera = new PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const render = (layer: number, clippingPlanes: Plane[]) => {
  const xrCamera = renderer.xr.getCamera();
  for (const renderedCamera of [camera, xrCamera, ...xrCamera.cameras]) {
    renderedCamera.layers.set(layer);
    renderedCamera.layers.enable(lightsLayer);
  }
  renderer.clippingPlanes = clippingPlanes;
  renderer.render(scene, camera);
};

export const renderer = new WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.autoClear = false;
renderer.setAnimationLoop(() => {
  tickAll(scene);
  renderer.clear();
  render(defaultLayer, []);
  for (const clippingGroup of clippingGroups) {
    render(clippingGroup.layer, clippingGroup.clippingPlanes);
  }
});
document.body.appendChild(renderer.domElement);
