import {
  Color,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  SphereGeometry,
} from "three";
import { preserve } from "./hmr/preserve";
import { openInMovable } from "./movable";
import { scene } from "./scene";
import { TickContext } from "./tick";

class SolarSystem extends Object3D {
  constructor() {
    super();
    const sun = new Body();
    this.add(sun);
    for (let i = 0; i < 3; i++) {
      sun.add(new Planet(i + 1));
    }
  }
}

class Body extends Mesh {
  constructor() {
    super(
      new SphereGeometry(),
      new MeshBasicMaterial({
        color: new Color(1, 0, 0),
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
  openInMovable(solarSystem).position.set(0, 0, -5);
  (window as any).solarSystem = solarSystem;
  (window as any).scene = scene;
  return solarSystem;
});
