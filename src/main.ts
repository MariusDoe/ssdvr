import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import {
  InteractiveGroup,
  XRControllerModelFactory,
} from "three/examples/jsm/Addons.js";
import { HTMLMesh } from "./HTMLCanvas";
import "./userWorker";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  10
);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
});
document.body.appendChild(renderer.domElement);

renderer.xr.getSession()?.domOverlayState;

document.body.appendChild(VRButton.createButton(renderer));

const lineGeometry = new THREE.BufferGeometry();
lineGeometry.setFromPoints([
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0, 0, -5),
]);

const controllerIndices = [0, 1];
const controllers = controllerIndices.map((index) =>
  renderer.xr.getController(index)
);
for (const controller of controllers) {
  controller.add(
    new THREE.Line(
      lineGeometry,
      new THREE.LineBasicMaterial({
        color: "red",
      })
    )
  );
  scene.add(controller);
}

const controllerModelFactory = new XRControllerModelFactory();

const controllerGrips = controllerIndices.map((index) =>
  renderer.xr.getControllerGrip(index)
);
for (const controllerGrip of controllerGrips) {
  controllerGrip.add(
    controllerModelFactory.createControllerModel(controllerGrip)
  );
  scene.add(controllerGrip);
}

const interactiveGroup = new InteractiveGroup();
interactiveGroup.listenToPointerEvents(renderer, camera);
for (const controller of controllers) {
  interactiveGroup.listenToXRControllerEvents(controller);
}
scene.add(interactiveGroup);

const editorContainer = document.body.appendChild(
  document.createElement("div")
);
editorContainer.style.width = "100vw";
editorContainer.style.height = "100vh";
editorContainer.addEventListener("click", (event) => {
  (event.target as HTMLElement | null)?.focus();
});

const editor = monaco.editor.create(editorContainer, {
  value: 'function test() {\n\tconsole.log("Hello World!");\n}',
  language: "typescript",
  cursorBlinking: "solid",
});

const editorMesh = new HTMLMesh(editorContainer);
editorMesh.position.y = 1;
interactiveGroup.add(editorMesh);
