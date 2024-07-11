import {
  EventDispatcher,
  EventListener,
  Object3D,
  Object3DEventMap,
} from "three";
import { preserveOnce } from "./hmr/preserve";
import { scene } from "./scene";

interface TreeMutationObserverEventMap {
  added: { object: Object3D };
  removed: { object: Object3D };
}

type Events = "childadded" | "childremoved";

type ObjectListeners = {
  [Event in Events]?: EventListener<Object3DEventMap[Event], Event, Object3D>;
};

export type Watcher<T extends Object3D, V> = {
  added: (watched: T) => V;
  removed: (watched: T, value: V) => void;
};

export type WatcherWithValue<T extends Object3D, V> = Watcher<T, V> & {
  value: V;
};

export class TreeMutationObserver extends EventDispatcher<TreeMutationObserverEventMap> {
  inTree = new Map<Object3D, ObjectListeners>();
  watchers = new WeakMap<Object3D, WatcherWithValue<Object3D, unknown>[]>();

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

  watch<T extends Object3D, V>(object: T, watcher: Watcher<T, V>) {
    const watchers = this.watchers.get(object) ?? [];
    watchers.push(watcher as WatcherWithValue<Object3D, unknown>);
    this.watchers.set(object, watchers);
    if (this.inTree.has(object)) {
      (watcher as WatcherWithValue<T, V>).value = watcher.added(object);
    }
  }
}

export const sceneMutationObserver = preserveOnce(
  "instance",
  () => new TreeMutationObserver(scene)
);
