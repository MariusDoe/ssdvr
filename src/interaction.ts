import { Intersection, Object3D, Raycaster } from "three";
import { Controller, controllers } from "./controllers";

export type InteractionListenerModes = {
  object: {
    options: {
      object: Object3D;
    } & ObjectInteractionOptions;
    context: {
      intersection: Intersection;
    };
  };
  whileInScene: {
    options: {
      object: Object3D;
    };
    context: {};
  };
};

export type InteractionOptions<Mode extends InteractionListenerMode> = {
  mode: Mode;
} & InteractionListenerModes[Mode]["options"];

export type InteractionListenerMode = keyof InteractionListenerModes;

export type ObjectInteractionOptions = {
  recurse: boolean;
};

const interactionEvents = [
  "move",
  "selectstart",
  "select",
  "selectend",
  "squeezestart",
  "squeeze",
  "squeezeend",
] as const;

export type InteractionEvent = (typeof interactionEvents)[number];

export type InteractionContext<Mode extends InteractionListenerMode> = {
  event: InteractionEvent;
  controller: Controller;
} & InteractionListenerModes[Mode]["context"];

export type InteractionHandler<Mode extends InteractionListenerMode> = (
  context: InteractionContext<Mode>
) => void;

export type Listener<Mode extends InteractionListenerMode> = {
  handler: InteractionHandler<Mode>;
  options: InteractionOptions<Mode>;
};

const listeners = Object.fromEntries(
  interactionEvents.map((event) => [
    event,
    [] as Listener<InteractionListenerMode>[],
  ])
) as Record<InteractionEvent, Listener<InteractionListenerMode>[]>;

const objects = new Map<Object3D, ObjectInteractionOptions>();

const mergeObjectOptions = (
  a: ObjectInteractionOptions,
  b?: ObjectInteractionOptions
): ObjectInteractionOptions => ({
  recurse: a.recurse || (b?.recurse ?? false),
});

export const onController = <Mode extends InteractionListenerMode>(
  event: InteractionEvent,
  options: InteractionOptions<Mode>,
  handler: InteractionHandler<NoInfer<Mode>>
) => {
  const listener = {
    handler,
    options,
  } satisfies Listener<Mode> as unknown as Listener<InteractionListenerMode>;
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

    const objectEventListeners = eventListeners.filter(
      (listener) => listener.options.mode === "object"
    ) as Listener<"object">[];
    if (objectEventListeners.length === 0) {
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
    if (!firstHit) {
      return;
    }

    const { object, intersections } = firstHit;
    for (const listener of objectEventListeners) {
      if (listener.options.object === object) {
        listener.handler({
          event,
          controller,
          intersection: intersections[0],
        });
      }
    }
  };

  for (const event of interactionEvents) {
    hand.addEventListener(event, () => {
      fireEvent(event);
    });
  }
}
