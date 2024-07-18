import {
  CapsuleGeometry,
  Color,
  Mesh,
  Object3D,
  Quaternion,
  Vector3,
} from "three";
import { Button } from "./button";
import { DragContext, createDraggable } from "./draggable";
import { getTextMesh } from "./editor/fonts";
import { onController } from "./interaction";
import { materialFromColor } from "./materials";
import { MovableController } from "./movable-controller";
import { toolBelt } from "./tool-belt";

const handleGeometry = new CapsuleGeometry(0.1, 2);
handleGeometry.rotateZ(Math.PI / 2);
const handleMaterial = materialFromColor("white");
const nameMaterial = materialFromColor("black");
const handleHoverMaterial = materialFromColor("lightblue");

export class Movable extends Object3D {
  handle!: Mesh;

  constructor(name: string, public controller: MovableController) {
    super();
    this.name = name;
    this.add(this.controller.child);
    this.initialiseHandle();
    this.initializeRemoveButton();
    this.initializeMinimizeButton();
  }

  initialiseHandle() {
    this.handle = new Mesh(handleGeometry, handleMaterial);
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
    const label = getTextMesh(this.name, { material: nameMaterial, size: 0.1 });
    this.handle.add(label);
    label.position.z += handleGeometry.parameters.radius * 1.1;
    label.centerHorizontally();
  }

  get handleWidth() {
    return (
      handleGeometry.parameters.length / 2 + handleGeometry.parameters.radius
    );
  }

  addButton(button: Button, side: number) {
    this.add(button);
    button.position.x = side * (this.handleWidth + button.radius * 1.5);
    button.position.y = -button.radius;
  }

  initializeRemoveButton() {
    this.addButton(
      new Button("Close", new Color("red"), () => {
        this.removeFromParent();
      }),
      -1
    );
  }

  initializeMinimizeButton() {
    this.addButton(
      new Button("Minimize", new Color("lightblue"), () => {
        this.minimize();
      }),
      1
    );
  }

  minimize() {
    const parent = this.parent;
    if (!parent) {
      return;
    }
    this.removeFromParent();
    const maximizeButton = new Button(this.name, new Color("lightblue"), () => {
      maximizeButton.removeFromParent();
      parent.add(this);
    });
    toolBelt.add(maximizeButton);
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
