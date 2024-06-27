import { Object3D } from "three";
import { Movable } from "./movable";
import { MovableController } from "./movable-controller";
import { scene } from "./scene";

export const openInMovable = <T extends Object3D>(
  object: T,
  controllerClass: new (object: T) => MovableController
) => {
  const controller = new controllerClass(object);
  const movable = new Movable(controller);
  scene.add(movable);
  return movable;
};
