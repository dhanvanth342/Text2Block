import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ThreeBackgroundProps {
  isDark?: boolean;
}

export function ThreeBackground({ isDark = true }: ThreeBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene | null;
    camera: THREE.PerspectiveCamera | null;
    renderer: THREE.WebGLRenderer | null;
    particlesMaterial: THREE.PointsMaterial | null;
    linesMaterial: THREE.LineBasicMaterial | null;
    particlesMesh: THREE.Points | null;
    linesMesh: THREE.LineSegments | null;
    animationFrameId: number | null;
  }>({
    scene: null,
    camera: null,
    renderer: null,
    particlesMaterial: null,
    linesMaterial: null,
    particlesMesh: null,
    linesMesh: null,
    animationFrameId: null,
  });

  // Update colors when theme changes
  useEffect(() => {
    if (sceneRef.current.particlesMaterial) {
      sceneRef.current.particlesMaterial.color.setHex(isDark ? 0x3B82F6 : 0x94A3B8);
    }
    if (sceneRef.current.linesMaterial) {
      sceneRef.current.linesMaterial.color.setHex(isDark ? 0x1E293B : 0xCBD5E1);
    }
  }, [isDark]);

  // Initialize scene once
  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap pixel ratio for performance
    containerRef.current.appendChild(renderer.domElement);

    // Create particle network
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 150;
    const posArray = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 10;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.03,
      color: isDark ? 0x3B82F6 : 0x94A3B8,
      transparent: true,
      opacity: 0.8,
    });

    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);

    // Create connecting lines
    const linesMaterial = new THREE.LineBasicMaterial({
      color: isDark ? 0x1E293B : 0xCBD5E1,
      transparent: true,
      opacity: 0.2,
    });

    const linesGeometry = new THREE.BufferGeometry();
    const linePositions: number[] = [];

    for (let i = 0; i < particlesCount; i++) {
      for (let j = i + 1; j < particlesCount; j++) {
        const x1 = posArray[i * 3];
        const y1 = posArray[i * 3 + 1];
        const z1 = posArray[i * 3 + 2];
        const x2 = posArray[j * 3];
        const y2 = posArray[j * 3 + 1];
        const z2 = posArray[j * 3 + 2];

        const distance = Math.sqrt(
          Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2) + Math.pow(z2 - z1, 2)
        );

        if (distance < 1.5) {
          linePositions.push(x1, y1, z1, x2, y2, z2);
        }
      }
    }

    linesGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(linePositions, 3)
    );

    const linesMesh = new THREE.LineSegments(linesGeometry, linesMaterial);
    scene.add(linesMesh);

    camera.position.z = 5;

    // Store references
    sceneRef.current = {
      scene,
      camera,
      renderer,
      particlesMaterial,
      linesMaterial,
      particlesMesh,
      linesMesh,
      animationFrameId: null,
    };

    // Animation
    const animate = () => {
      sceneRef.current.animationFrameId = requestAnimationFrame(animate);

      if (sceneRef.current.particlesMesh && sceneRef.current.linesMesh) {
        sceneRef.current.particlesMesh.rotation.y += 0.0005;
        sceneRef.current.particlesMesh.rotation.x += 0.0003;
        sceneRef.current.linesMesh.rotation.y += 0.0005;
        sceneRef.current.linesMesh.rotation.x += 0.0003;
      }

      if (sceneRef.current.renderer && sceneRef.current.scene && sceneRef.current.camera) {
        sceneRef.current.renderer.render(sceneRef.current.scene, sceneRef.current.camera);
      }
    };

    animate();

    // Handle resize
    const handleResize = () => {
      if (sceneRef.current.camera && sceneRef.current.renderer) {
        sceneRef.current.camera.aspect = window.innerWidth / window.innerHeight;
        sceneRef.current.camera.updateProjectionMatrix();
        sceneRef.current.renderer.setSize(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (sceneRef.current.animationFrameId !== null) {
        cancelAnimationFrame(sceneRef.current.animationFrameId);
      }

      // Dispose of geometries and materials
      if (sceneRef.current.particlesMesh) {
        sceneRef.current.particlesMesh.geometry.dispose();
        if (sceneRef.current.particlesMaterial) {
          sceneRef.current.particlesMaterial.dispose();
        }
      }

      if (sceneRef.current.linesMesh) {
        sceneRef.current.linesMesh.geometry.dispose();
        if (sceneRef.current.linesMaterial) {
          sceneRef.current.linesMaterial.dispose();
        }
      }

      // Remove all objects from scene
      if (sceneRef.current.scene) {
        while (sceneRef.current.scene.children.length > 0) {
          sceneRef.current.scene.remove(sceneRef.current.scene.children[0]);
        }
      }

      // Remove renderer DOM element
      if (containerRef.current && sceneRef.current.renderer?.domElement) {
        try {
          containerRef.current.removeChild(sceneRef.current.renderer.domElement);
        } catch (e) {
          // Element might already be removed
        }
      }

      // Dispose renderer
      if (sceneRef.current.renderer) {
        sceneRef.current.renderer.dispose();
        sceneRef.current.renderer.forceContextLoss();
      }

      // Clear references
      sceneRef.current = {
        scene: null,
        camera: null,
        renderer: null,
        particlesMaterial: null,
        linesMaterial: null,
        particlesMesh: null,
        linesMesh: null,
        animationFrameId: null,
      };
    };
  }, []); // Only run once on mount

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 -z-10"
      style={{ pointerEvents: 'none' }}
    />
  );
}