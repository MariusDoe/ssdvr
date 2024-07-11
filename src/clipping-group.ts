import {
  Group,
  Light,
  Object3D,
  Object3DEventMap,
  Plane,
  Vector3,
} from "three";
import { useEventListener } from "./dispose-hooks";
import { preserveOnce } from "./hmr/preserve";
import { firstClippingGroupLayer, lightsLayer } from "./layers";
import { sceneMutationObserver } from "./tree-mutation-observer";
import { ancestorInstancesOf } from "./utils";

export const clippingGroups = preserveOnce(
  "clippingGroups",
  () => new Set<ClippingGroup>()
);

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
  private _clippingPlanes: readonly Plane[] = [];
  private _ancestorClippingPlanes: Plane[] = [];
  nestedClippingGroups: ClippingGroup[] = [];

  constructor() {
    super();
  }

  get clippingPlanes(): readonly Plane[] {
    return this._clippingPlanes;
  }

  set clippingPlanes(newPlanes: readonly Plane[]) {
    if (this._clippingPlanes.length > 0) {
      for (const descendent of this.nestedClippingGroups) {
        for (const plane of this._clippingPlanes) {
          const index = descendent._ancestorClippingPlanes.indexOf(plane);
          if (index >= 0) {
            descendent._ancestorClippingPlanes.splice(index, 1);
          }
        }
      }
    }
    this._clippingPlanes = newPlanes;
    if (this._clippingPlanes.length > 0) {
      for (const descendent of this.nestedClippingGroups) {
        descendent._ancestorClippingPlanes.push(...this._clippingPlanes);
      }
    }
  }

  get ancestorClippingPlanes(): readonly Plane[] {
    return this._ancestorClippingPlanes;
  }

  isClipped(worldPosition: Vector3) {
    return this.clippingPlanes.some(
      (plane) => plane.normal.dot(worldPosition) < -plane.constant
    );
  }
}

useEventListener(sceneMutationObserver, "added", ({ object }) => {
  if (object instanceof Light) {
    object.layers.enable(lightsLayer);
    return;
  }
  if (object instanceof ClippingGroup) {
    object.layer = nextClippingGroupLayer();
    for (const ancestor of [
      object,
      ...ancestorInstancesOf(object, ClippingGroup),
    ]) {
      (object.ancestorClippingPlanes as Plane[]).push(
        ...ancestor.clippingPlanes
      );
      ancestor.nestedClippingGroups.push(object);
    }
    clippingGroups.add(object);
    return;
  }
  const containingClippingGroup = getContainingClippingGroup(object);
  if (!containingClippingGroup) {
    return;
  }
  object.layers.set(containingClippingGroup.layer);
});
useEventListener(sceneMutationObserver, "removed", ({ object }) => {
  if (object instanceof ClippingGroup) {
    object.nestedClippingGroups = [];
    (object.ancestorClippingPlanes as Plane[]).splice(0, Infinity);
    clippingGroups.delete(object);
  }
});

export const getContainingClippingGroup = (object: Object3D) =>
  ancestorInstancesOf(object, ClippingGroup).next().value ?? null;
