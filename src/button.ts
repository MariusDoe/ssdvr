import { Color, Mesh, MeshBasicMaterial, SphereGeometry } from "three";
import { getTextMesh } from "./editor/fonts";
import { onController } from "./interaction";
import { camera } from "./renderer";

const geometry = new SphereGeometry(0.1);

export class Button extends Mesh {
  constructor(label: string, color: Color, onClick: () => void) {
    super(
      geometry,
      new MeshBasicMaterial({
        color,
      })
    );
    const labelText = getTextMesh(label, { size: this.radius * 0.2 });
    this.add(labelText);
    labelText.position.z += this.radius * 1.1;
    labelText.centerHorizontally();
    onController("select", this, "single", () => {
      onClick();
    });
  }

  get radius() {
    return geometry.parameters.radius;
  }

  tick() {
    this.lookAt(camera.position);
  }
}
