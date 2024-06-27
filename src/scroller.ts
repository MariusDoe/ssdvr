import { Plane, Vector3 } from "three";
import { ClippingGroup } from "./clipping-group";
import { MovableController } from "./movable-controller";
import { TickContext } from "./tick";

export class Scroller extends ClippingGroup {
  top = new Plane();
  bottom = new Plane();

  constructor(public height: number) {
    super();
    this.clippingPlanes = [this.bottom, this.top];
  }

  tick({ delta }: TickContext) {
    const bottom = this.getWorldPosition(new Vector3());
    const top = this.localToWorld(new Vector3(0, this.height, 0));
    const normal = top.clone().sub(bottom).normalize();
    this.bottom.setFromNormalAndCoplanarPoint(normal, bottom);
    normal.negate();
    this.top.setFromNormalAndCoplanarPoint(normal, top);
    for (const child of this.children) {
      child.position.y += 0.01 * delta;
    }
  }
}

export class ScrollerMovableController extends MovableController<Scroller> {
  getOffset(): Vector3 {
    return new Vector3(0, this.child.height, 0);
  }
}
