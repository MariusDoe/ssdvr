import { Color, Mesh, MeshBasicMaterial } from "three";
import { RenderPlugin, planeGeometry } from "./render-plugin";

export class SelectionSpan extends Mesh {
  static material = new MeshBasicMaterial({
    color: new Color(0, 0.5, 1),
    transparent: true,
    opacity: 0.5,
  });

  constructor(public plugin: RenderPlugin) {
    super(planeGeometry, SelectionSpan.material);
    this.scale.y = this.plugin.lineHeight;
    this.position.z = RenderPlugin.zOrder;
  }

  updatePosition(line: number, from: number, to: number) {
    const { glyphAdvance, lineHeight } = this.plugin;
    const width = (to === from ? 0.1 : to - from) * glyphAdvance;
    this.scale.x = width;
    this.position.x = from * glyphAdvance + width / 2;
    this.position.y = (-(line - 1) - 1 / 2) * lineHeight;
  }
}
