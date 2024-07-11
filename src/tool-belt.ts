import { Object3D, Vector3 } from "three";
import { preserve } from "./hmr/preserve";
import { camera } from "./renderer";
import { scene } from "./scene";

export class ToolBelt extends Object3D {
  static headOffset = new Vector3(0, -0.7, 0);

  tick() {
    this.position.addVectors(camera.position, ToolBelt.headOffset);
    const targetPosition = camera.localToWorld(new Vector3(0, 0, -1));
    targetPosition.y = camera.position.y;
    targetPosition.add(ToolBelt.headOffset);
    this.lookAt(targetPosition);
    this.updateLayout();
  }

  updateLayout() {
    if (this.children.length === 0) {
      return;
    }
    const radius = 0.1 * this.children.length;
    if (this.children.length === 1) {
      this.children[0].position.set(0, 0, radius);
      return;
    }
    const range = Math.PI / 2;
    let angle = -range / 2;
    let step = range / (this.children.length - 1);
    for (let i = 0; i < this.children.length; i++) {
      this.children[i].position.setFromCylindricalCoords(radius, angle, 0);
      angle += step;
    }
  }
}

export const toolBelt = preserve("instance", () => {
  const instance = new ToolBelt();
  scene.add(instance);
  return instance;
});
