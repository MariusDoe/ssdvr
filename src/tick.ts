import * as THREE from "three";

export type TickContext = {
  delta: number;
};

declare module "three" {
  interface Object3D {
    tick?(context: TickContext): void;
  }
}

const clock = new THREE.Clock();

export const tickAll = (scene: THREE.Object3D) => {
  const context = {
    delta: clock.getDelta(),
  };
  scene.traverse((child) => {
    child.tick?.(context);
  });
};
