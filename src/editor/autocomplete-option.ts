import { Line } from "./line";

export class AutocompleteOption extends Line {
  updatePosition() {
    const index = [...this.element.parentElement!.children].indexOf(
      this.element
    );
    this.position.y = -index * this.plugin.lineHeight;
  }

  get autocomplete() {
    return this.plugin.autocompleteController?.child;
  }

  getWidth() {
    return this.autocomplete?.width ?? 0;
  }

  persistentParent() {
    return this.autocomplete;
  }
}
