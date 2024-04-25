import html2canvas from "html2canvas";
import {
  CanvasTexture,
  EventListener,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  createCanvasElement,
} from "three";

export class HTMLMesh extends Mesh {
  dispose: VoidFunction;

  constructor(dom: HTMLElement) {
    const texture = new HTMLTexture(dom);

    const geometry = new PlaneGeometry(
      texture.image.width * 0.001,
      texture.image.height * 0.001
    );
    const material = new MeshBasicMaterial({
      map: texture,
      toneMapped: false,
      transparent: true,
    });

    super(geometry, material);

    const onEvent: EventListener<{}, string, this> = (event) => {
      material.map!.dispatchDOMEvent(event);
    };

    this.addEventListener("mousedown", onEvent);
    this.addEventListener("mouseup", onEvent);
    this.addEventListener("click", onEvent);

    this.dispose = function () {
      geometry.dispose();
      material.dispose();

      material.map!.dispose();

      this.removeEventListener("mousedown", onEvent);
      this.removeEventListener("mouseup", onEvent);
      this.removeEventListener("click", onEvent);
    };
  }
}

class HTMLTexture extends CanvasTexture {
  scheduleUpdate?: number;
  observer: MutationObserver;

  constructor(private dom: HTMLElement) {
    super(createCanvasElement());
    html2canvas(dom).then((canvas) => (this.image = canvas));

    this.dom = dom;

    this.anisotropy = 16;
    this.colorSpace = SRGBColorSpace;
    this.minFilter = LinearFilter;
    this.magFilter = LinearFilter;

    // Create an observer on the DOM, and run html2canvas update in the next loop
    const observer = new MutationObserver(() => {
      if (!this.scheduleUpdate) {
        // ideally should use xr.requestAnimationFrame, here setTimeout to avoid passing the renderer
        this.scheduleUpdate = setTimeout(() => this.update(), 16);
      }
    });

    const config = {
      attributes: true,
      childList: true,
      subtree: true,
      characterData: true,
    };
    observer.observe(dom, config);

    this.observer = observer;
  }

  dispatchDOMEvent(event: { type: string; data?: { x: number; y: number } }) {
    if (event.data) {
      htmlevent(this.dom, event.type, event.data.x, event.data.y);
    }
  }

  async update() {
    this.image = await html2canvas(this.dom);
    this.needsUpdate = true;

    this.scheduleUpdate = undefined;
  }

  dispose() {
    if (this.observer) {
      this.observer.disconnect();
    }

    clearTimeout(this.scheduleUpdate);
    this.scheduleUpdate = undefined;

    super.dispose();
  }
}

function htmlevent(element: HTMLElement, event: string, x: number, y: number) {
  const { left, top, width, height } = element.getBoundingClientRect();
  const clientX = x * width + left;
  const clientY = y * height + top;
  const mouseEventInit: MouseEventInit = {
    clientX,
    clientY,
    view: element.ownerDocument.defaultView,
    bubbles: true,
  };

  function traverse(element: Element): Element | null {
    const rect = element.getBoundingClientRect();
    if (
      !(
        clientX > rect.left &&
        clientX < rect.right &&
        clientY > rect.top &&
        clientY < rect.bottom
      )
    ) {
      return null;
    }

    for (const child of element.children) {
      const hit = traverse(child);
      if (hit) {
        return hit;
      }
    }
    return element;
  }

  const hit = traverse(element);
  hit?.dispatchEvent(new MouseEvent(event, mouseEventInit));
}
