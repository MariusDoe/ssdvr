import { Material, MeshBasicMaterial } from "three";
import { preserveOnce } from "./hmr/preserve";

const materials = preserveOnce(
  "materials",
  () => ({} as Record<string, Material>)
);

export const materialFromColor = (color: string) =>
  (materials[color] ??= new MeshBasicMaterial({
    color: color,
  }));
