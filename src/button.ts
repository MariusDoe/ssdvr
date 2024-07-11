import { Color, Mesh, MeshBasicMaterial, SphereGeometry } from "three";
import { onController } from "./interaction";

const removeButtonGeometry = new SphereGeometry(0.1);

export class Button extends Mesh {
  constructor(color: Color, onClick: () => void) {
    super(
      removeButtonGeometry,
      new MeshBasicMaterial({
        color,
      })
    );
    onController("select", this, "single", () => {
      onClick();
    });
  }

  get radius() {
    return removeButtonGeometry.parameters.radius;
  }
}
