import { Intersection, Object3D, Raycaster } from "three";
import { Controller, controllers } from "./controllers";
import { sceneMutationObserver } from "./tree-mutation-observer";
import { isAncestor } from "./utils";

export type IntersectionContext = {
  [Event in InteractionEvent]: {
    object: Object3D;
  } & (Event extends ControllerEvent
    ? {
        intersection: Intersection;
      }
    : Event extends HoverEvent
    ? {
        entered: Controller[];
        exited: Controller[];
        active: Controller[];
      }
    : {});
};

const intersectionModes = ["single", "recurse"] as const;

export type IntersectionMode = (typeof intersectionModes)[number];

export type InteractionModeContext = {
  [Mode in IntersectionMode]: IntersectionContext;
} & {
  whileInScene: {
    [Event in InteractionEvent]: {};
  };
};

export type InteractionMode = keyof InteractionModeContext;

const isIntersectionMode = (mode: InteractionMode): mode is IntersectionMode =>
  intersectionModes.includes(mode as IntersectionMode);

const controllerEvents = [
  "move",
  "selectstart",
  "select",
  "selectend",
  "squeezestart",
  "squeeze",
  "squeezeend",
] as const;

const hoverEvents = ["enter", "exit"] as const;

const interactionEvents = [...controllerEvents, ...hoverEvents];

export type ControllerEvent = (typeof controllerEvents)[number];

export type HoverEvent = (typeof hoverEvents)[number];

export type InteractionEvent = (typeof interactionEvents)[number];

export type InteractionContext<
  Mode extends InteractionMode,
  Event extends InteractionEvent
> = {
  event: InteractionEvent;
  controller: Controller;
} & InteractionModeContext[Mode][Event];

export type InteractionHandler<
  Mode extends InteractionMode,
  Event extends InteractionEvent
> = (context: InteractionContext<Mode, Event>) => void;

export type Listener<
  Mode extends InteractionMode,
  Event extends InteractionEvent
> = {
  event: Event;
  handler: InteractionHandler<Mode, Event>;
  mode: Mode;
  object: Object3D;
};

type IntersectionOptions = {
  recurse: boolean;
};

const listeners = Object.fromEntries(
  interactionEvents.map((event) => [
    event,
    [] as Listener<InteractionMode, InteractionEvent>[],
  ])
) as Record<InteractionEvent, Listener<InteractionMode, InteractionEvent>[]>;

const objects = new Map<Object3D, IntersectionOptions>();

const mergeIntersectionOptions = (
  a: IntersectionOptions,
  b?: IntersectionOptions
): IntersectionOptions => ({
  recurse: a.recurse || (b?.recurse ?? false),
});

export const onController = <
  Mode extends InteractionMode,
  Event extends InteractionEvent
>(
  event: Event | Event[],
  object: Object3D,
  mode: Mode,
  handler: InteractionHandler<NoInfer<Mode>, Event>
) => {
  if (event instanceof Array) {
    for (const single of event) {
      onController(single, object, mode, handler);
    }
    return;
  }
  sceneMutationObserver.watch(object, {
    added(object) {
      const listener = {
        mode,
        object,
        event,
        handler,
      } satisfies Listener<Mode, Event> as unknown as Listener<
        InteractionMode,
        InteractionEvent
      >;
      if (isIntersectionMode(mode)) {
        objects.set(
          object,
          mergeIntersectionOptions(
            { recurse: mode === "recurse" },
            objects.get(object)
          )
        );
      }
      listeners[event].push(listener);
      return listener;
    },
    removed(object, listener) {
      objects.delete(object);
      const index = listeners[event].indexOf(listener);
      if (index < 0) {
        return;
      }
      listeners[event].splice(index, 1);
    },
  });
};

const raycaster = new Raycaster();

const hoveredObjects = new Map<Controller, Object3D>();

const dispatchObjectEvent = <Event extends InteractionEvent>(
  object: Object3D,
  objectEventListeners: Listener<IntersectionMode, Event>[],
  context: InteractionContext<IntersectionMode, Event>
) => {
  for (const listener of objectEventListeners) {
    if (
      listener.event === context.event &&
      (listener.object === object ||
        (listener.mode === "recurse" && isAncestor(listener.object, object)))
    ) {
      listener.handler(context);
    }
  }
};

for (const controller of controllers) {
  const { hand } = controller;

  const fireEvent = (event: InteractionEvent) => {
    const eventListeners = listeners[event];

    for (const { handler, mode } of eventListeners) {
      if (mode === "whileInScene") {
        handler({
          event,
          controller,
        });
      }
    }

    const hoverListeners = hoverEvents
      .flatMap((hoverEvent) => listeners[hoverEvent])
      .filter((listener) => isIntersectionMode(listener.mode)) as Listener<
      IntersectionMode,
      HoverEvent
    >[];
    const intersectionListeners = eventListeners.filter((listener) =>
      isIntersectionMode(listener.mode)
    ) as Listener<IntersectionMode, InteractionEvent>[];
    if (intersectionListeners.length === 0 && hoverListeners.length === 0) {
      return;
    }

    raycaster.setFromXRController(hand);
    const raycasts = Array.from(objects.entries())
      .map(([object, options]) => ({
        object,
        intersections: raycaster.intersectObject(object, options.recurse),
      }))
      .filter(({ intersections }) => intersections.length > 0);
    const minDistance = Math.min(
      ...raycasts.map(({ intersections }) => intersections[0].distance)
    );
    const firstHit = raycasts.find(
      ({ intersections }) => intersections[0].distance === minDistance
    );

    const oldHoveredObject = hoveredObjects.get(controller);
    const newHoveredObject = firstHit?.object;
    if (newHoveredObject) {
      hoveredObjects.set(controller, newHoveredObject);
    } else {
      hoveredObjects.delete(controller);
    }
    if (newHoveredObject !== oldHoveredObject) {
      const active = (hoveredObject: Object3D) =>
        Array.from(hoveredObjects.entries())
          .filter(([_, object]) => object === hoveredObject)
          .map(([controller, _]) => controller);
      if (oldHoveredObject) {
        dispatchObjectEvent(oldHoveredObject, hoverListeners, {
          event: "exit",
          object: oldHoveredObject,
          controller,
          entered: [],
          exited: [controller],
          active: active(oldHoveredObject),
        });
      }
      if (newHoveredObject) {
        dispatchObjectEvent(newHoveredObject, hoverListeners, {
          event: "enter",
          object: newHoveredObject,
          controller,
          entered: [controller],
          exited: [],
          active: active(newHoveredObject),
        });
      }
    }

    if (firstHit) {
      const { object, intersections } = firstHit;
      dispatchObjectEvent(object, intersectionListeners, {
        event,
        object,
        controller,
        intersection: intersections[0],
      });
    }
  };

  for (const event of controllerEvents) {
    hand.addEventListener(event, () => {
      fireEvent(event);
    });
  }
}
