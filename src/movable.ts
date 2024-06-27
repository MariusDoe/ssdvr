import {
  CapsuleGeometry,
  Color,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Quaternion,
  SphereGeometry,
  Vector3,
} from "three";
import { DragContext, createDraggable } from "./draggable";
import { onController } from "./interaction";
import { MovableController } from "./movable-controller";
import { scene } from "./scene";

const handleGeometry = new CapsuleGeometry(0.1, 2);
const handleMaterial = new MeshBasicMaterial({
  color: new Color("white"),
});
const handleHoverMaterial = new MeshBasicMaterial({
  color: new Color("lightblue"),
});
const removeButtonGeometry = new SphereGeometry(0.1);
const removeButtonMaterial = new MeshBasicMaterial({
  color: new Color("red"),
});

export class Movable extends Object3D {
  handle!: Mesh;
  removeButton!: Mesh;

  constructor(public controller: MovableController) {
    super();
    this.add(this.controller.child);
    this.initialiseHandle();
    this.initialiseRemoveButton();
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
    onController(["enter", "exit"], this.handle, "recurse", ({ active }) => {
      hovered = active.length > 0;
      updateMaterial();
    });
  }

  initialiseRemoveButton() {
    this.removeButton = new Mesh(removeButtonGeometry, removeButtonMaterial);
    this.add(this.removeButton);
    this.removeButton.position.x = -(
      handleGeometry.parameters.length / 2 +
      handleGeometry.parameters.radius +
      removeButtonGeometry.parameters.radius * 1.5
    );
    this.removeButton.position.y = -removeButtonGeometry.parameters.radius;
    onController("select", this.removeButton, "recurse", () => {
      this.removeFromParent();
    });
  }

  tick() {
    this.controller.applyOffset();
  }

  onDrag(context: DragContext) {
    const { controller, localOffsetIn } = context;
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
      oldHandComponent * Math.max(1, Math.min(context.distance ** 1.5, 20));
    const handComponentDiff = newHandComponent - oldHandComponent;
    localOffset.add(localHandDirection.setLength(handComponentDiff));
    context.distance += handComponentDiff;
    this.position.add(localOffset);
  }
}

export const openInMovable = <T extends Object3D>(
  object: T,
  controllerClass: new (object: T) => MovableController
) => {
  const controller = new controllerClass(object);
  const movable = new Movable(controller);
  scene.add(movable);
  return movable;
};
