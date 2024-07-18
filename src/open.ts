import { Object3D, Vector3 } from "three";
import { Movable } from "./movable";
import { MovableController } from "./movable-controller";
import { camera } from "./renderer";
import { scene } from "./scene";
import { Scroller, ScrollerMovableController } from "./scroller";
import { ScrollerController } from "./scroller-controller";

export const openInMovable = <T extends Object3D>(
  object: T,
  name: string,
  controllerClass: new (object: T) => MovableController
) => {
  const controller = new controllerClass(object);
  const movable = new Movable(name, controller);
  scene.add(movable);
  movable.position.copy(camera.localToWorld(new Vector3(0, 0, -1)));
  return movable;
};

export const openInMovableScroller = <T extends Object3D>(
  object: T,
  name: string,
  height: number,
  controllerClass: new (object: T) => ScrollerController
) => {
  const controller = new controllerClass(object);
  const scroller = new Scroller(height, controller);
  const movable = openInMovable(scroller, name, ScrollerMovableController);
  return {
    movable,
    scroller,
  };
};
