import { Object3D, Vector3 } from "three";
import { Controller } from "./controllers";
import { onController } from "./interaction";

export type DraggableContext = {
  controller: Controller;
};

export type DragContext = DraggableContext & {
  worldOffset: Vector3;
  localOffset(): Vector3;
  localOffsetIn(referenceObject: Object3D): Vector3;
};

export const createDraggable = (
  object: Object3D,
  listeners: {
    onDrag?: (context: DragContext) => void;
    onDragStart?: (context: DraggableContext) => void;
    onDragEnd?: (context: DraggableContext) => void;
  }
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
      listeners.onDragStart?.({
        controller,
      });
    }
  );
  onController(
    "selectend",
    { mode: "whileInScene", object },
    ({ controller }) => {
      if (controller !== selectingController) {
        return;
      }
      worldLast = null;
      listeners.onDragEnd?.({
        controller,
      });
    }
  );
  if (!listeners.onDrag) {
    return;
  }
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
    const localOffsetIn = (referenceObject: Object3D) => {
      const localLast = referenceObject.worldToLocal(savedWorldLast.clone());
      const localCurrent = referenceObject.worldToLocal(worldCurrent.clone());
      return localCurrent.sub(localLast);
    };
    listeners.onDrag!({
      controller,
      worldOffset,
      localOffset: () => localOffsetIn(object),
      localOffsetIn,
    });
  });
};
