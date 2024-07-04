import { TextSpan } from "./text-span";

export class AutocompleteTextSpan extends TextSpan {
  updatePosition() {
    // do nothing
  }

  widthChanged() {
    this.plugin.autocompleteUpdate = true;
  }
}
