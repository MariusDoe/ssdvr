import { Color } from "three";
import { materialFromColor } from "../materials";

export const foregroundMaterialFromStyle = (style: CSSStyleDeclaration) =>
  materialFromColor(style.color);

const colorAlpha = (color: string) => {
  const match = color.match(/rgba\([^,]+,[^,]+,[^,]+,\s*(\S+)\s*\)/);
  if (match) {
    return parseFloat(match[1]);
  } else {
    return 1;
  }
};

export const backgroundMaterialFromStyles = (styles: CSSStyleDeclaration[]) =>
  materialFromColor(
    "#" +
      styles
        .map(
          (style) =>
            [
              new Color(style.backgroundColor),
              colorAlpha(style.backgroundColor),
            ] as const
        )
        .reverse()
        .reduce((a, [b, alpha_b]) => a.lerp(b, alpha_b), new Color("white"))
        .getHexString()
  );
