import { Mesh, Object3D, Vector3 } from "three";
import { ClippingGroup, getContainingClippingGroup } from "../clipping-group";
import { RenderPlugin, debug, planeGeometry } from "./render-plugin";
import { TextSpan } from "./text-span";

export class Line extends Object3D {
  background: Mesh;

  constructor(public element: Element, public plugin: RenderPlugin) {
    super();
    const { lineHeight } = this.plugin;
    this.background = new Mesh(planeGeometry);
    this.background.scale.y = lineHeight;
    this.background.position.y = -lineHeight / 2;
    this.background.position.z = -2 * RenderPlugin.zOrder;
    this.add(this.background);
    this.updatePosition();
    this.updateWidth();
    this.updateMaterial();
    this.plugin.add(this);
    const clippingGroup = getContainingClippingGroup(this);
    if (clippingGroup) {
      this.updateVisibility(clippingGroup);
    }
  }

  isVisible(clippingGroup: ClippingGroup) {
    const { lineHeight, width } = this.plugin;
    const worldPosition = this.plugin.localToWorld(this.position.clone());
    const positions = [
      worldPosition,
      worldPosition.clone().add(new Vector3(width, 0, 0)),
      worldPosition.clone().add(new Vector3(0, -lineHeight, 0)),
      worldPosition.clone().add(new Vector3(width, -lineHeight, 0)),
    ];
    return positions.some((position) => !clippingGroup.isClipped(position));
  }

  updateVisibility(clippingGroup: ClippingGroup) {
    if (this.isVisible(clippingGroup)) {
      if (!this.parent) {
        this.plugin.add(this);
        if (debug) console.log("showing line", this.element.textContent);
      }
    } else {
      if (this.parent) {
        this.removeFromParent();
        if (debug) console.log("hiding line", this.element.textContent);
      }
    }
  }

  updatePosition() {
    if (debug) console.log("moving line", this.element.textContent);
    const pos = this.plugin.view.posAtDOM(this.element);
    this.position.y = this.plugin.posToLocalPosition(pos).y;
  }

  getWidth() {
    return this.plugin.width;
  }

  updateWidth() {
    const width = this.getWidth();
    this.background.scale.x = width;
    this.background.position.x = width / 2;
  }

  updateMaterial() {
    this.background.material = this.plugin.backgroundMaterialFor(this.element);
  }

  updateTextSpanPositions() {
    for (const child of this.children) {
      if (child instanceof TextSpan) {
        child.updatePosition();
      }
    }
  }
}
