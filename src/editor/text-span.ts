import { Material, Mesh, Object3D } from "three";
import { Font } from "three/examples/jsm/Addons.js";
import { TextMesh, fontFromStyle, getTextMesh } from "./fonts";
import { Line } from "./line";
import { foregroundMaterialFromStyle } from "./materials";
import { RenderPlugin, debug, planeGeometry } from "./render-plugin";

export class TextSpan extends Object3D {
  font!: Font;
  foregroundMaterial!: Material;
  background: Mesh | null = null;
  lastTextLength = -1;
  mesh?: TextMesh;

  constructor(public node: Text, public plugin: RenderPlugin) {
    super();
    this.updatePosition();
    this.updateMaterial();
  }

  updatePosition() {
    if (debug) console.log("moving span", this.node.textContent);
    const pos = this.plugin.view.posAtDOM(this.node);
    this.position.x = this.plugin.posToLocalPosition(pos).x;
  }

  updateText() {
    const text = this.node.textContent ?? "";
    if (debug) console.log("updating span", text);
    if (text.length !== this.lastTextLength) {
      this.widthChanged();
    }
    this.lastTextLength = text.length;
    this.mesh?.removeFromParent();
    this.mesh = getTextMesh(
      this.font,
      text,
      this.foregroundMaterial,
      this.plugin.options.size
    );
    this.mesh.position.y = -this.plugin.lineHeight * (3 / 4);
    this.add(this.mesh);
  }

  widthChanged() {
    this.plugin.sizeUpdate = true;
  }

  updateMaterial() {
    this.updateForegroundMaterial();
    this.updateBackgroundMaterial();
  }

  updateForegroundMaterial() {
    const style = this.plugin.styleFor(this.node.parentElement!);
    const material = foregroundMaterialFromStyle(style);
    const font = fontFromStyle(style);
    if (!this.mesh || font !== this.font) {
      this.font = font;
      this.foregroundMaterial = material;
      this.clear();
      this.updateText();
    } else if (material !== this.foregroundMaterial) {
      this.foregroundMaterial = material;
      this.mesh.material = material;
    }
  }

  updateBackgroundMaterial() {
    if (!this.parent) {
      return;
    }
    let material: Material | null = this.plugin.backgroundMaterialFor(
      this.node.parentElement!
    );
    if (material == (this.parent as Line).background.material) {
      material = null;
    }
    if (material) {
      if (this.background) {
        this.background.material = material;
      } else {
        this.background = new Mesh(planeGeometry, material);
        const { lineHeight } = this.plugin;
        this.background.scale.y = lineHeight;
        this.background.position.y = -lineHeight / 2;
        this.background.position.z = -RenderPlugin.zOrder;
        this.add(this.background);
        this.updateBackgroundWidth();
      }
    } else {
      if (this.background) {
        this.remove(this.background);
        this.background = null;
      }
    }
  }

  updateBackgroundWidth() {
    if (!this.background) {
      return;
    }
    const width = this.lastTextLength * this.plugin.glyphAdvance;
    this.background.scale.x = width;
    this.background.position.x = width / 2;
  }
}
