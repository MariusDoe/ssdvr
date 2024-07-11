import { Clock, Object3D } from "three";
import { preserveOnce } from "./hmr/preserve";

export type TickContext = {
  delta: number;
};

declare module "three" {
  interface Object3D {
    tick?(context: TickContext): void;
  }

  interface Object3DEventMap {
    tick: {};
  }
}

const clock = preserveOnce("clock", () => new Clock());

export const tickAll = (scene: Object3D) => {
  const context = {
    delta: clock.getDelta(),
  };
  scene.traverse((child) => {
    child.tick?.(context);
    child.dispatchEvent({
      type: "tick",
    });
  });
};
