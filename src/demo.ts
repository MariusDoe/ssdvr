import {
  Color,
  Material,
  Mesh,
  MeshPhysicalMaterial,
  Object3D,
  PointLight,
  SphereGeometry,
} from "three";
import { TickContext } from "./tick";

export class SolarSystem extends Object3D {
  constructor() {
    super();
    const sun = new Sun();
    this.add(sun);
    for (let i = 0; i < 3; i++) {
      sun.add(new Planet(i + 1));
    }
  }
}

const sphereGeometry = new SphereGeometry();

class Body extends Mesh {
  constructor(material: Material) {
    super(sphereGeometry, material);
  }
}

class Sun extends Body {
  constructor() {
    const material = new MeshPhysicalMaterial({
      emissive: new Color(0.8, 1, 0.5),
    });
    super(material);
    this.add(new PointLight(material.color, 10));
  }
}

class Planet extends Body {
  angle = 0;

  constructor(private index: number) {
    super(
      new MeshPhysicalMaterial({
        color: new Color(Math.random(), Math.random(), Math.random()),
      })
    );
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
