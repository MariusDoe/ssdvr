import { PerspectiveCamera, Scene, WebGLRenderer } from "three";
import { tickAll } from "./tick";

export const scene = new Scene();

const camera = new PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

export const renderer = new WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(() => {
  tickAll(scene);
  renderer.render(scene, camera);
});
document.body.appendChild(renderer.domElement);
