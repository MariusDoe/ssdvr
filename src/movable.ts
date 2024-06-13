import {
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

declare module "three" {
  interface Object3D {
    getSizeInMovable?(): Vector3;
  }
}

const handleGeometry = new CapsuleGeometry(0.1, 2);
const handleMaterial = new MeshBasicMaterial({
  color: new Color("white"),
});
const handleHoverMaterial = new MeshBasicMaterial({
  color: new Color("lightblue"),
});

export class Movable extends Object3D {
  handle!: Mesh;

  constructor() {
    super();
    this.initialiseHandle();
  }

  initialiseHandle() {
    this.handle = new Mesh(handleGeometry, handleMaterial);
    this.handle.rotateZ(Math.PI / 2);
    this.handle.position.y = -handleGeometry.parameters.radius;
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

  tick() {
    const zero = new Vector3();
    for (const child of this.children) {
      if (child === this.handle) {
        continue;
      }
      const size = child.getSizeInMovable?.() ?? zero;
      child.position.set(-size.x / 2, size.y, -size.z / 2);
    }
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
    const newHandComponent =
      oldHandComponent * Math.max(1, Math.min(distance ** 1.5, 20));
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
