/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { NodeData, LIBRARY_NODES, LIBRARY_EDGES } from '../../types';
import { SimObjectType } from '../../simulation/routeSimulation';

// Coordinate system mapping from 2D library Cartesian (x in [0..38], y in [-4..32])
// into Three.js 3D campus world coordinates (X east, Y up, Z south so -Z = North).
export const CAMPUS_CENTER_X = 19;
export const CAMPUS_CENTER_Y = 14;
export const CAMPUS_SCALE = 1.65;

export function graphToWorld(gx: number, gy: number): { x: number; z: number } {
  return {
    x: (gx - CAMPUS_CENTER_X) * CAMPUS_SCALE,
    z: -(gy - CAMPUS_CENTER_Y) * CAMPUS_SCALE,
  };
}

export interface ProceduralTextureSet {
  groundDark: THREE.CanvasTexture;
  groundLight: THREE.CanvasTexture;
  glassDark: THREE.CanvasTexture;
  glassLight: THREE.CanvasTexture;
  roadTex: THREE.CanvasTexture;
  shadowDisc: THREE.CanvasTexture;
}

export function createCampusTextures(maxAnisotropy: number): ProceduralTextureSet {
  // 1. Dark Mode Architectural Grid & Plaza Tile Texture
  const makeGroundTex = (bg: string, majorLine: string, minorLine: string) => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = minorLine;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 512; i += 64) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
    }

    ctx.strokeStyle = majorLine;
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, 512, 512);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(26, 26);
    tex.anisotropy = maxAnisotropy;
    return tex;
  };

  // 2. Architectural Glazing Curtain-Wall Facade Texture
  const makeGlassTex = (frame: string, paneA: string, paneB: string, glowLit: string) => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = frame;
    ctx.fillRect(0, 0, 256, 256);

    const cols = 4;
    const rows = 6;
    const cellW = 256 / cols;
    const cellH = 256 / rows;
    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < cols; col++) {
        const seed = (r * 7 + col * 13) % 10;
        ctx.fillStyle = seed < 2 ? glowLit : seed % 2 === 0 ? paneA : paneB;
        ctx.fillRect(col * cellW + 5, r * cellH + 5, cellW - 10, cellH - 10);
      }
    }

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = maxAnisotropy;
    return tex;
  };

  // 3. Road Pavement + Center Line Texture
  const roadCanvas = document.createElement('canvas');
  roadCanvas.width = 256;
  roadCanvas.height = 256;
  const rctx = roadCanvas.getContext('2d')!;
  rctx.fillStyle = '#1e293b';
  rctx.fillRect(0, 0, 256, 256);
  // Subtle shoulder lines
  rctx.fillStyle = 'rgba(148, 163, 184, 0.35)';
  rctx.fillRect(14, 0, 6, 256);
  rctx.fillRect(236, 0, 6, 256);
  // Center dashed lane strip
  rctx.fillStyle = 'rgba(226, 232, 240, 0.55)';
  for (let y = 12; y < 256; y += 64) {
    rctx.fillRect(125, y, 6, 34);
  }
  const roadTex = new THREE.CanvasTexture(roadCanvas);
  roadTex.colorSpace = THREE.SRGBColorSpace;
  roadTex.wrapS = THREE.ClampToEdgeWrapping;
  roadTex.wrapT = THREE.RepeatWrapping;
  roadTex.anisotropy = maxAnisotropy;

  // 4. Radial Contact Shadow Disc Texture
  const shCanvas = document.createElement('canvas');
  shCanvas.width = 128;
  shCanvas.height = 128;
  const sctx = shCanvas.getContext('2d')!;
  const grad = sctx.createRadialGradient(64, 64, 4, 64, 64, 60);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.25)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, 128, 128);
  const shadowDisc = new THREE.CanvasTexture(shCanvas);

  return {
    groundDark: makeGroundTex('#080d17', 'rgba(16, 185, 129, 0.20)', 'rgba(148, 163, 184, 0.08)'),
    groundLight: makeGroundTex('#eef3f8', 'rgba(15, 118, 110, 0.16)', 'rgba(100, 116, 139, 0.09)'),
    glassDark: makeGlassTex('#0f172a', '#134e4a', '#164e63', '#34d399'),
    glassLight: makeGlassTex('#475569', '#bae6fd', '#99f6e4', '#e0f2fe'),
    roadTex,
    shadowDisc,
  };
}

