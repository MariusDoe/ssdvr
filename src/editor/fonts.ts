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
