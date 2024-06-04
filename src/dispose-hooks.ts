import { EventDispatcher, EventListener, Object3D } from "three";
import { onDispose } from "./hmr/dispose";
import { captureRunningModule } from "./hmr/running-module";

// TypeScript workaround to allow extracting TEventMap from an EventDispatcher
// this does not give auto-completions for the event:
// type EventMap<T extends EventDispatcher> = T extends EventDispatcher<infer E> ? E : never;
const EventMap = Symbol();
declare module "three" {
  interface EventDispatcher<TEventMap extends {} = {}> {
    [EventMap]: TEventMap;
  }
}

export const useEventListener = <
  Dispatcher extends EventDispatcher,
  Event extends Extract<keyof Dispatcher[typeof EventMap], string>
>(
  target: Dispatcher,
  event: Event,
  listener: EventListener<Dispatcher[typeof EventMap][Event], Event, Dispatcher>
) => {
  const wrapped = captureRunningModule(listener);
  target.addEventListener(event, wrapped as any);
  onDispose(() => {
    target.removeEventListener(event, wrapped as any);
  });
};

export const useAdd = (parent: Object3D, child: Object3D) => {
  parent.add(child);
  onDispose(() => parent.remove(child));
};
