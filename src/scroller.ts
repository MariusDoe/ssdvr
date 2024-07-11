import {
  CylinderGeometry,
  Mesh,
  Object3DEventMap,
  Plane,
  Vector3,
} from "three";
import { clamp } from "three/src/math/MathUtils.js";
import { ClippingGroup } from "./clipping-group";
import { DragContext, createDraggable } from "./draggable";
import { materialFromColor } from "./materials";
import { MovableController } from "./movable-controller";
import { ScrollerController } from "./scroller-controller";

const handleGeometry = new CylinderGeometry(0.03, 0.03);
const handleMaterial = materialFromColor("#888888");

interface ScrollerEventMap extends Object3DEventMap {
  scrolled: {
    position: number;
  };
}

export class Scroller extends ClippingGroup<ScrollerEventMap> {
  top = new Plane();
  bottom = new Plane();
  handle: Mesh;

  constructor(public height: number, public controller: ScrollerController) {
    super();
    controller.scroller = this;
    this.add(controller.child);
    this.clippingPlanes = [this.bottom, this.top];
    this.handle = new Mesh(handleGeometry, handleMaterial);
    this.add(this.handle);
    createDraggable(this.handle, {
      onDrag: (context) => {
        this.onHandleDrag(context);
      },
    });
  }

  tick() {
    this.updatePlanes();
    this.updateHandle();
  }

  updatePlanes() {
    const top = this.getWorldPosition(new Vector3());
    const bottom = this.localToWorld(new Vector3(0, -this.height, 0));
    const normal = top.clone().sub(bottom).normalize();
    this.bottom.setFromNormalAndCoplanarPoint(normal, bottom);
    normal.negate();
    this.top.setFromNormalAndCoplanarPoint(normal, top);
  }

  getScrollOffset() {
    return this.controller.child.position.y;
  }

  setScrollOffset(position: number) {
    if (position === this.getScrollOffset()) {
      return;
    }
    this.controller.child.position.y = position;
    this.dispatchEvent({ type: "scrolled", position });
  }

  scrollPositionIntoView(position: number) {
    this.scrollRangeIntoView(position, position);
  }

  scrollRangeIntoView(from: number, to: number) {
    if (from > to) {
      this.scrollRangeIntoView(to, from);
      return;
    }
    if (from - to > this.height) {
      this.scrollRangeIntoView(from, from + this.height);
      return;
    }
    const offset = this.getScrollOffset();
    if (from < offset) {
      this.setScrollOffset(from);
      return;
    }
    if (to > offset + this.height) {
      this.setScrollOffset(to - this.height);
      return;
    }
  }

  getHandleHeight(contentHeight: number) {
    return (this.height / contentHeight) * this.height;
  }

  getMaxScrollOffset(contentHeight: number) {
    return contentHeight - this.height;
  }

  getScrollOffsetToHandlePositionFactor(contentHeight: number) {
    return (
      (this.height - this.getHandleHeight(contentHeight)) /
      -this.getMaxScrollOffset(contentHeight)
    );
  }

  updateHandle() {
    const contentHeight = this.controller.getHeight();
    const visible = contentHeight > this.height;
    this.handle.visible = visible;
    if (!visible) {
      this.setScrollOffset(0);
      return;
    }

    const xOffset =
      this.controller.getHandleXOffset() + handleGeometry.parameters.radiusTop;
    this.handle.position.x = xOffset;
    const handleHeight = this.getHandleHeight(contentHeight);
    this.handle.scale.y = handleHeight;
    this.handle.position.y =
      this.getScrollOffset() *
        this.getScrollOffsetToHandlePositionFactor(contentHeight) -
      handleHeight / 2;
  }

  onHandleDrag({ localOffsetIn }: DragContext) {
    const offset = localOffsetIn(this).y;
    const contentHeight = this.controller.getHeight();
    const handleHeight = this.getHandleHeight(contentHeight);
    const newHandlePosition =
      this.handle.position.y + handleHeight / 2 + offset;
    const newScrollOffset =
      newHandlePosition /
      this.getScrollOffsetToHandlePositionFactor(contentHeight);
    this.setScrollOffset(
      clamp(newScrollOffset, 0, this.getMaxScrollOffset(contentHeight))
    );
    // TODO: update context distance
  }
}

export class ScrollerMovableController extends MovableController<Scroller> {
  getOffset(): Vector3 {
    return new Vector3(0, this.child.height, 0);
  }
}
