import {
  BufferGeometry,
  Material,
  Mesh,
  Shape,
  ShapeGeometry,
  Vector3,
} from "three";
import { Font, FontLoader } from "three/examples/jsm/Addons.js";
import consolasBoldItalicUrl from "../../fonts/Consolas_Bold Italic.json?url";
import consolasBoldUrl from "../../fonts/Consolas_Bold.json?url";
import consolasItalicUrl from "../../fonts/Consolas_Italic.json?url";
import consolasUrl from "../../fonts/Consolas_Regular.json?url";
import { preserveOnce } from "../hmr/preserve";
import { materialFromColor } from "../materials";

const fontLoader = new FontLoader();

export const fonts = await preserveOnce("fonts", () =>
  Promise.all(
    [
      consolasUrl,
      consolasBoldUrl,
      consolasItalicUrl,
      consolasBoldItalicUrl,
    ].map((url) => fontLoader.loadAsync(url))
  )
);

export const fontFromFlags = ({
  bold,
  italic,
}: {
  bold: boolean;
  italic: boolean;
}) => fonts[(+italic << 1) | +bold];

export const defaultFont = fontFromFlags({ bold: false, italic: false });

export const fontFromStyle = (style: CSSStyleDeclaration) =>
  fontFromFlags({
    bold: parseInt(style.fontWeight) > 400,
    italic: style.fontStyle === "italic",
  });

export const measure = (font: Font, size = 1) => {
  const { data } = font;
  const scale = size / data.resolution;
  const lineHeight =
    (data.boundingBox.yMax - data.boundingBox.yMin + data.underlineThickness) *
    scale;
  const glyphAdvance = data.glyphs["x"].ha * scale;
  return { lineHeight, glyphAdvance };
};

const fontCharacterCache = preserveOnce(
  "fontCharacterCache",
  () => new Map<Font, Map<string, BufferGeometry>>()
);

const getTextCache = (font: Font) => {
  if (!fontCharacterCache.has(font)) {
    fontCharacterCache.set(font, new Map());
  }
  return fontCharacterCache.get(font)!;
};

export const getTextGeometry = (font: Font, text: string) => {
  const cache = getTextCache(font);
  if (cache.has(text)) {
    return cache.get(text)!;
  }
  let shapes: Shape[];
  try {
    shapes = font.generateShapes(text, 1);
    for (const shape of shapes) {
      // fixup shapes so triangulation doesn't break for weird holes arrays
      if (shape.holes.length === 1 && shape.holes[0].curves.length === 0) {
        shape.holes = [];
      }
    }
  } catch (e) {
    console.warn(
      "could not create a geometry for text",
      text,
      "in font",
      font,
      "- error:"
    );
    console.error(e);
    shapes = [];
  }
  const geometry = new ShapeGeometry(shapes, 3);
  cache.set(text, geometry);
  return geometry;
};

export const defaultMaterial = materialFromColor("white");

export const defaultSize = 1;

export const getTextMesh = (
  text: string,
  options?: {
    font?: Font;
    material?: Material;
    size?: number;
  }
) => {
  const { font, material, size } = {
    font: defaultFont,
    material: defaultMaterial,
    size: defaultSize,
    ...options,
  };
  const geometry = getTextGeometry(font, text);
  const mesh = new TextMesh(font, text, geometry, material);
  mesh.scale.setScalar(size);
  return mesh;
};

export class TextMesh extends Mesh {
  constructor(
    public font: Font,
    public text: string,
    geometry: BufferGeometry,
    material: Material
  ) {
    super(geometry, material);
  }

  centerHorizontally() {
    this.geometry.computeBoundingBox();
    this.position.x -=
      (this.geometry.boundingBox!.getSize(new Vector3()).x * this.scale.x) / 2;
  }
}
