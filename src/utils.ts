import { Object3D } from "three";

export const isAncestor = (ancestor: Object3D, object: Object3D) => {
  let current: Object3D | null = object;
  while ((current = current.parent)) {
    if (current === ancestor) {
      return true;
    }
  }
  return false;
};
