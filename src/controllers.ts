import { BufferGeometry, Line, LineBasicMaterial, Vector3 } from "three";
import { XRControllerModelFactory } from "three/examples/jsm/Addons.js";
import { renderer, scene } from "./scene";

const lineGeometry = new BufferGeometry();
lineGeometry.setFromPoints([new Vector3(0, 0, 0), new Vector3(0, 0, -5)]);

const controllerIndices = [0, 1];
const controllers = controllerIndices.map((index) =>
  renderer.xr.getController(index)
);
for (const controller of controllers) {
  controller.add(
    new Line(
      lineGeometry,
      new LineBasicMaterial({
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
