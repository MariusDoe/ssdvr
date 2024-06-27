import { Object3D } from "three";
import { Movable } from "./movable";
import { MovableController } from "./movable-controller";
import { scene } from "./scene";
import { Scroller, ScrollerMovableController } from "./scroller";
import { ScrollerController } from "./scroller-controller";

export const openInMovable = <T extends Object3D>(
  object: T,
  controllerClass: new (object: T) => MovableController
) => {
  const controller = new controllerClass(object);
  const movable = new Movable(controller);
  scene.add(movable);
  return movable;
};

export const openInMovableScroller = <T extends Object3D>(
  object: T,
  height: number,
  controllerClass: new (object: T) => ScrollerController
) => {
  const controller = new controllerClass(object);
  const scroller = new Scroller(height, controller);
  const movable = openInMovable(scroller, ScrollerMovableController);
  return {
    movable,
    scroller,
  };
};
