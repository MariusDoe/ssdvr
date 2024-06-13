import {
  Box3,
  CapsuleGeometry,
  Color,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Quaternion,
  Vector3,
} from "three";
import { DragContext, createDraggable } from "./draggable";
import { onController } from "./interaction";
import { scene } from "./scene";

const handleGeometry = new CapsuleGeometry(0.1, 2);
const handleMaterial = new MeshBasicMaterial({
  color: new Color("white"),
});
const handleHoverMaterial = new MeshBasicMaterial({
  color: new Color("lightblue"),
});

export class Movable extends Object3D {
  boundingBox: Box3;
  handle!: Mesh;

  constructor() {
    super();
    this.initialiseHandle();
    this.boundingBox = new Box3();
  }

  initialiseHandle() {
    this.handle = new Mesh(handleGeometry, handleMaterial);
    this.handle.rotateZ(Math.PI / 2);
    this.add(this.handle);
    let dragging = false;
    let hovered = false;
    const updateMaterial = () => {
      this.handle.material =
        dragging || hovered ? handleHoverMaterial : handleMaterial;
    };
    createDraggable(this.handle, {
      onDrag: (context) => {
        this.onDrag(context);
      },
      onDragStart() {
        dragging = true;
        updateMaterial();
      },
      onDragEnd() {
        dragging = false;
        updateMaterial();
      },
    });
    onController(
      ["enter", "exit"],
      {
        mode: "object",
        object: this.handle,
        recurse: true,
      },
      ({ active }) => {
        hovered = active.length > 0;
        updateMaterial();
      }
    );
  }

  updateBoundingBox() {
    const worldPosition = this.getWorldPosition(new Vector3());
    this.boundingBox.translate(worldPosition);
    for (const child of this.children) {
      if (child === this.handle) {
        continue;
      }
      this.boundingBox.expandByObject(child);
    }
    this.boundingBox.translate(worldPosition.negate());
  }

  tick() {
    this.updateBoundingBox();
    if (this.boundingBox.isEmpty()) {
      this.handle.position.set(0, 0, 0);
      return;
    }
    const worldPosition = this.boundingBox
      .getCenter(new Vector3())
      .setY(this.boundingBox.min.y)
      .add(this.getWorldPosition(new Vector3()));
    this.handle.position.copy(
      this.worldToLocal(worldPosition).add(
        new Vector3(0, -handleGeometry.parameters.radius, 0)
      )
    );
  }

  onDrag({ controller, localOffsetIn, distance, addToDistance }: DragContext) {
    const quaternion = new Quaternion();
    const worldHandDirection = new Vector3(0, 0, -1).applyQuaternion(
      controller.hand.getWorldQuaternion(quaternion)
    );
    const localHandDirection = worldHandDirection
      .applyQuaternion(this.getWorldQuaternion(quaternion).invert())
      .normalize();
    const localOffset = localOffsetIn(this);
    const oldHandComponent = localOffset.dot(localHandDirection);
    const newHandComponent = oldHandComponent * Math.max(0.2, Math.min(distance ** 1.5, 20));
    const handComponentDiff = newHandComponent - oldHandComponent;
    localOffset.add(localHandDirection.setLength(handComponentDiff));
    addToDistance(handComponentDiff);
    this.position.add(localOffset);
  }
}

export const openInMovable = (object: Object3D) => {
  const movable = new Movable();
  movable.add(object);
  scene.add(movable);
  return movable;
};
