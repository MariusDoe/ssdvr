import * as THREE from "three";

const materials: Record<string, THREE.Material> = {};

export const materialFromColor = (color: string) =>
  (materials[color] ??= new THREE.MeshBasicMaterial({
    color: color,
  }));
