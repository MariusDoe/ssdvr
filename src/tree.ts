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
    onController(
      "select",
      { mode: "object", object: this.entry, recurse: true },
      () => {
        this.click();
      }
    );
    this.height = this.entry.height;
    this.add(this.entry);
  }

  getSizeInMovable() {
    return new Vector3(0, this.height - this.entry.height / 2, 0);
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

export class TreeEntry extends Object3D {
  height: number;

  constructor(content: string, options: TreeOptions) {
    super();
    const { lineHeight, glyphAdvance } = measure(options.font, options.size);
    this.height = lineHeight;
    const width = content.length * glyphAdvance;
    const background = new Mesh(
      new PlaneGeometry(width, lineHeight),
      options.backgroundMaterial
    );
    background.position.z = -0.001;
    background.position.x = width / 2;
    this.add(background);
    for (let i = 0; i < content.length; i++) {
      const mesh = getCharacterMesh(
        options.font,
        content[i],
        options.foregroundMaterial,
        options.size
      );
      mesh.position.x = i * glyphAdvance;
      this.add(mesh);
    }
  }
}
