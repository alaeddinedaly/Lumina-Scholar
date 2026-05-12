"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

// ─────────────────────────────────────────────────────────────────────────────
// AuthScene - Floating Cubes
// ─────────────────────────────────────────────────────────────────────────────
export default function AuthScene() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    let frameId: number = 0;
    let renderer: THREE.WebGLRenderer;
    let scene: THREE.Scene;
    let camera: THREE.PerspectiveCamera;
    let cubeGeo: THREE.BoxGeometry;
    let material: THREE.Material;
    let onMove: (e: MouseEvent) => void;
    let onResize: () => void;
    // Observer is hoisted here so the cleanup function can always safely call .disconnect()
    let observer: MutationObserver | null = null;
    
    const isTouch = "ontouchstart" in window;

    // ── Preempt Main Thread Freeze ───────────────────────────────────────────
    // Yield just 10ms to let React finish its DOM mount before we lock the CPU
    // to compile WebGL shaders.
    const initTimer = setTimeout(() => {
      if (!mountRef.current) return;

      const W = window.innerWidth;
      const H = window.innerHeight;

    // ── Setup ────────────────────────────────────────────────────────────────
    scene = new THREE.Scene();

    // Perspective camera
    camera = new THREE.PerspectiveCamera(35, W / H, 0.1, 150);
    camera.position.set(0, 0, 30);

    const isMobile = window.innerWidth < 768;

    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(W, H);
    // Limit pixel ratio for performance on large displays with many transparent objects
    renderer.setPixelRatio(isMobile ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);

    // ── Lighting ─────────────────────────────────────────────────────────────
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);

    const dirLight1 = new THREE.DirectionalLight(0xd9e5ff, 2.5);
    dirLight1.position.set(10, 20, 10);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x705090, 1.5);
    dirLight2.position.set(-10, -20, -10);
    scene.add(dirLight2);

    // ── Geometry & Material ──────────────────────────────────────────────────
    cubeGeo = new THREE.BoxGeometry(1, 1, 1);

    // Auth pages are always dark — cubes are always white/glassy.
    // We no longer check document.documentElement because the .dark class
    // is scoped to the page wrapper, not <html>.
    const CUBE_COLOR = 0xffffff;

    // Premium light/glassy material preserving dual-tone neon reflections
    // Graceful degradation: Use MeshStandardMaterial on mobile (single-pass) over Physical (multi-pass)
    material = isMobile
      ? new THREE.MeshStandardMaterial({
          color: CUBE_COLOR,
          metalness: 0.3,
          roughness: 0.15,
          transparent: true,
          opacity: 0.35, // More opaque without transmission to keep substance
          side: THREE.DoubleSide,
        })
      : new THREE.MeshPhysicalMaterial({
          color: CUBE_COLOR,
          metalness: 0.3,
          roughness: 0.15,
          transmission: 0.9, // high glass-like transmission (VERY expensive on mobile GPU)
          thickness: 1.2,
          transparent: true,
          opacity: 0.85,
          side: THREE.DoubleSide,
        });

    // No MutationObserver needed — auth pages have a fixed dark theme.

    // Custom shader injection to fade based on Y coordinate natively
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
         varying vec3 vWorldPos;`
      ).replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
         vec4 wPos = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
         vWorldPos = wPos.xyz;`
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>
         varying vec3 vWorldPos;`
      ).replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
         // Fade into nothingness at the ceiling (y = 12 fading to y = 16)
         // Fade in from the floor (y = -16 fading to y = -12)
         float fadeOut = smoothstep(16.0, 10.0, vWorldPos.y);
         float fadeIn = smoothstep(-16.0, -10.0, vWorldPos.y);
         float alpha = fadeOut * fadeIn;
         
         gl_FragColor = vec4(gl_FragColor.rgb, gl_FragColor.a * alpha);`
      );
    };

    // ── Distribution ─────────────────────────────────────────────────────────
    const COUNT = 160;
    const mesh = new THREE.InstancedMesh(cubeGeo, material, COUNT);

    const dummy = new THREE.Object3D();
    const cubesData: {
      x: number; y: number; z: number;
      rx: number; ry: number; rz: number;
      s: number;
      speed: number;
      rSpeedX: number; rSpeedY: number; rSpeedZ: number;
    }[] = [];

    for (let i = 0; i < COUNT; i++) {
      const x = (Math.random() - 0.5) * 45; // spread wide
      const y = (Math.random() - 0.5) * 40; // vertical spread
      const z = (Math.random() - 0.5) * 20 - 5; // depth

      const rx = Math.random() * Math.PI;
      const ry = Math.random() * Math.PI;
      const rz = Math.random() * Math.PI;

      // Sizes vary from tiny specks to large feature blocks
      const sizeMod = Math.random();
      const s = sizeMod > 0.9 ? sizeMod * 2.5 + 1.0 : sizeMod * 1.5 + 0.3;

      // Speed (larger are generally slower to give parallax feel)
      const speed = (Math.random() * 0.015 + 0.005) / (s * 0.5);

      const rSpeedX = (Math.random() - 0.5) * 0.01;
      const rSpeedY = (Math.random() - 0.5) * 0.01;
      const rSpeedZ = (Math.random() - 0.5) * 0.01;

      cubesData.push({ x, y, z, rx, ry, rz, s, speed, rSpeedX, rSpeedY, rSpeedZ });

      dummy.position.set(x, y, z);
      dummy.rotation.set(rx, ry, rz);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
    scene.add(mesh);

    // ── Interaction ──────────────────────────────────────────────────────────
    const mouseNDC = new THREE.Vector2(0, 0);
    const targetNDC = new THREE.Vector2(0, 0);

    onMove = (e: MouseEvent) => {
      targetNDC.x = (e.clientX / W) * 2 - 1;
      targetNDC.y = -(e.clientY / H) * 2 + 1;
    };
    if (!isTouch) window.addEventListener("mousemove", onMove);

    onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    // ── Animation ────────────────────────────────────────────────────────────
    // NOTE: frameId is declared in the outer scope (line 15) so the cleanup
    // function can correctly cancel the animation loop on unmount.
    let opacityT = 0; // for global entry fade

    const animate = () => {
      frameId = requestAnimationFrame(animate);

      // Smooth, elegant intro fade for the background cubes over ~2 seconds
      if (opacityT < 1) {
        opacityT += 0.01;
        const ease = opacityT * opacityT * (3 - 2 * opacityT);
        renderer.domElement.style.opacity = String(Math.min(1, ease));
      }

      // Parallax mouse follow
      mouseNDC.lerp(targetNDC, 0.05);
      camera.position.x = mouseNDC.x * 2.0;
      camera.position.y = mouseNDC.y * 2.0;
      camera.lookAt(0, 0, 0);

      // Update instances
      for (let i = 0; i < COUNT; i++) {
        const d = cubesData[i];

        // Float up
        d.y += d.speed;

        // Rotate
        d.rx += d.rSpeedX;
        d.ry += d.rSpeedY;
        d.rz += d.rSpeedZ;

        // Reset if it hits ceiling (the shader fades it out before this happens)
        if (d.y > 18) {
          d.y = -18;
          d.x = (Math.random() - 0.5) * 45;
          d.z = (Math.random() - 0.5) * 20 - 5;
        }

        dummy.position.set(d.x, d.y, d.z);
        dummy.rotation.set(d.rx, d.ry, d.rz);
        dummy.scale.set(d.s, d.s, d.s);
        dummy.updateMatrix();

        mesh.setMatrixAt(i, dummy.matrix);
      }

      mesh.instanceMatrix.needsUpdate = true;
      renderer.render(scene, camera);
    };

    animate();
    }, 10);

    return () => {
      // observer is null since we removed the MutationObserver, but guard for safety
      observer?.disconnect();
      clearTimeout(initTimer);
      if (frameId) cancelAnimationFrame(frameId);
      if (!isTouch && onMove) window.removeEventListener("mousemove", onMove);
      if (onResize) window.removeEventListener("resize", onResize);
      if (mountRef.current && renderer) {
        // Guard: only removeChild if the domElement is still an actual child
        try { mountRef.current.removeChild(renderer.domElement); } catch (_) {}
      }
      renderer?.dispose();
      cubeGeo?.dispose();
      material?.dispose();
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 pointer-events-none" />;
}
