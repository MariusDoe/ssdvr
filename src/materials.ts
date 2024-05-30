import { Material, MeshBasicMaterial } from "three";

const materials: Record<string, Material> = {};

export const materialFromColor = (color: string) =>
  (materials[color] ??= new MeshBasicMaterial({
    color: color,
  }));
