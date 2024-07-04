import { SelectionRange } from "@codemirror/state";
import {
  EditorView,
  PluginValue,
  ViewPlugin,
  ViewUpdate,
} from "@codemirror/view";
import {
  Mesh,
  Object3D,
  Object3DEventMap,
  PlaneGeometry,
  Vector3,
} from "three";
import { clamp } from "three/src/math/MathUtils.js";
import { ClippingGroup } from "../clipping-group";
import {
  InteractionContext,
  IntersectionMode,
  onController,
} from "../interaction";
import { MovableController } from "../movable-controller";
import { ScrollerController } from "../scroller-controller";
import { Editor } from "./editor";
import { fonts, measure } from "./fonts";
import { Line } from "./line";
import { backgroundMaterialFromStyles } from "./materials";
import { SelectionSpan } from "./selection-span";
import { TextSpan } from "./text-span";

interface Options {
  size: number;
}

export const planeGeometry = new PlaneGeometry();

interface RenderPluginEventMap extends Object3DEventMap {
  mainSelectionChanged: {
    selection: SelectionRange;
  };
}

export const debug = false;

export class RenderPlugin
  extends Object3D<RenderPluginEventMap>
  implements PluginValue
{
  // font constants
  lineHeight: number;
  glyphAdvance: number;
  lineMap = new Map<Element, Line>();
  textSpanMap = new Map<Text, TextSpan>();
  styleCache = new Map<Element, CSSStyleDeclaration>();
  selectionSpans: SelectionSpan[] = [];
  width = 0;
  mutationObserver: MutationObserver;
  // pending updates
  scheduledMutations: MutationRecord[] = [];
  updateLinePositions = false;
  sizeUpdate = false;
  linesToUpdate = new Set<Line>();
  styleUpdates = new Set<Node>();
  interactionMesh: Mesh;

  static zOrder = 0.001;

  constructor(public view: EditorView, public options: Options) {
    super();
    const { lineHeight, glyphAdvance } = measure(fonts[0], this.options.size);
    this.lineHeight = lineHeight;
    this.glyphAdvance = glyphAdvance;
    this.interactionMesh = new Mesh(planeGeometry);
    this.interactionMesh.visible = false;
    this.add(this.interactionMesh);
    onController("select", this.interactionMesh, "single", (context) => {
      this.onClick(context);
    });
    this.focus();
    this.updateSize();
    this.addNodesBelow(this.view.contentDOM);
    this.runUpdates();
    this.mutationObserver = new MutationObserver((mutations) => {
      this.scheduleMutations(mutations);
    });
    this.mutationObserver.observe(this.view.contentDOM, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["class"],
    });
  }

  getHeight() {
    return this.view.state.doc.lines * this.lineHeight;
  }

  update(update: ViewUpdate) {
    if (debug) console.log("requestMeasure");
    this.view.requestMeasure({
      read: () => {
        if (debug) console.log("measure");
        this.handleMutations(this.scheduledMutations);
        this.scheduledMutations = [];
      },
    });
    if (update.selectionSet) {
      this.updateSelections();
      this.dispatchEvent({
        type: "mainSelectionChanged",
        selection: this.view.state.selection.main,
      });
    }
  }

  scrollWorldPositionIntoView(position: Vector3) {
    this.scrollPosIntoView(this.worldPositionToPos(position));
  }

  scrollLocalPositionIntoView(position: Vector3) {
    this.scrollPosIntoView(this.localPositionToPos(position));
  }

  scrollLineIntoView(line: number) {
    this.scrollPosIntoView(this.view.state.doc.line(line).from);
  }

  scrollPosIntoView(pos: number) {
    requestAnimationFrame(() => {
      this.view.dispatch({
        effects: [
          EditorView.scrollIntoView(pos, {
            y: "center",
          }),
        ],
      });
    });
  }

  posToLocalPosition(pos: number) {
    const line = this.view.state.doc.lineAt(pos);
    const column = pos - line.from;
    return new Vector3(
      column * this.glyphAdvance,
      -(line.number - 1) * this.lineHeight,
      0
    );
  }

  worldPositionToPos(position: Vector3) {
    return this.localPositionToPos(this.worldToLocal(position.clone()));
  }

  localPositionToPos(position: Vector3) {
    const column = Math.round(position.x / this.glyphAdvance);
    const lineNumber = Math.round(-position.y / this.lineHeight - 1 / 2);
    const line = this.view.state.doc.line(
      clamp(lineNumber + 1, 1, this.view.state.doc.lines)
    );
    return Math.min(line.from + column, line.to);
  }

  updateVisibility(clippingGroup: ClippingGroup) {
    for (const line of this.lineMap.values()) {
      line.updateVisibility(clippingGroup);
    }
  }

  getWidth() {
    let width = 0;
    for (const line of this.view.state.doc.iterLines()) {
      width = Math.max(width, line.length);
    }
    return width * this.glyphAdvance;
  }

  updateSize() {
    const width = this.getWidth();
    const height = this.getHeight();
    this.interactionMesh.scale.set(width, height, 1);
    this.interactionMesh.position.set(width / 2, -height / 2, 0);
    if (width === this.width) {
      return;
    }
    this.width = width;
    for (const line of this.lineMap.values()) {
      line.updateWidth();
    }
  }

  scheduleMutations(mutations: MutationRecord[]) {
    if (debug) console.log("scheduling mutations", mutations);
    this.scheduledMutations.push(...mutations);
  }

  handleMutations(mutations: MutationRecord[]) {
    for (const mutation of mutations) {
      this.handleMutation(mutation);
    }
    this.runUpdates();
  }

  handleMutation(mutation: MutationRecord) {
    if (debug) console.log("handling mutation", mutation);
    switch (mutation.type) {
      case "attributes":
        this.updateStyle(mutation.target);
        break;
      case "childList":
        for (const node of mutation.addedNodes) {
          this.addNodesBelow(node);
        }
        for (const node of mutation.removedNodes) {
          this.removeNodesBelow(node);
        }
        break;
      case "characterData":
        this.updateText(mutation.target);
        break;
    }
  }

  updateStyle(root: Node) {
    if (!(root instanceof Element)) {
      return;
    }
    this.styleCache.set(root, getComputedStyle(root));
    traverse(root, (node) => {
      if (
        node.parentElement === root ||
        (node instanceof Element && node.classList.contains("cm-line"))
      ) {
        this.styleUpdates.add(node);
      }
    });
  }

  addNodesBelow(root: Node) {
    if (!root.isConnected) {
      return;
    }
    traverse(root, (node) => {
      this.addNode(node);
    });
  }

  addNode(node: Node) {
    if (node instanceof Text) {
      this.addText(node);
    } else if (node instanceof Element && node.classList.contains("cm-line")) {
      this.addLine(node);
    }
  }

  addText(node: Text) {
    if (this.textSpanMap.has(node)) {
      return;
    }
    const lineNode = node.parentElement!.closest(".cm-line");
    if (!lineNode) {
      return;
    }
    if (debug) console.log("adding span", node.textContent);
    const textSpan = new TextSpan(node, this);
    this.textSpanMap.set(node, textSpan);

    this.addNode(lineNode);
    const line = this.lineMap.get(lineNode)!;
    line.add(textSpan);
    textSpan.updateBackgroundMaterial();
    this.linesToUpdate.add(line);
  }

  addLine(element: Element) {
    if (this.lineMap.has(element)) {
      return;
    }
    if (debug) console.log("adding line", element.textContent);
    const line = new Line(element, this);
    this.lineMap.set(element, line);
    this.updateLinePositions = true;
    this.sizeUpdate = true;
  }

  removeNodesBelow(root: Node) {
    traverse(root, (node) => {
      this.removeNode(node);
    });
  }

  removeNode(node: Node) {
    if (node instanceof Text) {
      this.removeText(node);
    } else if (
      node instanceof HTMLElement &&
      node.classList.contains("cm-line")
    ) {
      this.removeLine(node);
    }
  }

  removeText(node: Text) {
    const textSpan = this.textSpanMap.get(node);
    if (!textSpan) {
      return;
    }
    this.removeTextSpan(textSpan);
  }

  removeTextSpan(textSpan: TextSpan) {
    if (debug) console.log("removing span", textSpan.node.textContent);
    if (textSpan.parent) {
      this.linesToUpdate.add(textSpan.parent as Line);
    }
    textSpan.removeFromParent();
    this.textSpanMap.delete(textSpan.node);
  }

  removeLine(element: Element) {
    const line = this.lineMap.get(element);
    if (!line) {
      return;
    }
    if (debug) console.log("removing line", line.element.textContent);
    line.removeFromParent();
    for (const child of line.children) {
      if (child instanceof TextSpan) {
        this.removeTextSpan(child);
      }
    }
    this.lineMap.delete(element);
    this.linesToUpdate.delete(line);
    this.updateLinePositions = true;
    this.sizeUpdate = true;
  }

  updateText(node: Node) {
    if (!(node instanceof Text)) {
      return;
    }
    const textSpan = this.textSpanMap.get(node);
    if (!textSpan) {
      return;
    }
    textSpan.updateText();
    this.linesToUpdate.add(textSpan.parent as Line);
  }

  runUpdates() {
    if (this.updateLinePositions) {
      for (const line of this.lineMap.values()) {
        line.updatePosition();
      }
      this.updateLinePositions = false;
    }
    for (const line of this.linesToUpdate) {
      line.updateTextSpanPositions();
    }
    this.linesToUpdate.clear();
    for (const node of this.styleUpdates) {
      this.textSpanMap.get(node as Text)?.updateMaterial();
      this.lineMap.get(node as Element)?.updateMaterial();
    }
    this.styleUpdates.clear();
    if (this.sizeUpdate) {
      this.updateSize();
      this.sizeUpdate = false;
    }
  }

  onClick(context: InteractionContext<IntersectionMode, "select">) {
    this.focus();
    const pos = this.worldPositionToPos(context.intersection.point);
    this.view.dispatch({
      selection: {
        anchor: pos,
      },
    });
  }

  focus() {
    this.view.contentDOM.focus();
  }

  updateSelections() {
    const { doc, selection } = this.view.state;
    let index = 0;
    for (const range of selection.ranges) {
      const fromLine = doc.lineAt(range.from);
      const toLine = doc.lineAt(range.to);
      for (let line = fromLine.number; line <= toLine.number; line++) {
        const from = line === fromLine.number ? range.from - fromLine.from : 0;
        const to =
          line === toLine.number
            ? range.to - toLine.from
            : doc.line(line).length;
        this.selectionSpan(index).updatePosition(line, from, to);
        index++;
      }
    }
    for (let i = index; i < this.selectionSpans.length; i++) {
      this.selectionSpans[i].removeFromParent();
    }
    this.selectionSpans.length = index;
  }

  selectionSpan(index: number) {
    if (index < this.selectionSpans.length) {
      return this.selectionSpans[index];
    }
    const selection = new SelectionSpan(this);
    this.selectionSpans.push(selection);
    this.add(selection);
    return selection;
  }

  styleFor(element: Element) {
    const cached = this.styleCache.get(element);
    if (cached) {
      return cached;
    }
    const style = getComputedStyle(element);
    this.styleCache.set(element, style);
    return style;
  }

  *ancestorsOf(element: Element) {
    let current = element;
    const root = this.view.contentDOM;
    while (current !== root) {
      yield current;
      current = current.parentElement!;
    }
  }

  backgroundMaterialFor(element: Element) {
    const parentStyles = [...this.ancestorsOf(element)].map((parent) =>
      this.styleFor(parent)
    );
    return backgroundMaterialFromStyles(parentStyles);
  }
}

