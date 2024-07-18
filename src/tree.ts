import {
  Material,
  Mesh,
  Object3D,
  Object3DEventMap,
  PlaneGeometry,
  Vector3,
} from "three";
import { Font } from "three/examples/jsm/Addons.js";
import { getTextMesh, measure } from "./editor/fonts";
import { onController } from "./interaction";
import { MovableController } from "./movable-controller";
import { ScrollerController } from "./scroller-controller";

export type TreeOptions = {
  size: number;
  indent: number;
  font: Font;
  backgroundMaterial: Material;
  foregroundMaterial: Material;
};

interface TreeEventMap extends Object3DEventMap {
  click: {};
}

export class Tree extends Object3D<TreeEventMap> {
  parentTree?: Tree;
  entry: TreeEntry;
  childTrees: Tree[] = [];
  width: number;
  height: number;
  options: TreeOptions;

  constructor(content: string, options: TreeOptions) {
    super();
    this.options = options;
    this.entry = new TreeEntry(content, options);
    onController("select", this.entry.background, "single", () => {
      this.click();
    });
    this.width = this.entry.width;
    this.height = this.entry.height;
    this.add(this.entry);
  }

  clearTrees() {
    for (const tree of this.childTrees) {
      tree.removeFromParent();
    }
    this.childTrees = [];
    this.updateLayout();
  }

  addTrees(...trees: Tree[]) {
    this.childTrees.push(...trees);
    this.add(...trees);
    for (const tree of trees) {
      tree.parentTree = this;
    }
    this.updateLayout();
  }

  updateLayout() {
    this.width = this.entry.width;
    this.height = this.entry.height;
    for (const tree of this.childTrees) {
      tree.position.x = this.options.indent;
      tree.position.y = -this.height;
      this.width = Math.max(this.width, this.options.indent + tree.width);
      this.height += tree.height;
    }
    this.parentTree?.updateLayout();
  }

  click() {
    this.dispatchEvent({ type: "click" });
  }
}

export class TreeMovableController extends MovableController<Tree> {
  getOffset(): Vector3 {
    return new Vector3(0, this.child.height, 0);
  }
}

export class TreeScrollerController extends ScrollerController<Tree> {
  getHeight(): number {
    return this.child.height;
  }

  getHandleXOffset(): number {
    return this.child.width;
  }
}

export class TreeEntry extends Object3D {
  width: number;
  height: number;
  background: Mesh;

  constructor(content: string, options: TreeOptions) {
    super();
    const { lineHeight, glyphAdvance } = measure(options.font, options.size);
    this.height = lineHeight;
    this.width = content.length * glyphAdvance;
    this.background = new Mesh(
      new PlaneGeometry(this.width, lineHeight),
      options.backgroundMaterial
    );
    this.background.position.set(this.width / 2, -lineHeight / 2, -0.001);
    this.add(this.background);
    const mesh = getTextMesh(content, {
      font: options.font,
      material: options.foregroundMaterial,
      size: options.size,
    });
    mesh.position.y = -lineHeight * (3 / 4);
    this.add(mesh);
  }
}