export interface BuildingHandles {
  nodeId: string;
  group: THREE.Group;
  hitbox: THREE.Mesh;
  beaconRing: THREE.Mesh;
  beaconGlow: THREE.Mesh;
  statusLightMat: THREE.MeshStandardMaterial;
  baseRadius: number;
  labelHeight: number;
}

/**
 * Builds distinct multi-part composite 3D architectural buildings mapped directly
 * to each library node type & department.
 */
export function buildCampusBuilding(
  node: NodeData,
  textures: ProceduralTextureSet,
  isLight: boolean
): BuildingHandles {
  const { x, z } = graphToWorld(node.x, node.y);
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.userData.nodeId = node.id;

  const glassTex = isLight ? textures.glassLight : textures.glassDark;

  const stoneColor = isLight ? 0xe2e8f0 : 0x1e293b;
  const darkTrimColor = isLight ? 0x64748b : 0x0f172a;
  const warmStoneColor = isLight ? 0xf5e9d4 : 0x332b24;

  const stoneMat = new THREE.MeshStandardMaterial({
    color: stoneColor,
    roughness: 0.78,
    metalness: 0.08,
  });
  const warmMat = new THREE.MeshStandardMaterial({
    color: warmStoneColor,
    roughness: 0.72,
    metalness: 0.05,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: darkTrimColor,
    roughness: 0.35,
    metalness: 0.75,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    map: glassTex,
    roughness: 0.18,
    metalness: 0.55,
    emissive: isLight ? 0x0f766e : 0x064e3b,
    emissiveIntensity: isLight ? 0.08 : 0.32,
  });

  const accentHex =
    node.zone === 'tech'
      ? 0x0ea5e9
      : node.zone === 'science'
      ? 0x14b8a6
      : node.zone === 'humanities'
      ? 0xf59e0b
      : node.zone === 'archive'
      ? 0xf43f5e
      : node.zone === 'services'
      ? 0x38bdf8
      : 0x10b981;

  const accentMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: isLight ? 0.25 : 0.7,
    roughness: 0.25,
    metalness: 0.65,
  });

  const statusLightMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: 0.85,
    roughness: 0.2,
    metalness: 0.5,
    transparent: true,
    opacity: 0.9,
  });

  let labelHeight = 7.5;
  let baseRadius = 3.8;

  const enableShadows = (obj: THREE.Object3D) => {
    obj.traverse((c) => {
      if (c instanceof THREE.Mesh) {
        c.castShadow = true;
        c.receiveShadow = true;
      }
    });
  };

  // Shared Architectural Plaza Pad
  const addPlazaPad = (r: number) => {
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r + 0.35, 0.24, 24),
      stoneMat
    );
    pad.position.y = 0.12;
    pad.receiveShadow = true;
    group.add(pad);
    baseRadius = r;
  };

  switch (node.id) {
    case 'Entrance': {
      // GRAND ATRIUM & LOBBY: Monumental central hall + portico columns + glass rotunda dome
      addPlazaPad(4.8);
      const base = new THREE.Mesh(new THREE.BoxGeometry(6.8, 2.2, 5.4), stoneMat);
      base.position.y = 1.3;
      const glazedHall = new THREE.Mesh(new THREE.BoxGeometry(5.8, 3.6, 4.4), glassMat);
      glazedHall.position.y = 3.2;
      const roofDeck = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.35, 5.0), trimMat);
      roofDeck.position.y = 5.1;

      // Central Glass Rotunda Dome
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.1, 1.1, 24), stoneMat);
      drum.position.y = 5.65;
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(1.85, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5),
        glassMat
      );
      dome.position.y = 6.2;
      const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 1.4, 8), accentMat);
      spire.position.y = 8.4;

      // Grand Front Portico & 4 Columns
      const porticoRoof = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.3, 1.4), trimMat);
      porticoRoof.position.set(0, 3.2, 3.0);
      for (const px of [-1.7, -0.6, 0.6, 1.7]) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 2.8, 12), stoneMat);
        col.position.set(px, 1.65, 3.3);
        group.add(col);
      }
      const canopyGlow = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.12, 0.18), accentMat);
      canopyGlow.position.set(0, 3.2, 3.72);

      group.add(base, glazedHall, roofDeck, drum, dome, spire, porticoRoof, canopyGlow);
      labelHeight = 9.5;
      break;
    }

    case 'Information_Desk': {
      // INFORMATION & RESEARCH: Modern hexagonal pavilion + cantilevered halo roof
      addPlazaPad(3.6);
      const plinth = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 3.0, 0.7, 6), stoneMat);
      plinth.position.y = 0.55;
      const glassCore = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 3.0, 6), glassMat);
      glassCore.position.y = 2.35;
      const floatingRoof = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 2.9, 0.4, 6), trimMat);
      floatingRoof.position.y = 4.0;
      const lantern = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 1.2, 6), glassMat);
      lantern.position.y = 4.7;
      const beaconRing = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.09, 10, 24), accentMat);
      beaconRing.rotation.x = Math.PI / 2;
      beaconRing.position.y = 4.15;
      group.add(plinth, glassCore, floatingRoof, lantern, beaconRing);
      labelHeight = 6.2;
      break;
    }

    case 'Fiction_Aisle_A':
    case 'Fiction_Aisle_B': {
      // FICTION GALLERY: Museum-style building with stepped plinth, colonnade, and clerestory roof
      addPlazaPad(3.8);
      const steps = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.5, 4.2), warmMat);
      steps.position.y = 0.45;
      const mainHall = new THREE.Mesh(new THREE.BoxGeometry(4.6, 3.2, 3.4), warmMat);
      mainHall.position.y = 2.3;
      const frieze = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.35, 3.7), trimMat);
      frieze.position.y = 4.05;
      const clerestory = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.1, 2.1), glassMat);
      clerestory.position.y = 4.75;
      const roofCap = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.25, 2.4), accentMat);
      roofCap.position.y = 5.4;

      // Museum facade pillars
      for (const px of [-1.8, -0.6, 0.6, 1.8]) {
        const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 3.2, 10), stoneMat);
        pil.position.set(px, 2.3, 1.82);
        group.add(pil);
      }
      group.add(steps, mainHall, frieze, clerestory, roofCap);
      labelHeight = 6.4;
      break;
    }

    case 'Mathematics': {
      // MATHEMATICS & STEM: Tall stepped scientific research tower with geometric fins & crown spire
      addPlazaPad(3.7);
      const podium = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.5, 4.8), stoneMat);
      podium.position.y = 0.95;
      const lowerShaft = new THREE.Mesh(new THREE.BoxGeometry(3.4, 4.2, 3.4), glassMat);
      lowerShaft.position.y = 3.8;
      const upperShaft = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.2, 2.4), glassMat);
      upperShaft.position.y = 7.4;
      const crownTrim = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.3, 2.65), trimMat);
      crownTrim.position.y = 9.1;
      const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.22, 2.2, 8), accentMat);
      spire.position.y = 10.3;

      // Vertical architectural mullions/fins on 4 corners
      for (const sx of [-1.72, 1.72]) {
        for (const sz of [-1.72, 1.72]) {
          const fin = new THREE.Mesh(new THREE.BoxGeometry(0.24, 5.2, 0.24), trimMat);
          fin.position.set(sx, 3.4, sz);
          group.add(fin);
        }
      }
      group.add(podium, lowerShaft, upperShaft, crownTrim, spire);
      labelHeight = 11.8;
      break;
    }

    case 'Computer_Science': {
      // COMPUTER SCIENCE: Modern sleek cantilevered technology headquarters + rooftop dish & cyber ribs
      addPlazaPad(4.2);
      const baseWing = new THREE.Mesh(new THREE.BoxGeometry(5.6, 2.6, 3.8), trimMat);
      baseWing.position.y = 1.5;
      const techCore = new THREE.Mesh(new THREE.BoxGeometry(4.4, 4.8, 3.2), glassMat);
      techCore.position.set(-0.2, 3.8, 0);
      // Cantilevered upper lab slab
      const cantilever = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.6, 3.8), trimMat);
      cantilever.position.set(0.6, 5.8, 0);
      const neonBand = new THREE.Mesh(new THREE.BoxGeometry(5.35, 0.16, 3.92), accentMat);
      neonBand.position.set(0.6, 6.55, 0);

      // Rooftop comms dome & antennas
      const rooftopHub = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.0, 0.7, 16), stoneMat);
      rooftopHub.position.set(-0.4, 6.95, 0);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 1.8, 8), accentMat);
      mast.position.set(1.4, 7.5, -0.5);

      group.add(baseWing, techCore, cantilever, neonBand, rooftopHub, mast);
      labelHeight = 8.9;
      break;
    }

    case 'Science_Wing': {
      // NATURAL SCIENCES: Modern twin-bay laboratory with skybridge & sawtooth monitors
      addPlazaPad(4.0);
      const bayLeft = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.6, 4.4), glassMat);
      bayLeft.position.set(-1.5, 2.0, 0);
      const bayRight = new THREE.Mesh(new THREE.BoxGeometry(2.2, 4.2, 4.4), stoneMat);
      bayRight.position.set(1.5, 2.3, 0);
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 2.4), glassMat);
      bridge.position.set(0, 3.0, 0);
      // Lab ventilation silos & skylight vents
      const silo1 = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.3, 14), trimMat);
      silo1.position.set(1.5, 5.0, -0.9);
      const silo2 = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.3, 14), trimMat);
      silo2.position.set(1.5, 5.0, 0.9);
      const skylight = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 3.6), accentMat);
      skylight.position.set(-1.5, 4.0, 0);
      group.add(bayLeft, bayRight, bridge, silo1, silo2, skylight);
      labelHeight = 6.5;
      break;
    }

    case 'Digital_Media_Lab': {
      // DIGITAL MEDIA: Creative angled-roof media studio with glowing facade & acoustic louvers
      addPlazaPad(3.8);
      const body = new THREE.Mesh(new THREE.BoxGeometry(5.0, 3.2, 3.8), trimMat);
      body.position.y = 1.8;
      // Sloped angled architectural wing roof
      const wedge = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 3.0, 5.2, 4), glassMat);
      wedge.rotation.z = Math.PI / 2;
      wedge.rotation.y = Math.PI / 4;
      wedge.scale.set(0.45, 1, 0.8);
      wedge.position.set(0, 3.7, 0);
      const mediaScreen = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.8, 0.14), accentMat);
      mediaScreen.position.set(0, 2.0, 1.95);
      // Vertical louver ribs on side
      for (let i = -2; i <= 2; i++) {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.4, 4.1), stoneMat);
        rib.position.set(i * 0.95, 1.9, 0);
        group.add(rib);
      }
      group.add(body, wedge, mediaScreen);
      labelHeight = 6.0;
      break;
    }

    case 'Self_Checkout': {
      // SELF-CHECKOUT: Small sleek service kiosk pavilion with sweeping canopy overhang
      addPlazaPad(3.0);
      const kioskCore = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.1, 2.4), glassMat);
      kioskCore.position.y = 1.25;
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.28, 3.6), trimMat);
      canopy.position.y = 2.55;
      canopy.rotation.x = -0.06;
      const expressBand = new THREE.Mesh(new THREE.BoxGeometry(4.65, 0.12, 0.2), accentMat);
      expressBand.position.set(0, 2.55, 1.78);
      for (const px of [-1.8, 1.8]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 2.3, 10), trimMat);
        post.position.set(px, 1.35, 1.4);
        group.add(post);
      }
      group.add(kioskCore, canopy, expressBand);
      labelHeight = 4.2;
      break;
    }

    case 'Study_Commons': {
      // CENTRAL STUDY COMMONS: Wide skylit glass commons courtyard hall
      addPlazaPad(4.4);
      const mainBlock = new THREE.Mesh(new THREE.BoxGeometry(6.0, 3.4, 4.8), stoneMat);
      mainBlock.position.y = 1.9;
      const atriumGlass = new THREE.Mesh(new THREE.BoxGeometry(4.8, 3.9, 3.8), glassMat);
      atriumGlass.position.y = 2.3;
      const skylightPeak1 = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 4.6, 3), glassMat);
      skylightPeak1.rotation.z = Math.PI / 2;
      skylightPeak1.position.set(0, 4.6, -1.0);
      const skylightPeak2 = skylightPeak1.clone();
      skylightPeak2.position.set(0, 4.6, 1.0);
      const trimEdge = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.22, 5.0), accentMat);
      trimEdge.position.y = 3.75;
      group.add(mainBlock, atriumGlass, skylightPeak1, skylightPeak2, trimEdge);
      labelHeight = 6.8;
      break;
    }

    case 'Rare_Manuscripts': {
      // SPECIAL COLLECTIONS (RARE VAULT): High-security armored vault bastion
      addPlazaPad(4.0);
      const bunker = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.2, 4.5, 8), trimMat);
      bunker.position.y = 2.45;
      const innerVault = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.0, 5.4, 8), stoneMat);
      innerVault.position.y = 2.9;
      const sealRing = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.14, 10, 8), accentMat);
      sealRing.rotation.x = Math.PI / 2;
      sealRing.position.y = 5.4;
      const beaconOrb = new THREE.Mesh(new THREE.OctahedronGeometry(0.65, 0), accentMat);
      beaconOrb.position.y = 6.35;
      group.add(bunker, innerVault, sealRing, beaconOrb);
      labelHeight = 7.6;
      break;
    }

    default: {
      // PERIODICALS, HISTORY_PHILOSOPHY, REFERENCE_COLLECTION: Distinguished terraced classical/academic halls
      addPlazaPad(3.7);
      const baseH = node.id === 'Reference_Collection' ? 4.4 : node.id === 'History_Philosophy' ? 4.0 : 3.4;
      const lower = new THREE.Mesh(new THREE.BoxGeometry(4.6, baseH * 0.55, 3.8), warmMat);
      lower.position.y = 0.2 + baseH * 0.275;
      const upper = new THREE.Mesh(new THREE.BoxGeometry(3.6, baseH * 0.45, 3.0), glassMat);
      upper.position.y = 0.2 + baseH * 0.72;
      const crown = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.28, 3.4), trimMat);
      crown.position.y = 0.35 + baseH;
      const cupola = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.1, 0.9, 8), accentMat);
      cupola.position.y = 0.9 + baseH;
      group.add(lower, upper, crown, cupola);
      labelHeight = baseH + 2.2;
      break;
    }
  }

  enableShadows(group);

  // Ground Status Halo Ring (highlighted dynamically for Start, Goal, Waypoint, Closed)
  const ringGeo = new THREE.RingGeometry(baseRadius + 0.15, baseRadius + 0.52, 36);
  ringGeo.rotateX(-Math.PI / 2);
  const beaconRing = new THREE.Mesh(ringGeo, statusLightMat);
  beaconRing.position.y = 0.05;
  group.add(beaconRing);

  // Vertical Marker Beacon Ring (subtle translucent halo for Start/Goal)
  const glowRingGeo = new THREE.TorusGeometry(baseRadius * 0.65, 0.08, 8, 32);
  glowRingGeo.rotateX(Math.PI / 2);
  const beaconGlow = new THREE.Mesh(glowRingGeo, statusLightMat);
  beaconGlow.position.y = labelHeight - 0.6;
  beaconGlow.visible = false;
  group.add(beaconGlow);

  // Invisible proxy hitbox for crisp & fast Raycasting
  const hitbox = new THREE.Mesh(
    new THREE.CylinderGeometry(baseRadius, baseRadius, labelHeight, 12),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hitbox.position.y = labelHeight * 0.5;
  hitbox.userData.nodeId = node.id;
  group.add(hitbox);

  return {
    nodeId: node.id,
    group,
    hitbox,
    beaconRing,
    beaconGlow,
    statusLightMat,
    baseRadius,
    labelHeight,
  };
}