const traverse = (node: Node, callback: (node: Node) => void) => {
  const queue = [node];
  for (let i = 0; i < queue.length; i++) {
    const descendant = queue[i];
    callback(descendant);
    queue.push(...descendant.childNodes);
  }
};

export const renderPlugin = (options: Options, parent: Editor) =>
  ViewPlugin.define((view) => {
    const plugin = new RenderPlugin(view, options);
    parent.renderPlugin = plugin;
    parent.add(plugin);
    return plugin;
  });

export class RenderPluginMovableController extends MovableController<RenderPlugin> {
  getOffset(): Vector3 {
    return new Vector3(0, this.child.getHeight(), 0);
  }
}

export class RenderPluginScrollerController extends ScrollerController<RenderPlugin> {
  onScrollerSet() {
    super.onScrollerSet();
    this.child.addEventListener("mainSelectionChanged", ({ selection }) => {
      this.mainSelectionChanged(selection);
    });
    this.scroller.addEventListener("scrolled", ({ position }) => {
      this.scrolled(position);
    });
    this.child.updateVisibility(this.scroller);
  }

  getHandleXOffset(): number {
    return this.child.width;
  }

  getHeight(): number {
    return this.child.getHeight();
  }

  mainSelectionChanged(selection: SelectionRange) {
    const from = -this.child.posToLocalPosition(selection.head).y;
    const to = from + this.child.lineHeight;
    this.scroller.scrollRangeIntoView(from, to);
  }

  scrolled(position: number) {
    this.child.scrollLocalPositionIntoView(new Vector3(0, -position, 0));
    this.child.updateVisibility(this.scroller);
  }
}
