import { Object3D } from "three";
import type { Scroller } from "./scroller";

export abstract class ScrollerController<T extends Object3D = Object3D> {
  private _scroller?: Scroller;

  constructor(public child: T) {}

  get scroller() {
    if (this._scroller === undefined) {
      throw new Error(
        "Tried to access ScrollerController.scroller before onScrollerSet"
      );
    }
    return this._scroller;
  }

  set scroller(newScroller: Scroller) {
    if (this._scroller !== undefined) {
      throw new Error(
        "A ScrollerController should only control a single Scroller"
      );
    }
    this._scroller = newScroller;
    this.onScrollerSet();
  }

  onScrollerSet() {}

  abstract getHeight(): number;

  abstract getHandleXOffset(): number;
}

export const ForwardingScrollerController = <
  T extends Object3D,
  I extends Object3D
>(
  inner: (object: T) => I,
  InnerScrollerController: new (object: I) => ScrollerController<I>
) => {
  return class ForwardingScrollerController extends ScrollerController<T> {
    inner: ScrollerController<I>;

    constructor(child: T) {
      super(child);
      this.inner = new InnerScrollerController(inner(child));
    }

    onScrollerSet(): void {
      super.onScrollerSet();
      this.inner.scroller = this.scroller;
    }

    getHandleXOffset(): number {
      return this.inner.getHandleXOffset();
    }

    getHeight(): number {
      return this.inner.getHeight();
    }
  };
};
