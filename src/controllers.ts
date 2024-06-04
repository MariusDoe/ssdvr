import {
  BufferGeometry,
  Line,
  LineBasicMaterial,
  Vector3,
  XRGripSpace,
  XRTargetRaySpace,
} from "three";
import { XRControllerModelFactory } from "three/examples/jsm/Addons.js";
import { useAdd, useEventListener } from "./dispose-hooks";
import { onDispose } from "./hmr/dispose";
import { captureRunningModule } from "./hmr/running-module";
import { renderer, scene } from "./scene";

export type Controller = {
  source?: XRInputSource;
  hand: XRTargetRaySpace;
  grip: XRGripSpace;
};

export const controllers: Controller[] = [];

const lineGeometry = new BufferGeometry();
lineGeometry.setFromPoints([new Vector3(0, 0, 0), new Vector3(0, 0, -5)]);

const controllerModelFactory = new XRControllerModelFactory();

for (let index = 0; index < 2; index++) {
  const hand = renderer.xr.getController(index);
  useAdd(
    hand,
    new Line(
      lineGeometry,
      new LineBasicMaterial({
        color: "red",
      })
    )
  );
  useAdd(scene, hand);

  const grip = renderer.xr.getControllerGrip(index);
  useAdd(grip, controllerModelFactory.createControllerModel(grip));
  useAdd(scene, grip);

  const controller = {
    hand,
    grip,
  };
  controllers.push(controller);
}

const updateControllers = () => {
  let index = 0;
  for (const source of renderer.xr.getSession()!.inputSources) {
    if (index >= controllers.length) {
      break;
    }
    controllers[index].source = source;
  }
};

useEventListener(renderer.xr, "sessionstart", () => {
  updateControllers();
  const session = renderer.xr.getSession()!;
  const listener = captureRunningModule(() => {
    updateControllers();
  });
  session.addEventListener("inputsourceschange", listener);
  onDispose(() => session.removeEventListener("inputsourceschange", listener));
});