export interface Vehicle3DHandles {
  root: THREE.Group;
  wheels: THREE.Object3D[];
  headlightGlow: THREE.Mesh;
  lidarMesh?: THREE.Object3D;
}

/**
 * Builds composite 3D simulation vehicles ('car' | 'pointer' | 'cart') with bottom-center pivot y=0.
 */
export function buildVehicle3D(type: SimObjectType): Vehicle3DHandles {
  const root = new THREE.Group();
  const wheels: THREE.Object3D[] = [];

  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.45, metalness: 0.75 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.88, metalness: 0.05 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x34d399, roughness: 0.25, metalness: 0.85 });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0x7dd3fc,
    emissiveIntensity: 2.0,
    roughness: 0.1,
  });
  const tailLightMat = new THREE.MeshStandardMaterial({
    color: 0xf43f5e,
    emissive: 0xef4444,
    emissiveIntensity: 1.8,
  });

  // Ground contact glow ring under vehicle
  const groundAura = new THREE.Mesh(
    new THREE.RingGeometry(1.15, 1.55, 28).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({
      color: type === 'pointer' ? 0x38bdf8 : type === 'cart' ? 0xf59e0b : 0x10b981,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
    })
  );
  groundAura.position.y = 0.06;
  root.add(groundAura);

  let lidarMesh: THREE.Object3D | undefined;

  if (type === 'car') {
    // 1. AUTONOMOUS ELECTRIC CAMPUS CAR (Facing +Z local forward)
    const bodyPaint = new THREE.MeshPhysicalMaterial({
      color: 0x059669,
      roughness: 0.2,
      metalness: 0.65,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
    });
    const canopyGlass = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.08,
      metalness: 0.85,
      emissive: 0x064e3b,
      emissiveIntensity: 0.25,
    });

    // Lower chassis & sculpted hood/trunk
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.38, 2.9), darkMetal);
    chassis.position.y = 0.42;
    const upperBody = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.42, 2.7), bodyPaint);
    upperBody.position.y = 0.72;
    // Cabin greenhouse
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.46, 1.45), canopyGlass);
    cabin.position.set(0, 1.12, -0.1);
    const roofCap = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 1.25), bodyPaint);
    roofCap.position.set(0, 1.38, -0.1);

    // Lidar Sensor Dome on roof
    const lidar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.22, 0.18, 16),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 1.4 })
    );
    lidar.position.set(0, 1.5, 0.1);
    lidarMesh = lidar;

    // Front dual headlights (+Z nose)
    const hlLeft = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.08), headlightMat);
    hlLeft.position.set(-0.46, 0.7, 1.37);
    const hlRight = hlLeft.clone();
    hlRight.position.x = 0.46;

    // Rear LED lightbar (-Z tail)
    const tlBar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.1, 0.08), tailLightMat);
    tlBar.position.set(0, 0.74, -1.36);

    // 4 Wheel + Rim Assemblies
    const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    const hubGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.24, 10);
    hubGeo.rotateZ(Math.PI / 2);

    const wheelOffsets: [number, number, number][] = [
      [-0.78, 0.32, 0.88],
      [0.78, 0.32, 0.88],
      [-0.78, 0.32, -0.88],
      [0.78, 0.32, -0.88],
    ];
    wheelOffsets.forEach(([wx, wy, wz]) => {
      const wGroup = new THREE.Group();
      wGroup.position.set(wx, wy, wz);
      wGroup.add(new THREE.Mesh(wheelGeo, tireMat), new THREE.Mesh(hubGeo, rimMat));
      root.add(wGroup);
      wheels.push(wGroup);
    });

    root.add(chassis, upperBody, cabin, roofCap, lidar, hlLeft, hlRight, tlBar);
  } else if (type === 'pointer') {
    // 2. FUTURISTIC HOVERING NAVIGATION POINTER (Facing +Z)
    const shape = new THREE.Shape();
    shape.moveTo(0, 1.55);
    shape.lineTo(1.15, -1.1);
    shape.lineTo(0, -0.55);
    shape.lineTo(-1.15, -1.1);
    shape.closePath();

    const extrudeGeo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.36,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.08,
      bevelSegments: 2,
    });
    extrudeGeo.rotateX(Math.PI / 2);

    const arrowMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      emissive: 0x0284c7,
      emissiveIntensity: 0.75,
      roughness: 0.2,
      metalness: 0.7,
    });
    const arrowMesh = new THREE.Mesh(extrudeGeo, arrowMat);
    arrowMesh.position.y = 1.05;

    const coreOrb = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.32, 0),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x7dd3fc, emissiveIntensity: 1.8 })
    );
    coreOrb.position.set(0, 1.25, 0.15);
    lidarMesh = coreOrb;

    root.add(arrowMesh, coreOrb);
  } else {
    // 3. AUTONOMOUS BOOK DELIVERY CART BOT (Facing +Z)
    const cartMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.6 });
    const tray = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.55, 1.9), cartMat);
    tray.position.y = 0.55;
    const bumper = new THREE.Mesh(
      new THREE.BoxGeometry(1.38, 0.14, 1.98),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.5 })
    );
    bumper.position.y = 0.32;

    // Stacked Colorful Books on Tray
    const bookColors = [0x10b981, 0x38bdf8, 0xf43f5e];
    bookColors.forEach((col, i) => {
      const book = new THREE.Mesh(
        new THREE.BoxGeometry(0.85, 0.16, 0.65),
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.65 })
      );
      book.position.set(0, 0.9 + i * 0.17, -0.2);
      book.rotation.y = (i - 1) * 0.12;
      root.add(book);
    });

    // Optical Sensor Head (+Z front)
    const sensorHead = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 0.42, 0.35),
      new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.6 })
    );
    sensorHead.position.set(0, 1.05, 0.72);
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), headlightMat);
    eyeL.position.set(-0.16, 1.07, 0.9);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.16;

    const wheelGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.18, 12);
    wheelGeo.rotateZ(Math.PI / 2);
    for (const [wx, wz] of [[-0.68, 0.65], [0.68, 0.65], [-0.68, -0.65], [0.68, -0.65]]) {
      const w = new THREE.Mesh(wheelGeo, tireMat);
      w.position.set(wx, 0.24, wz);
      root.add(w);
      wheels.push(w);
    }

    root.add(tray, bumper, sensorHead, eyeL, eyeR);
  }

  // Soft forward headlight ground cone
  const coneGeo = new THREE.PlaneGeometry(1.6, 3.2);
  coneGeo.rotateX(-Math.PI / 2);
  const coneMat = new THREE.MeshBasicMaterial({
    color: type === 'cart' ? 0xfbbf24 : 0x38bdf8,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
  });
  const headlightGlow = new THREE.Mesh(coneGeo, coneMat);
  headlightGlow.position.set(0, 0.08, 2.5);
  root.add(headlightGlow);

  root.traverse((c) => {
    if (c instanceof THREE.Mesh && c !== groundAura && c !== headlightGlow) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });

  return { root, wheels, headlightGlow, lidarMesh };
}

