import { Object3D, Vector3 } from "three";

export abstract class MovableController<T extends Object3D = Object3D> {
  constructor(public child: T) {}

  abstract getOffset(): Vector3;

  applyOffset() {
    this.child.position.copy(this.getOffset());
  }
}

export class ConstantOffsetMovableController<
  T extends Object3D = Object3D
> extends MovableController<T> {
  constructor(child: T, public offset: Vector3) {
    super(child);
  }

  getOffset(): Vector3 {
    return this.offset;
  }
}

export class ZeroOffsetMovableController<
  T extends Object3D = Object3D
> extends ConstantOffsetMovableController<T> {
  constructor(child: T) {
    super(child, new Vector3());
  }
}

export const ForwardingMovableController = <
  T extends Object3D,
  I extends Object3D
>(
  inner: (object: T) => I,
  InnerMovableController: new (object: I) => MovableController<I>
) => {
  return class ForwardingMovableController extends MovableController<T> {
    inner: MovableController<I>;

    constructor(child: T) {
      super(child);
      this.inner = new InnerMovableController(inner(child));
    }

    getOffset(): Vector3 {
      return this.inner.getOffset();
    }
  };
};
