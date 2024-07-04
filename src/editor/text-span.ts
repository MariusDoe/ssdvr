import { Material, Mesh, Object3D } from "three";
import { Font } from "three/examples/jsm/Addons.js";
import { CharacterMesh, fontFromStyle, getCharacterMesh } from "./fonts";
import { Line } from "./line";
import { foregroundMaterialFromStyle } from "./materials";
import { RenderPlugin, debug, planeGeometry } from "./render-plugin";

export class TextSpan extends Object3D {
  characters: CharacterMesh[] = [];
  font!: Font;
  foregroundMaterial!: Material;
  background: Mesh | null = null;

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
    const unused = this.characters.slice();
    if (text.length !== unused.length) {
      this.plugin.sizeUpdate = true;
    }
    for (let i = 0; i < text.length; i++) {
      const character = text[i];
      const index = unused.findIndex((mesh) => mesh.character === character);
      let mesh: CharacterMesh;
      if (index >= 0) {
        [mesh] = unused.splice(index, 1);
      } else {
        mesh = getCharacterMesh(
          this.font,
          character,
          this.foregroundMaterial,
          this.plugin.options.size
        );
        this.add(mesh);
        this.characters.push(mesh);
        mesh.position.y = -this.plugin.lineHeight * (3 / 4);
      }
      mesh.position.x = i * this.plugin.glyphAdvance;
    }
    for (const character of unused) {
      this.remove(character);
    }
    this.characters = this.characters.filter(
      (character) => !unused.includes(character)
    );
    this.updateBackgroundWidth();
  }

  updateMaterial() {
    this.updateForegroundMaterial();
    this.updateBackgroundMaterial();
  }

  updateForegroundMaterial() {
    const style = this.plugin.styleFor(this.node.parentElement!);
    const material = foregroundMaterialFromStyle(style);
    const font = fontFromStyle(style);
    if (font !== this.font) {
      this.font = font;
      this.foregroundMaterial = material;
      this.clear();
      this.updateText();
    } else if (material !== this.foregroundMaterial) {
      this.foregroundMaterial = material;
      for (const child of this.characters) {
        child.material = material;
      }
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
    const width = this.characters.length * this.plugin.glyphAdvance;
    this.background.scale.x = width;
    this.background.position.x = width / 2;
  }
}
