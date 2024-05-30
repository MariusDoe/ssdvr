import { EditorView, ViewPlugin } from "@codemirror/view";
import {
  BufferGeometry,
  Color,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  ShapeGeometry,
} from "three";
import { Font } from "three/examples/jsm/Addons.js";
import { scene } from "../scene";
import { fontFromStyle, fonts, measure } from "./fonts";
import {
  backgroundMaterialFromStyles,
  foregroundMaterialFromStyle,
} from "./materials";

interface Options {
  size: number;
  x: number;
  y: number;
  z: number;
}

class RenderPlugin {
  view: EditorView;
  options: Options;
  meshes: Mesh[] = [];
  // font constants
  lineHeight: number;
  glyphAdvance: number;
  // draw state
  width = 0;
  x = 0;
  y = 0;
  parentStyles: CSSStyleDeclaration[] = [];

  fontCharacterCache = new Map<Font, Map<string, BufferGeometry>>();

  static zOrder = 0.001;
  static selectionMaterial = new MeshBasicMaterial({
    color: new Color(0, 0.5, 1),
    transparent: true,
    opacity: 0.5,
  });

  constructor(view: EditorView, options: Options) {
    this.view = view;
    this.options = options;
    const { lineHeight, glyphAdvance } = measure(fonts[0], this.options.size);
    this.lineHeight = lineHeight;
    this.glyphAdvance = glyphAdvance;
    this.requestRedraw();
  }

  update() {
    this.requestRedraw();
  }

  requestRedraw() {
    this.view.requestMeasure({
      read: () => {
        this.redraw();
      },
    });
  }

  removeMeshes() {
    scene.remove(...this.meshes);
    this.meshes.splice(0);
  }

  addMesh(mesh: Mesh) {
    scene.add(mesh);
    this.meshes.push(mesh);
  }

  redraw() {
    this.removeMeshes();
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
    this.x = this.options.x;
    this.y = this.options.y;
    this.parentStyles = [];
    for (const line of lines) {
      this.traverseElement(line, true);
      this.x = this.options.x;
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

  getCharacterCache(font: Font) {
    if (!this.fontCharacterCache.has(font)) {
      this.fontCharacterCache.set(font, new Map());
    }
    return this.fontCharacterCache.get(font)!;
  }

  getCharacterGeometry(font: Font, character: string) {
    const cache = this.getCharacterCache(font);
    if (cache.has(character)) {
      return cache.get(character)!;
    }
    const shapes = font.generateShapes(character, this.options.size);
    for (const shape of shapes) {
      // fixup shapes so triangulation doesn't break for weird holes arrays
      if (shape.holes.length === 1 && shape.holes[0].curves.length === 0) {
        shape.holes = [];
      }
    }
    const geometry = new ShapeGeometry(shapes);
    cache.set(character, geometry);
    return geometry;
  }

  drawText(text: string, style: CSSStyleDeclaration) {
    const font = fontFromStyle(style);
    const material = foregroundMaterialFromStyle(style);
    for (let i = 0; i < text.length; i++) {
      const geometry = this.getCharacterGeometry(font, text[i]);
      const mesh = new Mesh(geometry, material);
      mesh.position.set(this.x, this.y, this.options.z);
      this.addMesh(mesh);
      this.x += this.glyphAdvance;
    }
  }

  drawLineBackground() {
    const geometry = new PlaneGeometry(this.width, this.lineHeight);
    geometry.translate(
      this.options.x + this.width / 2,
      this.y + this.lineHeight / 4,
      this.options.z - 1 * RenderPlugin.zOrder
    );
    const mesh = new Mesh(
      geometry,
      backgroundMaterialFromStyles(this.parentStyles)
    );
    this.addMesh(mesh);
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
      this.options.x + from * this.glyphAdvance + width / 2,
      this.options.y - (line - 1) * this.lineHeight + this.lineHeight / 4,
      this.options.z + 1 * RenderPlugin.zOrder
    );
    const mesh = new Mesh(geometry, RenderPlugin.selectionMaterial);
    this.addMesh(mesh);
  }
}

export const renderPlugin = (options: Options) =>
  ViewPlugin.define((view) => new RenderPlugin(view, options));
