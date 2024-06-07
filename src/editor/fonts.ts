import { Font, FontLoader } from "three/examples/jsm/Addons.js";
import consolasBoldItalicUrl from "../../fonts/Consolas_Bold Italic.json?url";
import consolasBoldUrl from "../../fonts/Consolas_Bold.json?url";
import consolasItalicUrl from "../../fonts/Consolas_Italic.json?url";
import consolasUrl from "../../fonts/Consolas_Regular.json?url";

const fontLoader = new FontLoader();

export const fonts = await Promise.all(
  [consolasUrl, consolasBoldUrl, consolasItalicUrl, consolasBoldItalicUrl].map(
    (url) => fontLoader.loadAsync(url)
  )
);

export const fontFromFlags = (bold: boolean, italic: boolean) =>
  fonts[(+italic << 1) | +bold];

export const fontFromStyle = (style: CSSStyleDeclaration) =>
  fontFromFlags(parseInt(style.fontWeight) > 400, style.fontStyle === "italic");

export const measure = (font: Font, size = 1) => {
  const { data } = font;
  const scale = size / data.resolution;
  const lineHeight =
    (data.boundingBox.yMax - data.boundingBox.yMin + data.underlineThickness) *
    scale;
  const glyphAdvance = data.glyphs["x"].ha * scale;
  return { lineHeight, glyphAdvance };
};

const fontCharacterCache = new Map<Font, Map<string, BufferGeometry>>();

const getCharacterCache = (font: Font) => {
  if (!fontCharacterCache.has(font)) {
    fontCharacterCache.set(font, new Map());
  }
  return fontCharacterCache.get(font)!;
};

export const getCharacterGeometry = (font: Font, character: string) => {
  const cache = getCharacterCache(font);
  if (cache.has(character)) {
    return cache.get(character)!;
  }
  const shapes = font.generateShapes(character, 1);
  for (const shape of shapes) {
    // fixup shapes so triangulation doesn't break for weird holes arrays
    if (shape.holes.length === 1 && shape.holes[0].curves.length === 0) {
      shape.holes = [];
    }
  }
  const geometry = new ShapeGeometry(shapes);
  cache.set(character, geometry);
  return geometry;
};

export const getCharacterMesh = (
  font: Font,
  character: string,
  material: Material,
  size = 1
) => {
  const geometry = getCharacterGeometry(font, character);
  const mesh = new Mesh(geometry, material);
  mesh.scale.setScalar(size);
  return mesh;
};
