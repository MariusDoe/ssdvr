import { EditorView, ViewPlugin } from "@codemirror/view";
import { Color, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry } from "three";
import { InteractionContext, onController } from "../interaction";
import { fontFromStyle, fonts, getCharacterMesh, measure } from "./fonts";
import {
  backgroundMaterialFromStyles,
  foregroundMaterialFromStyle,
} from "./materials";

interface Options {
  size: number;
}

class RenderPlugin extends Object3D {
  view: EditorView;
  options: Options;
  // font constants
  lineHeight: number;
  glyphAdvance: number;
  // draw state
  width = 0;
  x = 0;
  y = 0;
  parentStyles: CSSStyleDeclaration[] = [];

  static zOrder = 0.001;
  static selectionMaterial = new MeshBasicMaterial({
    color: new Color(0, 0.5, 1),
    transparent: true,
    opacity: 0.5,
  });

  constructor(view: EditorView, options: Options) {
    super();
    this.view = view;
    this.options = options;
    const { lineHeight, glyphAdvance } = measure(fonts[0], this.options.size);
    this.lineHeight = lineHeight;
    this.glyphAdvance = glyphAdvance;
    this.requestRedraw();
    onController(
      "select",
      { mode: "object", object: this, recurse: true },
      (context: InteractionContext<"object", "select">) => {
        this.onClick(context);
      }
    );
    this.focus();
  }

  update() {
    this.requestRedraw();
  }

  onClick(context: InteractionContext<"object", "select">) {
    this.focus();
    const localPosition = this.worldToLocal(context.intersection.point.clone());
    const column = Math.round(localPosition.x / this.glyphAdvance);
    const lineNumber = Math.round(-localPosition.y / this.lineHeight);
    const line = this.view.state.doc.line(lineNumber + 1);
    const pos = Math.min(line.from + column, line.to);
    this.view.dispatch({
      selection: {
        anchor: pos,
      },
    });
  }

  focus() {
    this.view.contentDOM.focus();
  }

  requestRedraw() {
    this.view.requestMeasure({
      read: () => {
        this.redraw();
      },
    });
  }

  redraw() {
    this.remove(...this.children);
    this.draw();
  }

  draw() {
    this.drawLines();
    this.drawSelections();
  }

  drawLines() {
    const dom = this.view.contentDOM;
    const lines = dom.querySelectorAll(".cm-line");
    this.width =
      Math.max(
        0,
        ...Array.from(lines).map((line) => (line.textContent ?? "").length)
      ) * this.glyphAdvance;
    this.x = 0;
    this.y = 0;
    this.parentStyles = [];
    for (const line of lines) {
      this.traverseElement(line, true);
      this.x = 0;
      this.y -= this.lineHeight;
    }
  }

  traverseElement(element: Element, isLine = false) {
    const style = getComputedStyle(element);
    this.parentStyles.push(style);
    if (isLine) {
      this.drawLineBackground();
    }
    for (const child of element.childNodes) {
      this.traverseNode(child, style);
    }
    this.parentStyles.pop();
  }

  traverseNode(node: Node, style: CSSStyleDeclaration) {
    if (node instanceof Element) {
      this.traverseElement(node);
      return;
    }
    const { textContent } = node;
    if (textContent === null) {
      return;
    }
    this.drawText(textContent, style);
  }

  drawText(text: string, style: CSSStyleDeclaration) {
    const font = fontFromStyle(style);
    const material = foregroundMaterialFromStyle(style);
    for (let i = 0; i < text.length; i++) {
      const mesh = getCharacterMesh(font, text[i], material, this.options.size);
      mesh.position.set(this.x, this.y, 0);
      this.add(mesh);
      this.x += this.glyphAdvance;
    }
  }

  drawLineBackground() {
    const geometry = new PlaneGeometry(this.width, this.lineHeight);
    geometry.translate(
      this.width / 2,
      this.y + this.lineHeight / 4,
      -RenderPlugin.zOrder
    );
    const mesh = new Mesh(
      geometry,
      backgroundMaterialFromStyles(this.parentStyles)
    );
    this.add(mesh);
  }

  drawSelections() {
    const { doc, selection } = this.view.state;
    for (const range of selection.ranges) {
      const fromLine = doc.lineAt(range.from);
      const toLine = doc.lineAt(range.to);
      for (let line = fromLine.number; line <= toLine.number; line++) {
        const from = line === fromLine.number ? range.from - fromLine.from : 0;
        const to =
          line === toLine.number
            ? range.to - toLine.from
            : doc.line(line).length;
        this.drawSelection(line, from, to);
      }
    }
  }

  drawSelection(line: number, from: number, to: number) {
    const width = (to === from ? 0.1 : to - from) * this.glyphAdvance;
    const geometry = new PlaneGeometry(width, this.lineHeight);
    geometry.translate(
      from * this.glyphAdvance + width / 2,
      (5 / 4 - line) * this.lineHeight,
      RenderPlugin.zOrder
    );
    const mesh = new Mesh(geometry, RenderPlugin.selectionMaterial);
    this.add(mesh);
  }
}

export const renderPlugin = (options: Options, parent: Object3D) =>
  ViewPlugin.define((view) => {
    const plugin = new RenderPlugin(view, options);
    parent.add(plugin);
    return plugin;
  });
