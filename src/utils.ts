import { Object3D } from "three";

export function* ancestors(object: Object3D) {
  let current: Object3D | null = object;
  while ((current = current.parent)) {
    yield current;
  }
}

export function* ancestorInstancesOf<T extends Object3D>(
  object: Object3D,
  constructor: new (...args: unknown[]) => T
) {
  for (const ancestor of ancestors(object)) {
    if (ancestor instanceof constructor) {
      yield ancestor;
    }
  }
}

export const isAncestor = (ancestor: Object3D, object: Object3D) => {
  for (const someAncestor of ancestors(object)) {
    if (someAncestor === ancestor) {
      return true;
    }
  }
  return false;
};
