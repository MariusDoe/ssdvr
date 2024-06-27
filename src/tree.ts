import {
  Material,
  Mesh,
  Object3D,
  Object3DEventMap,
  PlaneGeometry,
  Vector3,
} from "three";
import { Font } from "three/examples/jsm/Addons.js";
import { getCharacterMesh, measure } from "./editor/fonts";
import { onController } from "./interaction";
import { MovableController } from "./movable-controller";

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
  height: number;
  options: TreeOptions;

  constructor(content: string, options: TreeOptions) {
    super();
    this.options = options;
    this.entry = new TreeEntry(content, options);
    onController("select", this.entry.background, "single", () => {
      this.click();
    });
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
    this.height = this.entry.height;
    for (const tree of this.childTrees) {
      tree.position.x = this.options.indent;
      tree.position.y = -this.height;
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

export class TreeEntry extends Object3D {
  height: number;
  background: Mesh;

  constructor(content: string, options: TreeOptions) {
    super();
    const { lineHeight, glyphAdvance } = measure(options.font, options.size);
    this.height = lineHeight;
    const width = content.length * glyphAdvance;
    this.background = new Mesh(
      new PlaneGeometry(width, lineHeight),
      options.backgroundMaterial
    );
    this.background.position.set(width / 2, -lineHeight / 2, -0.001);
    this.add(this.background);
    for (let i = 0; i < content.length; i++) {
      const mesh = getCharacterMesh(
        options.font,
        content[i],
        options.foregroundMaterial,
        options.size
      );
      mesh.position.x = i * glyphAdvance;
      mesh.position.y = -lineHeight * (3 / 4);
      this.add(mesh);
    }
  }
}