/**
 * Generates tree positions on the campus lawn guaranteed to avoid all roads and buildings.
 */
export function computeCampusTreePositions(): { x: number; z: number; scale: number }[] {
  const nodes3D = Object.values(LIBRARY_NODES).map((n) => ({
    ...graphToWorld(n.x, n.y),
  }));
  const edges3D = LIBRARY_EDGES.map((e) => {
    const a = graphToWorld(LIBRARY_NODES[e.source].x, LIBRARY_NODES[e.source].y);
    const b = graphToWorld(LIBRARY_NODES[e.target].x, LIBRARY_NODES[e.target].y);
    return { ax: a.x, az: a.z, bx: b.x, bz: b.z };
  });

  const distToSeg = (px: number, pz: number, ax: number, az: number, bx: number, bz: number) => {
    const dx = bx - ax;
    const dz = bz - az;
    const l2 = dx * dx + dz * dz;
    if (l2 === 0) return Math.hypot(px - ax, pz - az);
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2));
    return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
  };

  const trees: { x: number; z: number; scale: number }[] = [];
  // Deterministic pseudo-random scatter across campus perimeter & parks
  let seed = 42;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  for (let i = 0; i < 220 && trees.length < 48; i++) {
    const x = (rand() - 0.5) * 92;
    const z = (rand() - 0.5) * 84;

    const tooCloseToBuilding = nodes3D.some((n) => Math.hypot(x - n.x, z - n.z) < 7.2);
    if (tooCloseToBuilding) continue;

    const tooCloseToRoad = edges3D.some((e) => distToSeg(x, z, e.ax, e.az, e.bx, e.bz) < 3.4);
    if (tooCloseToRoad) continue;

    const tooCloseToOtherTree = trees.some((t) => Math.hypot(x - t.x, z - t.z) < 4.5);
    if (tooCloseToOtherTree) continue;

    trees.push({ x, z, scale: 0.8 + rand() * 0.5 });
  }

  return trees;
}
