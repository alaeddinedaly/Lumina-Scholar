"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

interface HeroSceneProps {
  scrollProgressRef: React.MutableRefObject<number>;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Node (Points) shaders
// ─────────────────────────────────────────────────────────────────────────────
const NODE_VERT = `
  uniform float uTime;
  uniform float uMorphT;
  attribute float aIndex;

  void main() {
    vec3 p = position;

    // Per-node breathing — only in sphere phase, dies as we morph to helix
    float breathAmp = 0.07 * (1.0 - uMorphT);
    float wave = sin(uTime * 0.75 + aIndex * 0.42) * breathAmp;
    p += normalize(p) * wave;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);

    // Perspective point sizing
    gl_PointSize = 3.2 * (500.0 / -mv.z);
    gl_Position  = projectionMatrix * mv;
  }
`;

const NODE_FRAG = `
  uniform float uOpacity;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d  = length(uv) * 2.0;

    float core = 1.0 - smoothstep(0.0,  0.30, d);
    float glow = 1.0 - smoothstep(0.30, 1.00, d);

    float alpha = (core * 0.92 + glow * 0.14) * uOpacity;
    if (alpha < 0.005) discard;

    vec3 col = mix(vec3(0.55, 0.58, 0.62), vec3(1.0), core);
    gl_FragColor = vec4(col, alpha);
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
//  Edge (LineSegments) shaders
// ─────────────────────────────────────────────────────────────────────────────
const EDGE_VERT = `
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const EDGE_FRAG = `
  uniform float uOpacity;
  void main() {
    gl_FragColor = vec4(0.72, 0.74, 0.78, 0.11 * uOpacity);
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
//  Geometry helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Fibonacci sphere — evenly distributed points on a sphere */
function fibSphere(n: number, r: number): Float32Array {
  const pos = new Float32Array(n * 3);
  const phi = Math.PI * (3 - Math.sqrt(5)); // golden angle
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const rad = Math.sqrt(Math.max(0, 1 - y * y));
    const θ = phi * i;
    pos[i * 3] = r * rad * Math.cos(θ);
    pos[i * 3 + 1] = r * y;
    pos[i * 3 + 2] = r * rad * Math.sin(θ);
  }
  return pos;
}

/** Double helix — two interlocked spirals */
function doubleHelix(
  n: number,
  r: number,
  height: number,
  turns: number
): Float32Array {
  const pos = new Float32Array(n * 3);
  const half = Math.floor(n / 2);
  for (let i = 0; i < half; i++) {
    const t = i / (half - 1);
    const a = t * turns * Math.PI * 2;
    pos[i * 3] = r * Math.cos(a);
    pos[i * 3 + 1] = (t - 0.5) * height;
    pos[i * 3 + 2] = r * Math.sin(a);
  }
  for (let i = 0; i < n - half; i++) {
    const t = i / Math.max(1, n - half - 1);
    const a = t * turns * Math.PI * 2 + Math.PI; // offset by π → second strand
    const idx = half + i;
    pos[idx * 3] = r * Math.cos(a);
    pos[idx * 3 + 1] = (t - 0.5) * height;
    pos[idx * 3 + 2] = r * Math.sin(a);
  }
  return pos;
}

/** K-nearest-neighbour edge pairs (based on sphere layout) */
function knnEdges(pos: Float32Array, n: number, k: number): number[] {
  const vecs = Array.from({ length: n }, (_, i) =>
    new THREE.Vector3(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2])
  );
  const seen = new Set<string>();
  const edges: number[] = [];

  for (let i = 0; i < n; i++) {
    const sorted = Array.from({ length: n }, (_, j) => j)
      .filter(j => j !== i)
      .sort((a, b) => vecs[i].distanceTo(vecs[a]) - vecs[i].distanceTo(vecs[b]));

    for (let m = 0; m < k; m++) {
      const j = sorted[m];
      const key = i < j ? `${i}:${j}` : `${j}:${i}`;
      if (!seen.has(key)) {
        seen.add(key);
        edges.push(i, j);
      }
    }
  }
  return edges;
}

/** Add cross-links between the two helix strands at regular intervals */
function helixCrossLinks(n: number, interval: number): number[] {
  const edges: number[] = [];
  const half = Math.floor(n / 2);
  for (let i = 0; i < half; i += interval) {
    const partner = half + i;
    if (partner < n) edges.push(i, partner);
  }
  return edges;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Smoothstep utility
// ─────────────────────────────────────────────────────────────────────────────
function ss(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// ─────────────────────────────────────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────────────────────────────────────
const N = 140;
const SPHERE_R = 4.0;
const HELIX_R = 2.0;
const HELIX_H = 9.0;
const HELIX_T = 3.5; // turns

export default function HeroScene({ scrollProgressRef }: HeroSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const isMobile = window.innerWidth < 768;
    const scale = isMobile ? 0.78 : 1;
    const W = window.innerWidth;
    const H = window.innerHeight;

    // ── Renderer ──────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 500);
    camera.position.set(0, 0, 19);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(W, H);
    // Dynamic Pixel Ratio: Cap at 1 on mobile to prevent drastic framerate drops
    renderer.setPixelRatio(isMobile ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);

    // ── Configurations ────────────────────────────────────────────────────────
    const spherePos = fibSphere(N, SPHERE_R * scale);
    const helixPos = doubleHelix(N, HELIX_R * scale, HELIX_H * scale, HELIX_T);
    const curPos = new Float32Array(N * 3);

    // ── Edge topology (fixed) ─────────────────────────────────────────────────
    const edgeIdx = [
      ...knnEdges(spherePos, N, 4),
      ...helixCrossLinks(N, 6),
    ];
    const numEdges = edgeIdx.length / 2;
    const edgePosArr = new Float32Array(numEdges * 6); // 2 verts × 3 floats

    // ── Node geometry ─────────────────────────────────────────────────────────
    const nodeGeo = new THREE.BufferGeometry();
    const indexAttr = new Float32Array(N);
    for (let i = 0; i < N; i++) indexAttr[i] = i;
    nodeGeo.setAttribute("position", new THREE.BufferAttribute(curPos, 3));
    nodeGeo.setAttribute("aIndex", new THREE.BufferAttribute(indexAttr, 1));

    const nodeMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMorphT: { value: 0 },
        uOpacity: { value: 0 },
      },
      vertexShader: NODE_VERT,
      fragmentShader: NODE_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const nodes = new THREE.Points(nodeGeo, nodeMat);

    // ── Edge geometry ─────────────────────────────────────────────────────────
    const edgeGeo = new THREE.BufferGeometry();
    const edgeAttr = new THREE.BufferAttribute(edgePosArr, 3);
    edgeAttr.setUsage(THREE.DynamicDrawUsage);
    edgeGeo.setAttribute("position", edgeAttr);

    const edgeMat = new THREE.ShaderMaterial({
      uniforms: { uOpacity: { value: 0 } },
      vertexShader: EDGE_VERT,
      fragmentShader: EDGE_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const edges = new THREE.LineSegments(edgeGeo, edgeMat);

    // ── Group (so we rotate together) ─────────────────────────────────────────
    const group = new THREE.Group();
    group.add(edges, nodes);
    // Offset to right half on desktop
    group.position.x = isMobile ? 0 : 4.8;
    scene.add(group);

    // ── Mouse ─────────────────────────────────────────────────────────────────
    const mouseNDC = new THREE.Vector2();
    const mouseSmooth = new THREE.Vector2();
    const isTouch = "ontouchstart" in window;

    const onMove = (e: MouseEvent) => {
      mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    if (!isTouch) window.addEventListener("mousemove", onMove);

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    // ── Animate ───────────────────────────────────────────────────────────────
    const clock = new THREE.Clock();
    let frameId: number;
    let introT = 0;
    let morphTSmooth = 0;
    let rotY = 0;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      const scroll = scrollProgressRef.current; // hero-local 0→1

      // ── Viewport Culling ────────────────────────────────────────────────────
      // If the scroll progress goes past the fade threshold (0.85), halt all computations and WebGL rendering
      if (scroll > 0.85) {
        return; 
      }

      // Intro fade
      introT = Math.min(1, introT + 0.006);
      const iEase = introT * introT * (3 - 2 * introT);

      // Mouse smoothing
      mouseSmooth.lerp(mouseNDC, 0.04);

      // Morph target from scroll
      const morphTarget = ss(0.08, 0.72, scroll);
      morphTSmooth += (morphTarget - morphTSmooth) * 0.035;

      // ── Lerp node positions between sphere ↔ helix ──────────────────────────
      const mt = morphTSmooth;
      const mt1 = 1 - mt;
      for (let i = 0; i < N; i++) {
        curPos[i * 3] = spherePos[i * 3] * mt1 + helixPos[i * 3] * mt;
        curPos[i * 3 + 1] = spherePos[i * 3 + 1] * mt1 + helixPos[i * 3 + 1] * mt;
        curPos[i * 3 + 2] = spherePos[i * 3 + 2] * mt1 + helixPos[i * 3 + 2] * mt;
      }
      nodeGeo.attributes.position.needsUpdate = true;

      // ── Update edge positions to follow nodes ────────────────────────────────
      for (let e = 0; e < numEdges; e++) {
        const i = edgeIdx[e * 2];
        const j = edgeIdx[e * 2 + 1];
        edgePosArr[e * 6] = curPos[i * 3];
        edgePosArr[e * 6 + 1] = curPos[i * 3 + 1];
        edgePosArr[e * 6 + 2] = curPos[i * 3 + 2];
        edgePosArr[e * 6 + 3] = curPos[j * 3];
        edgePosArr[e * 6 + 4] = curPos[j * 3 + 1];
        edgePosArr[e * 6 + 5] = curPos[j * 3 + 2];
      }
      edgeGeo.attributes.position.needsUpdate = true;

      // ── Rotation ─────────────────────────────────────────────────────────────
      // Base spin + scroll accelerates it + mouse tilts
      rotY += (0.08 + scroll * 0.12) * 0.016;
      group.rotation.y = rotY + mouseSmooth.x * 0.28;
      group.rotation.x = mouseSmooth.y * -0.22;

      // ── Opacity & uniforms ───────────────────────────────────────────────────
      // Canvas-level fade driven directly in rAF — no React re-render lag
      const canvasFade = Math.max(0, 1 - ss(0.38, 0.82, scroll));
      renderer.domElement.style.opacity = String(canvasFade);

      const op = iEase;
      nodeMat.uniforms.uTime.value = elapsed;
      nodeMat.uniforms.uMorphT.value = morphTSmooth;
      nodeMat.uniforms.uOpacity.value = op;
      edgeMat.uniforms.uOpacity.value = op * (0.65 + mt * 0.45);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(frameId);
      if (!isTouch) window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", onResize);
      if (mountRef.current?.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      nodeGeo.dispose(); nodeMat.dispose();
      edgeGeo.dispose(); edgeMat.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={mountRef} className="absolute inset-0 pointer-events-none" />;
}