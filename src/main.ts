import { javascript } from "@codemirror/lang-javascript";
import { ViewPlugin, ViewUpdate } from "@codemirror/view";
import { EditorView, basicSetup } from "codemirror";
import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import {
  FontLoader,
  InteractiveGroup,
  XRControllerModelFactory,
} from "three/examples/jsm/Addons.js";
import consolasBoldItalicUrl from "../fonts/Consolas_Bold Italic.json?url";
import consolasBoldUrl from "../fonts/Consolas_Bold.json?url";
import consolasItalicUrl from "../fonts/Consolas_Italic.json?url";
import consolasUrl from "../fonts/Consolas_Regular.json?url";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  10
);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
});
document.body.appendChild(renderer.domElement);

document.body.appendChild(VRButton.createButton(renderer));

const lineGeometry = new THREE.BufferGeometry();
lineGeometry.setFromPoints([
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0, 0, -5),
]);

const controllerIndices = [0, 1];
const controllers = controllerIndices.map((index) =>
  renderer.xr.getController(index)
);
for (const controller of controllers) {
  controller.add(
    new THREE.Line(
      lineGeometry,
      new THREE.LineBasicMaterial({
        color: "red",
      })
    )
  );
  scene.add(controller);
}

const controllerModelFactory = new XRControllerModelFactory();

const controllerGrips = controllerIndices.map((index) =>
  renderer.xr.getControllerGrip(index)
);
for (const controllerGrip of controllerGrips) {
  controllerGrip.add(
    controllerModelFactory.createControllerModel(controllerGrip)
  );
  scene.add(controllerGrip);
}

const interactiveGroup = new InteractiveGroup();
interactiveGroup.listenToPointerEvents(renderer, camera);
for (const controller of controllers) {
  interactiveGroup.listenToXRControllerEvents(controller);
}
scene.add(interactiveGroup);

const editorContainer = document.body.appendChild(
  document.createElement("div")
);
editorContainer.style.width = "100vw";
editorContainer.style.height = "100vh";
editorContainer.addEventListener("click", (event) => {
  (event.target as HTMLElement | null)?.focus();
});

const fontLoader = new FontLoader();
const fonts = await Promise.all(
  [consolasUrl, consolasBoldUrl, consolasItalicUrl, consolasBoldItalicUrl].map(
    (url) => fontLoader.loadAsync(url)
  )
);
const fontFromFlags = (bold: boolean, italic: boolean) =>
  fonts[(+italic << 1) | +bold];
const fontFromStyle = (style: CSSStyleDeclaration) =>
  fontFromFlags(parseInt(style.fontWeight) > 400, style.fontStyle === "italic");

const materials: Record<string, THREE.Material> = {};
const materialFromColor = (color: string) =>
  (materials[color] ??= new THREE.MeshBasicMaterial({
    color: color,
  }));
const foregroundMaterialFromStyle = (style: CSSStyleDeclaration) =>
  materialFromColor(style.color);
const colorAlpha = (color: string) => {
  const match = color.match(/rgba\([^,]+,[^,],[^,],\s(\S+)\)/);
  if (match) {
    return parseFloat(match[1]);
  } else {
    return 1;
  }
};
const backgroundMaterialFromStyles = (styles: CSSStyleDeclaration[]) =>
  materialFromColor(
    styles
      .map(
        (style) =>
          [
            new THREE.Color(style.backgroundColor),
            colorAlpha(style.backgroundColor),
          ] as const
      )
      .reduce(([a, alpha_a], [b, alpha_b]) => [a.lerp(b, alpha_b), alpha_a])[0]
      .getHexString()
  );

const viewPlugin = ViewPlugin.fromClass(
  class {
    view: EditorView;
    meshes: THREE.Mesh[] = [];

    constructor(view: EditorView) {
      this.view = view;
      this.requestRedraw();
    }

    requestRedraw() {
      this.view.requestMeasure({
        read: () => {
          this.redraw();
        },
      });
    }

    update(update: ViewUpdate) {
      if (update.docChanged) {
        this.requestRedraw();
      }
    }

    redraw() {
      scene.remove(...this.meshes);
      this.meshes.splice(0);
      const dom = this.view.contentDOM;
      const lines = dom.querySelectorAll(".cm-line");
      const size = 0.1;
      const { data } = fonts[0];
      const scale = size / data.resolution;
      const lineHeight =
        (data.boundingBox.yMax -
          data.boundingBox.yMin +
          data.underlineThickness) *
        scale;
      const glyphAdvance = data.glyphs["x"].ha * scale;
      const width =
        Math.max(
          0,
          ...Array.from(lines).map((line) => (line.textContent ?? "").length)
        ) * glyphAdvance;
      const left = -2;
      const top = 2;
      let x = left;
      let y = top;
      const z = -2;
      const traverseNode = (node: Node, style: CSSStyleDeclaration) => {
        if (node instanceof Element) {
          traverseElement(node);
          return;
        }
        const { textContent } = node;
        if (textContent === null) {
          return;
        }
        const font = fontFromStyle(style);
        const shapes = font.generateShapes(textContent, size);
        for (const shape of shapes) {
          // fixup shapes so triangulation doesn't break for weird holes arrays
          if (shape.holes.length === 1 && shape.holes[0].curves.length === 0) {
            shape.holes = [];
          }
        }
        const geometry = new THREE.ShapeGeometry(shapes);
        geometry.translate(x, y, z);
        const material = foregroundMaterialFromStyle(style);
        const mesh = new THREE.Mesh(geometry, material);
        this.meshes.push(mesh);
        x += textContent.length * glyphAdvance;
      };
      const parentStyles: CSSStyleDeclaration[] = [];
      const traverseElement = (element: Element, isLine = false) => {
        const style = getComputedStyle(element);
        parentStyles.push(style);
        if (isLine) {
          const geometry = new THREE.PlaneGeometry(width, lineHeight);
          geometry.translate(left + width / 2, y + lineHeight / 4, z - 0.0001);
          const mesh = new THREE.Mesh(
            geometry,
            backgroundMaterialFromStyles(parentStyles)
          );
          this.meshes.push(mesh);
        }
        for (const child of element.childNodes) {
          traverseNode(child, style);
        }
        parentStyles.pop();
      };
      for (const line of lines) {
        traverseElement(line, true);
        x = left;
        y -= lineHeight;
      }
      scene.add(...this.meshes);
    }
  }
);

const view = new EditorView({
  doc: 'function test() {\n  console.log("Hello World!");\n}',
  parent: document.body,
  extensions: [basicSetup, javascript({ typescript: true }), viewPlugin],
});

const oldRequestAnimationFrame = window.requestAnimationFrame;
const oldCancelAnimationFrame = window.cancelAnimationFrame;
renderer.xr.addEventListener("sessionstart", () => {
  view.contentDOM.focus();
  const session = renderer.xr.getSession()!;
  window.requestAnimationFrame = (...args) =>
    session.requestAnimationFrame(...args);
  window.cancelAnimationFrame = (...args) =>
    session.cancelAnimationFrame(...args);
});
renderer.xr.addEventListener("sessionend", () => {
  window.requestAnimationFrame = oldRequestAnimationFrame;
  window.cancelAnimationFrame = oldCancelAnimationFrame;
});
