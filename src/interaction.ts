import { Intersection, Object3D, Raycaster } from "three";
import { Controller, controllers } from "./controllers";
import { isAncestor } from "./utils";

export type InteractionListenerModes = {
  object: {
    options: {
      object: Object3D;
    } & ObjectInteractionOptions;
    context: {
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
  };
  whileInScene: {
    options: {
      object: Object3D;
    };
    context: {
      [Event in InteractionEvent]: {};
    };
  };
};

export type InteractionOptions<Mode extends InteractionListenerMode> = {
  mode: Mode;
} & InteractionListenerModes[Mode]["options"];

export type InteractionListenerMode = keyof InteractionListenerModes;

export type ObjectInteractionOptions = {
  recurse: boolean;
};

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
  Mode extends InteractionListenerMode,
  Event extends InteractionEvent
> = {
  event: InteractionEvent;
  controller: Controller;
} & InteractionListenerModes[Mode]["context"][Event];

export type InteractionHandler<
  Mode extends InteractionListenerMode,
  Event extends InteractionEvent
> = (context: InteractionContext<Mode, Event>) => void;

export type Listener<
  Mode extends InteractionListenerMode,
  Event extends InteractionEvent
> = {
  event: Event;
  handler: InteractionHandler<Mode, Event>;
  options: InteractionOptions<Mode>;
};

const listeners = Object.fromEntries(
  interactionEvents.map((event) => [
    event,
    [] as Listener<InteractionListenerMode, InteractionEvent>[],
  ])
) as Record<
  InteractionEvent,
  Listener<InteractionListenerMode, InteractionEvent>[]
>;

const objects = new Map<Object3D, ObjectInteractionOptions>();

const mergeObjectOptions = (
  a: ObjectInteractionOptions,
  b?: ObjectInteractionOptions
): ObjectInteractionOptions => ({
  recurse: a.recurse || (b?.recurse ?? false),
});

export const onController = <
  Mode extends InteractionListenerMode,
  Event extends InteractionEvent
>(
  event: Event | Event[],
  options: InteractionOptions<Mode>,
  handler: InteractionHandler<NoInfer<Mode>, Event>
) => {
  if (event instanceof Array) {
    for (const single of event) {
      onController(single, options, handler);
    }
    return;
  }
  const listener = {
    event,
    handler,
    options,
  } satisfies Listener<Mode, Event> as unknown as Listener<
    InteractionListenerMode,
    InteractionEvent
  >;
  listeners[event].push(listener);
  let witness: Object3D;
  if ("recurse" in listener.options) {
    const { object, recurse } = listener.options;
    objects.set(object, mergeObjectOptions({ recurse }, objects.get(object)));
    witness = object;
  } else {
    witness = listener.options.object;
  }
  witness.addEventListener("removed", () => {
    objects.delete(witness);
    const index = listeners[event].indexOf(listener);
    if (index < 0) {
      return;
    }
    listeners[event].splice(index, 1);
  });
};

const raycaster = new Raycaster();

const hoveredObjects = new Map<Controller, Object3D>();

const dispatchObjectEvent = <Event extends InteractionEvent>(
  object: Object3D,
  objectEventListeners: Listener<"object", Event>[],
  context: InteractionContext<"object", Event>
) => {
  for (const listener of objectEventListeners) {
    if (
      listener.event === context.event &&
      (listener.options.object === object ||
        (listener.options.recurse &&
          isAncestor(listener.options.object, object)))
    ) {
      listener.handler(context);
    }
  }
};

for (const controller of controllers) {
  const { hand } = controller;

  const fireEvent = (event: InteractionEvent) => {
    const eventListeners = listeners[event];

    for (const { handler, options } of eventListeners) {
      if (options.mode === "whileInScene") {
        handler({
          event,
          controller,
        });
      }
    }

    const hoverEventListeners = hoverEvents
      .flatMap((hoverEvent) => listeners[hoverEvent])
      .filter((listener) => listener.options.mode === "object") as Listener<
      "object",
      HoverEvent
    >[];
    const objectEventListeners = eventListeners.filter(
      (listener) => listener.options.mode === "object"
    ) as Listener<"object", InteractionEvent>[];
    if (objectEventListeners.length === 0 && hoverEventListeners.length === 0) {
      return;
    }

    raycaster.setFromXRController(controller.hand);
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
        dispatchObjectEvent(oldHoveredObject, hoverEventListeners, {
          event: "exit",
          object: oldHoveredObject,
          controller,
          entered: [],
          exited: [controller],
          active: active(oldHoveredObject),
        });
      }
      if (newHoveredObject) {
        dispatchObjectEvent(newHoveredObject, hoverEventListeners, {
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
      dispatchObjectEvent(object, objectEventListeners, {
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
