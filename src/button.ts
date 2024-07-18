import { Color, Mesh, MeshBasicMaterial, SphereGeometry, Vector3 } from "three";
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
    labelText.geometry.computeBoundingBox();
    labelText.position.x -=
      (labelText.geometry.boundingBox!.getSize(new Vector3()).x *
        labelText.scale.x) /
      2;
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
