import { EditorView, ViewPlugin } from "@codemirror/view";
import * as THREE from "three";
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
  meshes: THREE.Mesh[] = [];
  // font constants
  lineHeight: number;
  glyphAdvance: number;
  // draw state
  width = 0;
  x = 0;
  y = 0;
  parentStyles: CSSStyleDeclaration[] = [];

  static zOrder = 0.00001;
  static selectionMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0, 0.5, 1),
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

  addMesh(mesh: THREE.Mesh) {
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

  drawText(text: string, style: CSSStyleDeclaration) {
    const font = fontFromStyle(style);
    const shapes = font.generateShapes(text, this.options.size);
    for (const shape of shapes) {
      // fixup shapes so triangulation doesn't break for weird holes arrays
      if (shape.holes.length === 1 && shape.holes[0].curves.length === 0) {
        shape.holes = [];
      }
    }
    const geometry = new THREE.ShapeGeometry(shapes);
    geometry.translate(this.x, this.y, this.options.z);
    const material = foregroundMaterialFromStyle(style);
    const mesh = new THREE.Mesh(geometry, material);
    this.addMesh(mesh);
    this.x += text.length * this.glyphAdvance;
  }

  drawLineBackground() {
    const geometry = new THREE.PlaneGeometry(this.width, this.lineHeight);
    geometry.translate(
      this.options.x + this.width / 2,
      this.y + this.lineHeight / 4,
      this.options.z - 1 * RenderPlugin.zOrder
    );
    const mesh = new THREE.Mesh(
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
    const geometry = new THREE.PlaneGeometry(width, this.lineHeight);
    geometry.translate(
      this.options.x + from * this.glyphAdvance + width / 2,
      this.options.y - (line - 1) * this.lineHeight + this.lineHeight / 4,
      this.options.z + 1 * RenderPlugin.zOrder
    );
    const mesh = new THREE.Mesh(geometry, RenderPlugin.selectionMaterial);
    this.addMesh(mesh);
  }
}

export const renderPlugin = (options: Options) =>
  ViewPlugin.define((view) => new RenderPlugin(view, options));
