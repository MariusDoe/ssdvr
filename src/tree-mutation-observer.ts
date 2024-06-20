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

export type Watcher<T> = {
  added: (watched: Object3D) => T;
  removed: (watched: Object3D, value: T) => void;
};

export type WatcherWithValue<T> = Watcher<T> & {
  value: T;
};

export class TreeMutationObserver extends EventDispatcher<TreeMutationObserverEventMap> {
  inTree = new Map<Object3D, ObjectListeners>();
  watchers = new WeakMap<Object3D, WatcherWithValue<unknown>[]>();

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
    this.watchers.get(object)?.forEach((watcher) => {
      watcher.value = watcher.added(object);
    });
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
    this.watchers.get(object)?.forEach((watcher) => {
      watcher.removed(object, watcher.value);
      watcher.value = undefined;
    });
  }

  removeAll(object: Object3D) {
    object.traverse((descendent) => {
      this.remove(descendent);
    });
  }

  watch<T>(object: Object3D, watcher: Watcher<T>) {
    const watchers = this.watchers.get(object) ?? [];
    watchers.push(watcher as WatcherWithValue<unknown>);
    this.watchers.set(object, watchers);
    if (this.inTree.has(object)) {
      (watcher as WatcherWithValue<T>).value = watcher.added(object);
    }
  }
}

export const sceneMutationObserver = new TreeMutationObserver(scene);
