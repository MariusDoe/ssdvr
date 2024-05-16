import * as THREE from "three";
import { preserve } from "./hmr/preserve";
import { scene } from "./scene";
import { TickContext } from "./tick";

class SolarSystem extends THREE.Object3D {
  constructor() {
    super();
    const sun = new Body();
    this.add(sun);
    for (let i = 0; i < 3; i++) {
      sun.add(new Planet(i + 1));
    }
  }
}

class Body extends THREE.Mesh {
  constructor() {
    super(
      new THREE.SphereGeometry(),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(1, 0, 0),
      })
    );
  }
}

class Planet extends Body {
  angle = 0;

  constructor(private index: number) {
    super();
  }

  get distance() {
    return this.index * 1.9;
  }

  get speed() {
    return Math.pow(this.index, 1.1);
  }

  get size() {
    return 1 / (this.index + 1);
  }

  tick({ delta }: TickContext): void {
    this.angle += this.speed * delta;
    this.position.setFromSphericalCoords(this.distance, this.angle, 0);
    this.position.set(this.position.z, this.position.y, 0);
    this.scale.setScalar(this.size);
  }
}

preserve("solarSystem", () => {
  const solarSystem = new SolarSystem();
  solarSystem.position.set(0, 0, -5);
  scene.add(solarSystem);
  (window as any).solarSystem = solarSystem;
  (window as any).scene = scene;
  return solarSystem;
});
