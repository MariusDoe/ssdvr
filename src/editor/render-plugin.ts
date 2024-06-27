import { SelectionRange } from "@codemirror/state";
import {
  EditorView,
  PluginValue,
  ViewPlugin,
  ViewUpdate,
} from "@codemirror/view";
import {
  Color,
  Material,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Object3DEventMap,
  PlaneGeometry,
  Vector3,
} from "three";
import { Font } from "three/examples/jsm/Addons.js";
import { clamp } from "three/src/math/MathUtils.js";
import {
  InteractionContext,
  IntersectionMode,
  onController,
} from "../interaction";
import { MovableController } from "../movable-controller";
import { ScrollerController } from "../scroller-controller";
import { Editor } from "./editor";
import {
  CharacterMesh,
  fontFromStyle,
  fonts,
  getCharacterMesh,
  measure,
} from "./fonts";
import {
  backgroundMaterialFromStyles,
  foregroundMaterialFromStyle,
} from "./materials";

interface Options {
  size: number;
}

const planeGeometry = new PlaneGeometry();

interface RenderPluginEventMap extends Object3DEventMap {
  mainSelectionChanged: {
    selection: SelectionRange;
  };
}

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
  widthUpdate = false;
  linesToUpdate = new Set<Line>();
  styleUpdates = new Set<Node>();

  static zOrder = 0.001;

  constructor(public view: EditorView, public options: Options) {
    super();
    const { lineHeight, glyphAdvance } = measure(fonts[0], this.options.size);
    this.lineHeight = lineHeight;
    this.glyphAdvance = glyphAdvance;
    onController("select", this, "recurse", (context) => {
      this.onClick(context);
    });
    this.focus();
    this.updateWidth();
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

  height() {
    return this.view.state.doc.lines * this.lineHeight;
  }

  update(update: ViewUpdate) {
    console.log("requestMeasure");
    this.view.requestMeasure({
      read: () => {
        console.log("measure");
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
    const lineNumber = Math.round(-position.y / this.lineHeight);
    const line = this.view.state.doc.line(
      clamp(lineNumber + 1, 1, this.view.state.doc.lines)
    );
    return Math.min(line.from + column, line.to);
  }

  updateWidth() {
    const width =
      Math.max(
        0,
        ...[...this.view.contentDOM.querySelectorAll(`.cm-line`)].map(
          (line) => line.textContent?.length ?? 0
        )
      ) * this.glyphAdvance;
    if (width === this.width) {
      return;
    }
    this.width = width;
    for (const line of this.lineMap.values()) {
      line.updateWidth();
    }
  }

  scheduleMutations(mutations: MutationRecord[]) {
    console.log("scheduling mutations", mutations);
    this.scheduledMutations.push(...mutations);
  }

  handleMutations(mutations: MutationRecord[]) {
    for (const mutation of mutations) {
      this.handleMutation(mutation);
    }
    this.runUpdates();
  }

  handleMutation(mutation: MutationRecord) {
    console.log("handling mutation", mutation);
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
    console.log("adding span", node.textContent);
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
    console.log("adding line", element.textContent);
    const line = new Line(element, this);
    this.add(line);
    this.lineMap.set(element, line);
    this.updateLinePositions = true;
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
    console.log("removing span", textSpan.node.textContent);
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
    console.log("removing line", line.element.textContent);
    line.removeFromParent();
    for (const child of line.children) {
      if (child instanceof TextSpan) {
        this.removeTextSpan(child);
      }
    }
    this.lineMap.delete(element);
    this.linesToUpdate.delete(line);
    this.updateLinePositions = true;
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
    if (this.widthUpdate) {
      this.updateWidth();
      this.widthUpdate = false;
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

class Line extends Object3D {
  background: Mesh;

  constructor(public element: Element, public plugin: RenderPlugin) {
    super();
    const { lineHeight } = this.plugin;
    this.background = new Mesh(planeGeometry);
    this.background.scale.y = lineHeight;
    this.background.position.y = lineHeight / 4;
    this.background.position.z = -2 * RenderPlugin.zOrder;
    this.add(this.background);
    this.updatePosition();
    this.updateWidth();
    this.updateMaterial();
  }

  updatePosition() {
    console.log("moving line", this.element.textContent);
    const pos = this.plugin.view.posAtDOM(this.element);
    this.position.y = this.plugin.posToLocalPosition(pos).y;
  }

  updateWidth() {
    const { width } = this.plugin;
    this.background.scale.x = width;
    this.background.position.x = width / 2;
  }

  updateMaterial() {
    this.background.material = this.plugin.backgroundMaterialFor(this.element);
  }

  updateTextSpanPositions() {
    for (const child of this.children) {
      if (child instanceof TextSpan) {
        child.updatePosition();
      }
    }
  }
}

class TextSpan extends Object3D {
  characters: CharacterMesh[] = [];
  font!: Font;
  foregroundMaterial!: Material;
  background: Mesh | null = null;

  constructor(public node: Text, public plugin: RenderPlugin) {
    super();
    this.updatePosition();
    this.updateMaterial();
  }

  updatePosition() {
    console.log("moving span", this.node.textContent);
    const pos = this.plugin.view.posAtDOM(this.node);
    this.position.x = this.plugin.posToLocalPosition(pos).x;
  }

  updateText() {
    const text = this.node.textContent ?? "";
    console.log("updating span", text);
    const unused = this.characters.slice();
    if (text.length !== unused.length) {
      this.plugin.widthUpdate = true;
    }
    for (let i = 0; i < text.length; i++) {
      const character = text[i];
      const index = unused.findIndex((mesh) => mesh.character === character);
      let mesh: CharacterMesh;
      if (index >= 0) {
        [mesh] = unused.splice(index, 1);
      } else {
        mesh = getCharacterMesh(
          this.font,
          character,
          this.foregroundMaterial,
          this.plugin.options.size
        );
        this.add(mesh);
        this.characters.push(mesh);
      }
      mesh.position.x = i * this.plugin.glyphAdvance;
    }
    for (const character of unused) {
      this.remove(character);
    }
    this.characters = this.characters.filter(
      (character) => !unused.includes(character)
    );
    this.updateBackgroundWidth();
  }

  updateMaterial() {
    this.updateForegroundMaterial();
    this.updateBackgroundMaterial();
  }

  updateForegroundMaterial() {
    const style = this.plugin.styleFor(this.node.parentElement!);
    const material = foregroundMaterialFromStyle(style);
    const font = fontFromStyle(style);
    if (font !== this.font) {
      this.font = font;
      this.foregroundMaterial = material;
      this.clear();
      this.updateText();
    } else if (material !== this.foregroundMaterial) {
      this.foregroundMaterial = material;
      for (const child of this.characters) {
        child.material = material;
      }
    }
  }

  updateBackgroundMaterial() {
    if (!this.parent) {
      return;
    }
    let material: Material | null = this.plugin.backgroundMaterialFor(
      this.node.parentElement!
    );
    if (material == (this.parent as Line).background.material) {
      material = null;
    }
    if (material) {
      if (this.background) {
        this.background.material = material;
      } else {
        this.background = new Mesh(planeGeometry, material);
        const { lineHeight } = this.plugin;
        this.background.scale.y = lineHeight;
        this.background.position.y = lineHeight / 4;
        this.background.position.z = -RenderPlugin.zOrder;
        this.add(this.background);
        this.updateBackgroundWidth();
      }
    } else {
      if (this.background) {
        this.remove(this.background);
        this.background = null;
      }
    }
  }

  updateBackgroundWidth() {
    if (!this.background) {
      return;
    }
    const width = this.characters.length * this.plugin.glyphAdvance;
    this.background.scale.x = width;
    this.background.position.x = width / 2;
  }
}

class SelectionSpan extends Mesh {
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
    this.position.y = (5 / 4 - line) * lineHeight;
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
    return new Vector3(0, this.child.height(), 0);
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
  }

  getHandleXOffset(): number {
    return this.child.width;
  }

  getHeight(): number {
    return this.child.height();
  }

  mainSelectionChanged(selection: SelectionRange) {
    const from = -this.child.posToLocalPosition(selection.head).y;
    const to = from + this.child.lineHeight;
    this.scroller.scrollRangeIntoView(from, to);
  }

  scrolled(position: number) {
    this.child.scrollLocalPositionIntoView(new Vector3(0, -position, 0));
  }
}
