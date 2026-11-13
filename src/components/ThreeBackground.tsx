/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export type ScenePreset = 'atrium' | 'cyber' | 'reading-room' | 'constellation';

interface ThreeBackgroundProps {
  preset: ScenePreset;
  interactive?: boolean;
  intensity?: number; // 0.1 to 1.5
  theme?: 'light' | 'dark';
  onPresetChange?: (preset: ScenePreset) => void;
}

// Procedural texture generators to guarantee ZERO external 404 assets
function createSpineTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Background leather tones
    const grad = ctx.createLinearGradient(0, 0, 512, 0);
    grad.addColorStop(0, '#1E293B');
    grad.addColorStop(0.2, '#0F172A');
    grad.addColorStop(0.4, '#1E1B4B');
    grad.addColorStop(0.6, '#064E3B');
    grad.addColorStop(0.8, '#451A03');
    grad.addColorStop(1, '#1E293B');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 128);

    // Book spines divisions & embossed gold ribs
    for (let x = 0; x < 512; x += 32) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(x, 0, 2, 128);

      // Gold leaf foil bands
      ctx.fillStyle = 'rgba(217, 119, 6, 0.6)';
      ctx.fillRect(x + 4, 20, 24, 2);
      ctx.fillRect(x + 4, 24, 24, 1);
      ctx.fillRect(x + 4, 100, 24, 2);
      ctx.fillRect(x + 4, 104, 24, 1);

      // Center title impression
      ctx.fillStyle = 'rgba(251, 191, 36, 0.4)';
      ctx.fillRect(x + 8, 50, 16, 28);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function createWoodTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#1e1610';
    ctx.fillRect(0, 0, 256, 256);
    // Subtle wood grain lines
    ctx.strokeStyle = '#2d1e15';
    ctx.lineWidth = 1;
    for (let y = 0; y < 256; y += 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(80, y + (Math.sin(y * 0.1) * 3), 180, y - (Math.cos(y * 0.1) * 3), 256, y);
      ctx.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function createMoteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.3, 'rgba(251, 191, 36, 0.8)');
    grad.addColorStop(0.7, 'rgba(52, 211, 153, 0.2)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
  }
  return new THREE.CanvasTexture(canvas);
}

