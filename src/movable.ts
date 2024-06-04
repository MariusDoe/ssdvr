import {
  Box3,
  CapsuleGeometry,
  Color,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Vector3,
} from "three";
import { DraggableContext, createDraggable } from "./draggable";
import { scene } from "./scene";

const handleMesh = new CapsuleGeometry(0.1, 2);
const handleMaterial = new MeshBasicMaterial({
  color: new Color("white"),
});

export class Movable extends Object3D {
  boundingBox: Box3;
  handle: Mesh;

  constructor() {
    super();
    this.handle = new Mesh(handleMesh, handleMaterial);
    this.handle.rotateZ(Math.PI / 2);
    this.add(this.handle);
    createDraggable(this.handle, (context) => {
      this.onDrag(context);
    });
    this.boundingBox = new Box3();
  }

  updateBoundingBox() {
    for (const child of this.children) {
      if (child === this.handle) {
        continue;
      }
      this.boundingBox.expandByObject(child);
    }
  }

  tick() {
    this.updateBoundingBox();
    if (this.boundingBox.isEmpty()) {
      this.handle.position.set(0, 0, 0);
      return;
    }
    const worldPosition = this.boundingBox
      .getCenter(new Vector3())
      .setY(this.boundingBox.min.y);
    this.handle.position.copy(this.worldToLocal(worldPosition));
  }

  onDrag(context: DraggableContext) {
    this.position.add(context.localOffset);
  }
}

export const openInMovable = (object: Object3D) => {
  const movable = new Movable();
  movable.add(object);
  scene.add(movable);
  return movable;
};
