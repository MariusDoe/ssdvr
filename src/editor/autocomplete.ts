import { Object3D } from "three";
import { ScrollerController } from "../scroller-controller";
import { AutocompleteOption } from "./autocomplete-option";
import { RenderPlugin } from "./render-plugin";

export class Autocomplete extends Object3D {
  width = 0;
  height = 0;

  constructor(public element: Element, public plugin: RenderPlugin) {
    super();
    this.position.z = 3 * RenderPlugin.zOrder;
  }

  updateSize() {
    this.width = 0;
    this.height = 0;
    const { glyphAdvance, lineHeight } = this.plugin;
    for (const child of this.children) {
      if (child instanceof AutocompleteOption) {
        this.width = Math.max(
          this.width,
          (child.element.textContent?.length ?? 0) * glyphAdvance
        );
        this.height += lineHeight;
      }
    }
  }
}

export class AutocompleteScrollerController extends ScrollerController<Autocomplete> {
  getHandleXOffset(): number {
    return this.child.width;
  }

  getHeight(): number {
    return this.child.height;
  }

  onScrollerSet(): void {
    super.onScrollerSet();
    this.scroller.addEventListener("scrolled", () => {
      this.scrolled();
    });
  }

  scrolled() {
    for (const option of this.child.plugin.autocompleteOptionMap.values()) {
      option.updateVisibility(this.scroller);
    }
  }

  updatePosition() {
    const { plugin } = this.child;
    const mainCursor = plugin.view.state.selection.main.head;
    const position = plugin.posToLocalPosition(mainCursor);
    this.scroller.position.x = position.x;
    this.scroller.position.y = position.y - plugin.lineHeight;
  }

  optionSelected(option: AutocompleteOption) {
    const from = -option.position.y;
    const to = from + this.child.plugin.lineHeight;
    this.scroller.scrollRangeIntoView(from, to);
  }
}
