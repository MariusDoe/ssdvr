import {
  EventDispatcher,
  EventListener,
  Object3D,
  Object3DEventMap,
} from "three";
import { scene } from "./scene";

interface TreeMutationObserverEventMap {
  added: { object: Object3D };
  removed: { object: Object3D };
}

type Events = "childadded" | "childremoved";

type ObjectListeners = {
  [Event in Events]?: EventListener<Object3DEventMap[Event], Event, Object3D>;
};

export class TreeMutationObserver extends EventDispatcher<TreeMutationObserverEventMap> {
  inTree = new Map<Object3D, ObjectListeners>();

  constructor(root: Object3D) {
    super();
    this.addAll(root);
  }

  add(object: Object3D) {
    if (this.inTree.has(object)) {
      return;
    }
    const listeners: ObjectListeners = {
      childadded: ({ child }) => {
        this.addAll(child);
      },
      childremoved: ({ child }) => {
        this.removeAll(child);
      },
    };
    this.inTree.set(object, listeners);
    for (const event in listeners) {
      object.addEventListener(event, listeners[event as Events] as any);
    }
    this.dispatchEvent({ type: "added", object });
  }

  addAll(object: Object3D) {
    object.traverse((descendent) => {
      this.add(descendent);
    });
  }

  remove(object: Object3D) {
    const listeners = this.inTree.get(object);
    if (!listeners) {
      return;
    }
    this.inTree.delete(object);
    for (const event in listeners) {
      object.removeEventListener(event, listeners[event as Events] as any);
    }
    this.dispatchEvent({ type: "removed", object });
  }

  removeAll(object: Object3D) {
    object.traverse((descendent) => {
      this.remove(descendent);
    });
  }
}

export const sceneMutationObserver = new TreeMutationObserver(scene);
