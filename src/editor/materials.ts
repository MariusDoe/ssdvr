import * as THREE from "three";
import { materialFromColor } from "../materials";

export const foregroundMaterialFromStyle = (style: CSSStyleDeclaration) =>
  materialFromColor(style.color);

const colorAlpha = (color: string) => {
  const match = color.match(/rgba\([^,]+,[^,],[^,],\s(\S+)\)/);
  if (match) {
    return parseFloat(match[1]);
  } else {
    return 1;
  }
};

export const backgroundMaterialFromStyles = (styles: CSSStyleDeclaration[]) =>
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
