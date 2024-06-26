import {
  Group,
  Light,
  Object3D,
  Object3DEventMap,
  Plane,
  Vector3,
} from "three";
import { firstClippingGroupLayer, lightsLayer } from "./layers";
import { sceneMutationObserver } from "./tree-mutation-observer";
import { isAncestor } from "./utils";

export const clippingGroups = new Set<ClippingGroup>();

const nextClippingGroupLayer = () => {
  const layers = new Set([...clippingGroups].map((group) => group.layer));
  for (let layer = firstClippingGroupLayer; layer <= 31; layer++) {
    if (!layers.has(layer)) {
      return layer;
    }
  }
  throw new Error("too many ClippingGroups");
};

export class ClippingGroup<
  TEventMap extends Object3DEventMap = Object3DEventMap
> extends Group<TEventMap> {
  layer = -1;
  clippingPlanes: Plane[] = [];

  isClipped(worldPosition: Vector3) {
    return this.clippingPlanes.some(
      (plane) => plane.normal.dot(worldPosition) < -plane.constant
    );
  }
}

sceneMutationObserver.addEventListener("added", ({ object }) => {
  if (object instanceof Light) {
    object.layers.enable(lightsLayer);
    return;
  }
  if (object instanceof ClippingGroup) {
    object.layer = nextClippingGroupLayer();
    clippingGroups.add(object);
    return;
  }
  const clippingGroup = [...clippingGroups].find((group) =>
    isAncestor(group, object)
  );
  if (!clippingGroup) {
    return;
  }
  object.layers.set(clippingGroup.layer);
});
sceneMutationObserver.addEventListener("removed", ({ object }) => {
  if (object instanceof ClippingGroup) {
    clippingGroups.delete(object);
  }
});

export const getContainingClippingGroup = (object: Object3D) => {
  let current: Object3D | null = object;
  while (current) {
    if (current instanceof ClippingGroup) {
      return current;
    }
    current = current.parent;
  }
  return null;
};
