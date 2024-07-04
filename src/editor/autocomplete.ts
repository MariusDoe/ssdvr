import { Object3D } from "three";
import { AutocompleteOption } from "./autocomplete-option";
import { RenderPlugin } from "./render-plugin";

export class Autocomplete extends Object3D {
  width = 0;

  constructor(public element: Element, public plugin: RenderPlugin) {
    super();
    this.position.z = 3 * RenderPlugin.zOrder;
  }

  updateWidth() {
    this.width = 0;
    for (const child of this.children) {
      if (child instanceof AutocompleteOption) {
        this.width = Math.max(
          this.width,
          (child.element.textContent?.length ?? 0) * this.plugin.glyphAdvance
        );
      }
    }
  }

  updatePosition() {
    const mainCursor = this.plugin.view.state.selection.main.head;
    const position = this.plugin.posToLocalPosition(mainCursor);
    this.position.x = position.x;
    this.position.y = position.y - this.plugin.lineHeight;
  }
}
