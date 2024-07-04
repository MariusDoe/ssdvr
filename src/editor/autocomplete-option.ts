import { Autocomplete } from "./autocomplete";
import { Line } from "./line";

export class AutocompleteOption extends Line {
  updateVisibility() {
    // do nothing
  }

  updatePosition() {
    const index = [...this.element.parentElement!.children].indexOf(
      this.element
    );
    this.position.y = -index * this.plugin.lineHeight;
  }

  get autocomplete() {
    return this.parent as Autocomplete | null;
  }

  getWidth() {
    return this.autocomplete?.width ?? 0;
  }
}