export const ThreeBackground: React.FC<ThreeBackgroundProps> = ({
  preset = 'atrium',
  interactive = false,
  intensity = 1.0,
  theme = 'dark',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const reqIdRef = useRef<number | null>(null);

  // Mouse parallax / interaction state
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, isDragging: false, prevX: 0, prevY: 0 });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect software rendering fallback
    let isSoftwareGl = false;
    try {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl');
      const dbg = gl?.getExtension('WEBGL_debug_renderer_info');
      if (dbg && gl) {
        const rendererInfo = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '';
        if (/llvmpipe|swiftshader|software/i.test(rendererInfo)) {
          isSoftwareGl = true;
        }
      }
    } catch {
      // ignore
    }

    // 1. Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Set background color matching app palette
    const isLight = theme === 'light';
    const baseBgColor = isLight
      ? (preset === 'cyber' ? 0xe2e8f0 : preset === 'reading-room' ? 0xfef3c7 : preset === 'constellation' ? 0xf1f5f9 : 0xf8fafc)
      : (preset === 'cyber' ? 0x050c14 : preset === 'reading-room' ? 0x0d0907 : preset === 'constellation' ? 0x030712 : 0x080c14);
    scene.background = new THREE.Color(baseBgColor);

    // Exponential atmospheric fog to blend seamlessly with UI
    const fogColor = baseBgColor;
    const fogDensity = preset === 'cyber' ? 0.025 : preset === 'constellation' ? 0.015 : 0.028;
    scene.fog = new THREE.FogExp2(fogColor, fogDensity);

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / Math.max(container.clientHeight, 1),
      0.1,
      120
    );
    camera.position.set(0, 3.2, 11);
    cameraRef.current = camera;

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isSoftwareGl ? 1 : 1.75));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05 * intensity;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Shared procedural textures
    const spineTexture = createSpineTexture();
    const woodTexture = createWoodTexture();
    const moteTexture = createMoteTexture();

    // 4. Lighting Configuration
    const hemiLight = new THREE.HemisphereLight(
      preset === 'cyber' ? 0x00f0ff : preset === 'reading-room' ? 0xffdfba : 0xa7f3d0,
      0x050c18,
      0.65 * intensity
    );
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(
      preset === 'cyber' ? 0x06b6d4 : preset === 'reading-room' ? 0xf59e0b : 0x34d399,
      1.2 * intensity
    );
    dirLight.position.set(6, 12, 8);
    scene.add(dirLight);

    // Accent pool lighting
    const accentPoint = new THREE.PointLight(
      preset === 'cyber' ? 0x10b981 : 0xfbbf24,
      1.8 * intensity,
      16
    );
    accentPoint.position.set(0, 2.5, 3);
    scene.add(accentPoint);

    // 5. Build Procedural Scene Models (Composite 3-12 parts)
    const objectsGroup = new THREE.Group();
    scene.add(objectsGroup);

    // Shared Materials
    const darkWoodMat = new THREE.MeshStandardMaterial({
      color: 0x1e1610,
      map: woodTexture,
      roughness: 0.75,
      metalness: 0.1,
    });
    const shelfBoardMat = new THREE.MeshStandardMaterial({
      color: 0x271d15,
      roughness: 0.8,
      metalness: 0.05,
    });
    const bookSpinesMat = new THREE.MeshStandardMaterial({
      map: spineTexture,
      roughness: 0.6,
      metalness: 0.2,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.35,
      metalness: 0.85,
    });
    const greenShadeMat = new THREE.MeshPhysicalMaterial({
      color: 0x065f46,
      roughness: 0.15,
      transmission: 0.6,
      transparent: true,
      opacity: 0.9,
      reflectivity: 0.8,
    });
    const stoneColumnMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.85,
      metalness: 0.05,
    });
    const cyberGridMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      wireframe: true,
      transparent: true,
      opacity: 0.25,
    });
    const cyberNodeMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.6,
    });

    // Helper: Build a composite Bookshelf (uprights, top crown, bottom plinth, multi shelves, individual book rows)
    const createBookshelfComposite = (x: number, y: number, z: number, rotationY: number = 0) => {
      const shelfGroup = new THREE.Group();
      shelfGroup.position.set(x, y, z);
      shelfGroup.rotation.y = rotationY;

      // 1. Upright side posts
      const sideGeom = new THREE.BoxGeometry(0.12, 5.2, 0.7);
      const leftPost = new THREE.Mesh(sideGeom, darkWoodMat);
      leftPost.position.set(-1.45, 2.6, 0);
      const rightPost = new THREE.Mesh(sideGeom, darkWoodMat);
      rightPost.position.set(1.45, 2.6, 0);
      shelfGroup.add(leftPost, rightPost);

      // 2. Base plinth & Crown Cornice
      const plinthGeom = new THREE.BoxGeometry(3.1, 0.3, 0.78);
      const plinth = new THREE.Mesh(plinthGeom, darkWoodMat);
      plinth.position.set(0, 0.15, 0);
      const crown = new THREE.Mesh(plinthGeom, darkWoodMat);
      crown.position.set(0, 5.2, 0);
      shelfGroup.add(plinth, crown);

      // 3. Shelves & Books (4 tiers)
      const shelfTierGeom = new THREE.BoxGeometry(2.8, 0.08, 0.65);
      const bookBlockGeom = new THREE.BoxGeometry(2.65, 0.8, 0.45);

      for (let i = 0; i < 4; i++) {
        const shelfY = 0.5 + i * 1.15;
        const tier = new THREE.Mesh(shelfTierGeom, shelfBoardMat);
        tier.position.set(0, shelfY, 0);
        shelfGroup.add(tier);

        // Books block with varied offsets
        const books = new THREE.Mesh(bookBlockGeom, bookSpinesMat);
        books.position.set(0, shelfY + 0.44, 0.04);
        books.scale.set(0.98 + (i % 2) * 0.02, 0.95 + ((i * 3) % 4) * 0.03, 1);
        shelfGroup.add(books);
      }

      return shelfGroup;
    };

    // Helper: Build a Reading Desk with banker's lamp
    const createReadingDesk = (x: number, y: number, z: number) => {
      const deskGroup = new THREE.Group();
      deskGroup.position.set(x, y, z);

      // 1. Table Top (Mahogany)
      const topGeom = new THREE.BoxGeometry(3.6, 0.15, 1.8);
      const top = new THREE.Mesh(topGeom, darkWoodMat);
      top.position.set(0, 1.4, 0);
      deskGroup.add(top);

      // 2. Desk Legs (4 turned posts)
      const legGeom = new THREE.CylinderGeometry(0.06, 0.05, 1.35, 8);
      const legPositions = [
        [-1.6, 0.68, -0.75],
        [1.6, 0.68, -0.75],
        [-1.6, 0.68, 0.75],
        [1.6, 0.68, 0.75],
      ];
      legPositions.forEach(([lx, ly, lz]) => {
        const leg = new THREE.Mesh(legGeom, darkWoodMat);
        leg.position.set(lx, ly, lz);
        deskGroup.add(leg);
      });

      // 3. Banker's Lamp (Brass stem + emerald green curved glass shade)
      const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.05, 16), brassMat);
      lampBase.position.set(0, 1.5, 0);
      const lampStem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 8), brassMat);
      lampStem.position.set(0, 1.72, 0);
      const lampArm = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.03, 0.03), brassMat);
      lampArm.position.set(0, 1.95, 0);
      const lampShade = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.38, 16, 1, false, 0, Math.PI), greenShadeMat);
      lampShade.rotation.z = Math.PI / 2;
      lampShade.position.set(0, 1.95, 0);

      // Small warm pool light from lamp
      const lampLight = new THREE.PointLight(0xfef08a, 1.4 * intensity, 4.5);
      lampLight.position.set(0, 1.88, 0);

      deskGroup.add(lampBase, lampStem, lampArm, lampShade, lampLight);

      // 4. Open Book on Table
      const bookGeom = new THREE.BoxGeometry(0.48, 0.04, 0.36);
      const bookMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.9 });
      const openBook = new THREE.Mesh(bookGeom, bookMat);
      openBook.position.set(0.4, 1.49, 0.2);
      openBook.rotation.y = 0.2;
      deskGroup.add(openBook);

      return deskGroup;
    };

    // Helper: Build Architectural Colonnade
    const createColumn = (x: number, y: number, z: number) => {
      const colGroup = new THREE.Group();
      colGroup.position.set(x, y, z);

      // Base plinth
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.4, 0.9), stoneColumnMat);
      base.position.set(0, 0.2, 0);

      // Fluted column shaft
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 7.5, 16), stoneColumnMat);
      shaft.position.set(0, 4.15, 0);

      // Capital top
      const capital = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.35, 0.95), stoneColumnMat);
      capital.position.set(0, 8.0, 0);

      colGroup.add(base, shaft, capital);
      return colGroup;
    };

    // Populate according to selected preset
    if (preset === 'atrium' || preset === 'reading-room') {
      // Floor plane with subtle sheen
      const floorGeom = new THREE.PlaneGeometry(36, 36);
      const floorMat = new THREE.MeshStandardMaterial({
        color: preset === 'reading-room' ? 0x16100c : 0x0b111c,
        roughness: 0.6,
        metalness: 0.25,
      });
      const floor = new THREE.Mesh(floorGeom, floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = 0;
      objectsGroup.add(floor);

      // Aisle Bookshelves (Left & Right Wings)
      const aisleZ = [-7, -3.5, 0, 3.5];
      aisleZ.forEach((z) => {
        // Left flank
        objectsGroup.add(createBookshelfComposite(-5.8, 0, z, Math.PI / 2));
        // Right flank
        objectsGroup.add(createBookshelfComposite(5.8, 0, z, -Math.PI / 2));
      });

      // Background High Stacks (Gallery perspective)
      objectsGroup.add(createBookshelfComposite(-3.2, 0, -9.5, 0));
      objectsGroup.add(createBookshelfComposite(0, 0, -9.5, 0));
      objectsGroup.add(createBookshelfComposite(3.2, 0, -9.5, 0));

      // Upper mezzanine gallery archway
      const galleryBar = new THREE.Mesh(new THREE.BoxGeometry(14, 0.25, 1.2), darkWoodMat);
      galleryBar.position.set(0, 5.35, -9.0);
      objectsGroup.add(galleryBar);

      // Architectural Columns framing the atrium
      objectsGroup.add(createColumn(-3.8, 0, -4.5));
      objectsGroup.add(createColumn(3.8, 0, -4.5));
      objectsGroup.add(createColumn(-3.8, 0, 2.5));
      objectsGroup.add(createColumn(3.8, 0, 2.5));

      // Central Scholar's Reading Desks
      objectsGroup.add(createReadingDesk(0, 0, -1.8));
      if (preset === 'atrium') {
        objectsGroup.add(createReadingDesk(0, 0, 4.0));
      }
    } else if (preset === 'cyber') {
      // Cybernetic Holographic Archive
      const floorGrid = new THREE.GridHelper(40, 40, 0x10b981, 0x0e7490);
      floorGrid.position.y = 0;
      objectsGroup.add(floorGrid);

      // Holographic bookshelf towers
      const xPositions = [-6, -2.5, 2.5, 6];
      xPositions.forEach((x, colIdx) => {
        for (let row = 0; row < 3; row++) {
          const z = -8 + row * 6;
          const cyberShelf = new THREE.Mesh(new THREE.BoxGeometry(1.8, 5.5, 0.8), cyberGridMat);
          cyberShelf.position.set(x, 2.75, z);
          objectsGroup.add(cyberShelf);

          // Glowing data tiers
          for (let tier = 0; tier < 4; tier++) {
            const dataNode = new THREE.Mesh(
              new THREE.BoxGeometry(1.4, 0.15, 0.6),
              colIdx % 2 === 0 ? cyberNodeMat : new THREE.MeshStandardMaterial({
                color: 0x06b6d4,
                emissive: 0x0891b2,
                emissiveIntensity: 0.9,
              })
            );
            dataNode.position.set(x, 1.0 + tier * 1.1, z);
            objectsGroup.add(dataNode);
          }
        }
      });

      // Digital route search laser beam
      const beamGeom = new THREE.CylinderGeometry(0.04, 0.04, 24, 8);
      const beamMat = new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.7 });
      const beam = new THREE.Mesh(beamGeom, beamMat);
      beam.rotation.z = Math.PI / 2;
      beam.position.set(0, 3.5, -3);
      objectsGroup.add(beam);
    } else if (preset === 'constellation') {
      // Celestial Knowledge Graph
      // 14 Nodes floating in space representing library sections
      const nodeGeom = new THREE.SphereGeometry(0.24, 16, 16);
      const nodes: THREE.Mesh[] = [];
      const nodeCoords = [
        [0, 1.2, 0],
        [-2.5, 2.0, -2],
        [2.5, 2.2, -2],
        [-4.2, 3.5, -4],
        [-1.5, 4.2, -5],
        [1.8, 3.8, -5],
        [4.5, 3.2, -4],
        [-3.0, 5.2, -7],
        [0, 5.8, -8],
        [3.0, 5.2, -7],
        [-1.8, 7.0, -10],
        [1.8, 7.0, -10],
        [0, 8.2, -12],
        [0, 0.2, 2],
      ];

      nodeCoords.forEach(([nx, ny, nz], idx) => {
        const mat = new THREE.MeshStandardMaterial({
          color: idx % 3 === 0 ? 0x10b981 : idx % 3 === 1 ? 0x06b6d4 : 0xf59e0b,
          emissive: idx % 3 === 0 ? 0x059669 : idx % 3 === 1 ? 0x0891b2 : 0xd97706,
          emissiveIntensity: 0.8,
          roughness: 0.2,
        });
        const node = new THREE.Mesh(nodeGeom, mat);
        node.position.set(nx, ny, nz);
        objectsGroup.add(node);
        nodes.push(node);
      });

      // Connect nodes with glowing graph edges
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.35,
      });

      for (let i = 0; i < nodes.length - 1; i++) {
        const points = [nodes[i].position, nodes[i + 1].position];
        const geom = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geom, lineMat);
        objectsGroup.add(line);
      }
    }

    // 6. Atmospheric Floating Dust / Light Motes
    const moteCount = isSoftwareGl ? 60 : 220;
    const moteGeom = new THREE.BufferGeometry();
    const motePositions = new Float32Array(moteCount * 3);
    const moteVelocities: { x: number; y: number; z: number }[] = [];

    for (let i = 0; i < moteCount; i++) {
      motePositions[i * 3] = (Math.random() - 0.5) * 22;
      motePositions[i * 3 + 1] = Math.random() * 9;
      motePositions[i * 3 + 2] = (Math.random() - 0.5) * 24;
      moteVelocities.push({
        x: (Math.random() - 0.5) * 0.003,
        y: 0.002 + Math.random() * 0.003,
        z: (Math.random() - 0.5) * 0.003,
      });
    }

    moteGeom.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
    const moteMat = new THREE.PointsMaterial({
      size: preset === 'cyber' ? 0.28 : 0.22,
      map: moteTexture,
      transparent: true,
      opacity: preset === 'cyber' ? 0.55 : 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const moteParticles = new THREE.Points(moteGeom, moteMat);
    scene.add(moteParticles);

    // 7. Interaction Event Listeners
    const handleMouseMove = (e: MouseEvent) => {
      const normX = (e.clientX / window.innerWidth) * 2 - 1;
      const normY = -(e.clientY / window.innerHeight) * 2 + 1;
      mouseRef.current.targetX = normX * 1.4;
      mouseRef.current.targetY = normY * 0.8;

      if (interactive && mouseRef.current.isDragging) {
        const deltaX = e.clientX - mouseRef.current.prevX;
        const deltaY = e.clientY - mouseRef.current.prevY;
        camera.position.x -= deltaX * 0.01;
        camera.position.y += deltaY * 0.01;
        mouseRef.current.prevX = e.clientX;
        mouseRef.current.prevY = e.clientY;
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (!interactive) return;
      mouseRef.current.isDragging = true;
      mouseRef.current.prevX = e.clientX;
      mouseRef.current.prevY = e.clientY;
    };

    const handleMouseUp = () => {
      mouseRef.current.isDragging = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    // 8. Resize Observer
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / Math.max(h, 1);
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // 9. Animation Loop with Camera Damping & Frame Pacing
    let lastTime = performance.now();
    let clockTime = 0;

    const animate = (time: number) => {
      reqIdRef.current = requestAnimationFrame(animate);

      // Skip frame computation if document is hidden to save GPU cycles
      if (document.hidden) return;

      const delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;
      clockTime += delta;

      // Smooth mouse parallax damping
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.04;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.04;

      if (!interactive || !mouseRef.current.isDragging) {
        // Slow cinematic camera breathing
        const driftX = Math.sin(clockTime * 0.18) * 0.6;
        const driftY = Math.cos(clockTime * 0.15) * 0.25;

        camera.position.x = driftX + mouseRef.current.x;
        camera.position.y = 3.2 + driftY + mouseRef.current.y;
        camera.position.z = 11 + Math.sin(clockTime * 0.1) * 0.3;
        camera.lookAt(0, 2.5, -2);
      }

      // Animate floating dust motes
      const posAttr = moteGeom.attributes.position as THREE.BufferAttribute;
      const posArray = posAttr.array as Float32Array;

      for (let i = 0; i < moteCount; i++) {
        posArray[i * 3] += moteVelocities[i].x;
        posArray[i * 3 + 1] += moteVelocities[i].y;
        posArray[i * 3 + 2] += moteVelocities[i].z;

        // Wrap around bounds
        if (posArray[i * 3 + 1] > 9.5) {
          posArray[i * 3 + 1] = 0.2;
          posArray[i * 3] = (Math.random() - 0.5) * 22;
        }
      }
      posAttr.needsUpdate = true;

      // Subtle rotation for constellation or cyber stacks
      if (preset === 'constellation') {
        objectsGroup.rotation.y = clockTime * 0.05;
      } else if (preset === 'cyber') {
        objectsGroup.rotation.y = Math.sin(clockTime * 0.1) * 0.02;
      }

      renderer.render(scene, camera);
    };

    reqIdRef.current = requestAnimationFrame(animate);

    // Clean teardown
    return () => {
      if (reqIdRef.current) cancelAnimationFrame(reqIdRef.current);
      resizeObserver.disconnect();
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);

      // Deep disposal of scene objects & textures
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Points || obj instanceof THREE.Line) {
          if (obj.geometry) obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else if (obj.material) {
            obj.material.dispose();
          }
        }
      });

      spineTexture.dispose();
      woodTexture.dispose();
      moteTexture.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [preset, interactive, intensity, theme]);

  return (
    <div
      ref={mountRef}
      className={`fixed inset-0 w-full h-full pointer-events-${interactive ? 'auto cursor-grab' : 'none'} transition-opacity duration-1000 z-0`}
      style={{ opacity: theme === 'light' ? 0.38 : 0.92 }}
      aria-hidden="true"
    />
  );
};
