import { createNoise3D } from "simplex-noise";
import * as THREE from "three";

// Reusable noise 3D generator
export const noise3D = createNoise3D();

// Linear interpolation
export function lerp(start: number, end: number, t: number) {
  return start * (1 - t) + end * t;
}

// Convert hex to HSL, simplistic mapping used for the two given colors
// #00f2ff -> H: 183, S: 100%, L: 50%
// #7000ff -> H: 266, S: 100%, L: 50%
// Three.js color math:
const startColor = new THREE.Color("#00f2ff");
const endColor = new THREE.Color("#7000ff");
const tempStartHsl = { h: 0, s: 0, l: 0 };
const tempEndHsl = { h: 0, s: 0, l: 0 };
startColor.getHSL(tempStartHsl);
endColor.getHSL(tempEndHsl);

export function lerpColor(t: number): THREE.Color {
  const h = lerp(tempStartHsl.h, tempEndHsl.h, t);
  const s = lerp(tempStartHsl.s, tempEndHsl.s, t);
  const l = lerp(tempStartHsl.l, tempEndHsl.l, t);
  
  const c = new THREE.Color();
  c.setHSL(h, s, l);
  return c;
}

// Simple Spring dynamics state holder
export class SpringVector3 {
  current: THREE.Vector3;
  target: THREE.Vector3;
  velocity: THREE.Vector3;
  stiffness: number;
  damping: number;

  constructor(initial: THREE.Vector3, stiffness = 0.02, damping = 0.88) {
    this.current = initial.clone();
    this.target = initial.clone();
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.stiffness = stiffness;
    this.damping = damping;
  }

  update() {
    // F = -k * x - c * v
    const force = new THREE.Vector3()
      .subVectors(this.target, this.current)
      .multiplyScalar(this.stiffness);
      
    this.velocity.add(force);
    this.velocity.multiplyScalar(this.damping);
    this.current.add(this.velocity);
  }
}
