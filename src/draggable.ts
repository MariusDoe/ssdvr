import { Object3D, Vector3 } from "three";
import { Controller } from "./controllers";
import { onController } from "./interaction";

export type DraggableContext = {
  worldOffset: Vector3;
  localOffset: Vector3;
};

export const createDraggable = (
  object: Object3D,
  onDrag: (context: DraggableContext) => void
) => {
  let worldLast: Vector3 | null = null;
  let distance = 0;
  let selectingController: Controller;
  onController(
    "selectstart",
    { mode: "object", object, recurse: true },
    ({ intersection, controller }) => {
      worldLast = intersection.point;
      distance = intersection.distance;
      selectingController = controller;
    }
  );
  onController("selectend", { mode: "whileInScene", object }, () => {
    worldLast = null;
  });
  onController("move", { mode: "whileInScene", object }, ({ controller }) => {
    if (!worldLast || selectingController !== controller) {
      return;
    }
    const worldCurrent = controller.hand.localToWorld(
      new Vector3(0, 0, -distance)
    );
    const worldOffset = worldCurrent.clone().sub(worldLast);
    const savedWorldLast = worldLast;
    worldLast = worldCurrent;
    const localOffset = () => {
      const localLast = object.worldToLocal(savedWorldLast.clone());
      const localCurrent = object.worldToLocal(worldCurrent.clone());
      return localCurrent.sub(localLast);
    };
    let _localOffset: Vector3 | null = null;
    onDrag({
      worldOffset,
      get localOffset() {
        return (_localOffset ??= localOffset());
      },
    });
  });
};
