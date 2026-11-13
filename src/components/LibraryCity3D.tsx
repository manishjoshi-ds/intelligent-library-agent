/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  LIBRARY_NODES,
  LIBRARY_EDGES,
  NodeData,
  WALKING_SPEED_MPS,
  CROWD_MULTIPLIER,
} from '../types';
import { canonicalEdge } from '../searchEngine';
import {
  RouteSchedule,
  SimObjectType,
  evaluateVehicleAtProgress,
} from '../simulation/routeSimulation';
import {
  graphToWorld,
  createCampusTextures,
  buildCampusBuilding,
  buildVehicle3D,
  computeCampusTreePositions,
  BuildingHandles,
  Vehicle3DHandles,
} from './campus3d/buildCampusAssets';
import {
  RotateCcw,
  Maximize2,
  Minimize2,
  Tag,
  Car,
  Compass,
  ShieldAlert,
  Lock,
  X,
  Navigation,
  MapPin,
} from 'lucide-react';

interface LibraryCity3DProps {
  effectiveTheme: 'light' | 'dark';
  startNode: string;
  goalNode: string;
  effectivePath: string[];
  schedule: RouteSchedule;
  progressRef: React.MutableRefObject<number>;
  isSimulating: boolean;
  simSpeed: number;
  simObjectType: SimObjectType;
  closedSections: Set<string>;
  crowdedAisles: Set<string>;
  hasPermission: boolean;
  waypoints: string[];
  onSelectNode: (nodeId: string) => void;
  onToggleClosed: (nodeId: string) => void;
  onToggleCrowded: (edgeKey: string) => void;
}

// Module-scope reusable math objects for zero per-frame GC
const _projVec = new THREE.Vector3();
const _targetCamPos = new THREE.Vector3();
const _targetLook = new THREE.Vector3();

const DEFAULT_CAM_POS = new THREE.Vector3(0, 34, 44);
const DEFAULT_CAM_TARGET = new THREE.Vector3(0, 1.5, 0);

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

export const LibraryCity3D: React.FC<LibraryCity3DProps> = ({
  effectiveTheme,
  startNode,
  goalNode,
  effectivePath,
  schedule,
  progressRef,
  isSimulating,
  simSpeed,
  simObjectType,
  closedSections,
  crowdedAisles,
  hasPermission,
  waypoints,
  onSelectNode,
  onToggleClosed,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasMountRef = useRef<HTMLDivElement>(null);

  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [followVehicle, setFollowVehicle] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [selectedBuilding, setSelectedBuilding] = useState<NodeData | null>(null);
  const [hoveredBuildingId, setHoveredBuildingId] = useState<string | null>(null);

  // Refs synced cleanly into the WebGL rAF loop without tearing down the scene
  const latestPropsRef = useRef({
    effectiveTheme,
    startNode,
    goalNode,
    effectivePath,
    schedule,
    isSimulating,
    simSpeed,
    simObjectType,
    closedSections,
    crowdedAisles,
    hasPermission,
    waypoints,
    showLabels,
    followVehicle,
    hoveredBuildingId,
  });
  latestPropsRef.current = {
    effectiveTheme,
    startNode,
    goalNode,
    effectivePath,
    schedule,
    isSimulating,
    simSpeed,
    simObjectType,
    closedSections,
    crowdedAisles,
    hasPermission,
    waypoints,
    showLabels,
    followVehicle,
    hoveredBuildingId,
  };

  // Label DOM element refs for zero-React-rerender 60fps screen projection
  const buildingLabelRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const edgeLabelRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const clickableMeshesRef = useRef<THREE.Object3D[]>([]);

  // Camera transition state
  const camTransitionRef = useRef<{
    active: boolean;
    camPos: THREE.Vector3;
    target: THREE.Vector3;
  }>({
    active: true,
    camPos: DEFAULT_CAM_POS.clone(),
    target: DEFAULT_CAM_TARGET.clone(),
  });

  // References for dynamic scene subgraphs updated when props/theme change
  const sceneObjectsRef = useRef<{
    scene: THREE.Scene;
    renderer: THREE.WebGLRenderer;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    groundMesh: THREE.Mesh;
    groundDarkTex: THREE.CanvasTexture;
    groundLightTex: THREE.CanvasTexture;
    buildings: Map<string, BuildingHandles>;
    buildingGroup: THREE.Group;
    textures: ReturnType<typeof createCampusTextures>;
    routeGroup: THREE.Group;
    chevronMeshes: THREE.Mesh[];
    vehicleContainer: THREE.Group;
    currentVehicle: Vehicle3DHandles | null;
    currentVehicleType: SimObjectType | null;
    roadMaterials: {
      baseMat: THREE.MeshStandardMaterial;
      curbMat: THREE.MeshStandardMaterial;
      crowdMat: THREE.MeshStandardMaterial;
    };
    roadEdgeMeshes: Map<string, THREE.Mesh>;
    treeCanopyMat: THREE.MeshStandardMaterial;
    sunLight: THREE.DirectionalLight;
    hemiLight: THREE.HemisphereLight;
    plazaGroup: THREE.Group;
  } | null>(null);

  const handleResetCamera = useCallback(() => {
    setFollowVehicle(false);
    camTransitionRef.current = {
      active: true,
      camPos: DEFAULT_CAM_POS.clone(),
      target: DEFAULT_CAM_TARGET.clone(),
    };
  }, []);

  const handleFocusBuilding = useCallback((node: NodeData) => {
    setFollowVehicle(false);
    const { x, z } = graphToWorld(node.x, node.y);
    camTransitionRef.current = {
      active: true,
      camPos: new THREE.Vector3(x + 11, 14, z + 15),
      target: new THREE.Vector3(x, 2.5, z),
    };
  }, []);

  const handleToggleFullscreen = useCallback(async () => {
    const el = wrapperRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Safe no-op if iframe restricts fullscreen
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Build active path edge set for edge labels
  const activeEdgesList = useMemo(() => {
    const list: { key: string; midX: number; midZ: number; distance: number; isCrowded: boolean }[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < effectivePath.length - 1; i++) {
      const aId = effectivePath[i];
      const bId = effectivePath[i + 1];
      const u = LIBRARY_NODES[aId];
      const v = LIBRARY_NODES[bId];
      if (!u || !v) continue;
      const key = canonicalEdge(aId, bId);
      if (seen.has(key)) continue;
      seen.add(key);

      const existing = LIBRARY_EDGES.find((e) => canonicalEdge(e.source, e.target) === key);
      const dist = existing ? existing.distance : Math.max(1, Math.hypot(v.x - u.x, v.y - u.y));
      const a3 = graphToWorld(u.x, u.y);
      const b3 = graphToWorld(v.x, v.y);
      list.push({
        key,
        midX: (a3.x + b3.x) * 0.5,
        midZ: (a3.z + b3.z) * 0.5,
        distance: dist,
        isCrowded: crowdedAisles.has(key),
      });
    }
    return list;
  }, [effectivePath, crowdedAisles]);

  const activeEdgesRef = useRef(activeEdgesList);
  activeEdgesRef.current = activeEdgesList;

  // =========================================================================
  // MAIN THREE.JS INITIALIZATION & ANIMATION LOOP (Runs once on mount)
  // =========================================================================
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const isLightInit = latestPropsRef.current.effectiveTheme === 'light';

    // 1. Renderer Setup
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(mount.clientWidth, Math.max(mount.clientHeight, 1));
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    // 2. Scene & Procedural Studio Environment
    const scene = new THREE.Scene();
    const bgHex = isLightInit ? 0xeef3f8 : 0x060a13;
    scene.background = new THREE.Color(bgHex);
    scene.fog = new THREE.FogExp2(bgHex, 0.0082);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    // 3. Camera & Smooth OrbitControls (Start slightly elevated & transition cleanly)
    const camera = new THREE.PerspectiveCamera(
      45,
      mount.clientWidth / Math.max(mount.clientHeight, 1),
      0.5,
      320
    );
    camera.position.set(0, 62, 16); // Smooth fly-in from top-down 2D-like angle into 3D hero view
    camera.lookAt(DEFAULT_CAM_TARGET);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.065;
    controls.enableRotate = true;
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.screenSpacePanning = false; // Pan neatly across ground plane
    controls.minDistance = 12;
    controls.maxDistance = 115;
    controls.minPolarAngle = 0.12;
    controls.maxPolarAngle = Math.PI / 2 - 0.07;
    controls.target.copy(DEFAULT_CAM_TARGET);

    // Cancel scripted camera fly-to whenever the user grabs camera controls
    const onControlStart = () => {
      camTransitionRef.current.active = false;
      if (latestPropsRef.current.followVehicle) {
        setFollowVehicle(false);
      }
    };
    controls.addEventListener('start', onControlStart);

    // 4. Lighting Rig (Key Sun + Warm/Cool Hemisphere Fill)
    const hemiLight = new THREE.HemisphereLight(
      isLightInit ? 0xf8fafc : 0x38bdf8,
      isLightInit ? 0x94a3b8 : 0x090d16,
      isLightInit ? 0.95 : 0.72
    );
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(
      isLightInit ? 0xfffbeb : 0xd1fae5,
      isLightInit ? 1.55 : 1.35
    );
    sunLight.position.set(32, 48, 28);
    if (!isSoftwareGl) {
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.set(2048, 2048);
      sunLight.shadow.camera.near = 5;
      sunLight.shadow.camera.far = 150;
      const d = 48;
      sunLight.shadow.camera.left = -d;
      sunLight.shadow.camera.right = d;
      sunLight.shadow.camera.top = d;
      sunLight.shadow.camera.bottom = -d;
      sunLight.shadow.bias = -0.0005;
      sunLight.shadow.normalBias = 0.02;
    }
    scene.add(sunLight);

    // 5. Procedural Textures & Ground Campus Surface
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const textures = createCampusTextures(maxAniso);

    const groundGeo = new THREE.PlaneGeometry(240, 240);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      map: isLightInit ? textures.groundLight : textures.groundDark,
      roughness: 0.9,
      metalness: 0.05,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.position.y = 0;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // Campus Lawn Districts Underlay Rings / Courtyard Zones
    const plazaGroup = new THREE.Group();
    scene.add(plazaGroup);

    // 6. Road Network From Exact Graph Edges
    const roadGroup = new THREE.Group();
    scene.add(roadGroup);

    const roadBaseMat = new THREE.MeshStandardMaterial({
      map: textures.roadTex,
      color: isLightInit ? 0x94a3b8 : 0x475569,
      roughness: 0.78,
      metalness: 0.15,
    });
    const roadCurbMat = new THREE.MeshStandardMaterial({
      color: isLightInit ? 0xcbd5e1 : 0x1e293b,
      roughness: 0.85,
      metalness: 0.05,
    });
    const crowdMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xea580c,
      emissiveIntensity: 0.65,
      roughness: 0.4,
    });

    const roadEdgeMeshes = new Map<string, THREE.Mesh>();

    LIBRARY_EDGES.forEach((edge) => {
      const u = LIBRARY_NODES[edge.source];
      const v = LIBRARY_NODES[edge.target];
      if (!u || !v) return;
      const a = graphToWorld(u.x, u.y);
      const b = graphToWorld(v.x, v.y);
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const len = Math.hypot(dx, dz);
      const angle = Math.atan2(dx, dz);

      const segGroup = new THREE.Group();
      segGroup.position.set((a.x + b.x) * 0.5, 0, (a.z + b.z) * 0.5);
      segGroup.rotation.y = angle;

      // Sidewalk / Curb bed
      const curb = new THREE.Mesh(new THREE.BoxGeometry(2.85, 0.07, len), roadCurbMat);
      curb.position.y = 0.035;
      curb.receiveShadow = true;

      // Asphalt surface
      const roadTexClone = textures.roadTex.clone();
      roadTexClone.needsUpdate = true;
      roadTexClone.repeat.set(1, Math.max(1, len / 4));
      const segRoadMat = roadBaseMat.clone();
      segRoadMat.map = roadTexClone;

      const roadDeck = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.09, len), segRoadMat);
      roadDeck.position.y = 0.05;
      roadDeck.receiveShadow = true;

      const edgeKey = canonicalEdge(edge.source, edge.target);
      roadEdgeMeshes.set(edgeKey, roadDeck);

      segGroup.add(curb, roadDeck);
      roadGroup.add(segGroup);
    });

    // 7. Instanced Campus Trees (Avoiding all buildings & roads)
    const treeData = computeCampusTreePositions();
    const trunkGeo = new THREE.CylinderGeometry(0.14, 0.22, 1.4, 7);
    trunkGeo.translate(0, 0.7, 0);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
    const canopyGeo = new THREE.DodecahedronGeometry(1.05, 1);
    canopyGeo.translate(0, 2.2, 0);
    const treeCanopyMat = new THREE.MeshStandardMaterial({
      color: isLightInit ? 0x15803d : 0x065f46,
      roughness: 0.82,
      metalness: 0.05,
    });

    const trunksMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, treeData.length);
    const canopiesMesh = new THREE.InstancedMesh(canopyGeo, treeCanopyMat, treeData.length);
    trunksMesh.castShadow = !isSoftwareGl;
    canopiesMesh.castShadow = !isSoftwareGl;
    canopiesMesh.receiveShadow = true;

    const dummy = new THREE.Object3D();
    const tint = new THREE.Color();
    treeData.forEach((t, idx) => {
      dummy.position.set(t.x, 0, t.z);
      dummy.scale.set(t.scale, t.scale * (0.9 + (idx % 3) * 0.12), t.scale);
      dummy.rotation.y = (idx * 1.13) % (Math.PI * 2);
      dummy.updateMatrix();
      trunksMesh.setMatrixAt(idx, dummy.matrix);
      canopiesMesh.setMatrixAt(idx, dummy.matrix);

      tint.setHSL(0.39 + ((idx % 5) - 2) * 0.015, 0.55, isLightInit ? 0.36 : 0.26);
      canopiesMesh.setColorAt(idx, tint);
    });
    trunksMesh.instanceMatrix.needsUpdate = true;
    canopiesMesh.instanceMatrix.needsUpdate = true;
    if (canopiesMesh.instanceColor) canopiesMesh.instanceColor.needsUpdate = true;
    trunksMesh.computeBoundingSphere();
    canopiesMesh.computeBoundingSphere();
    scene.add(trunksMesh, canopiesMesh);

    // 8. Architectural Buildings Group
    const buildingGroup = new THREE.Group();
    scene.add(buildingGroup);
    const buildings = new Map<string, BuildingHandles>();
    const clickableMeshes: THREE.Object3D[] = [];

    Object.values(LIBRARY_NODES).forEach((node) => {
      const handle = buildCampusBuilding(node, textures, isLightInit);
      buildings.set(node.id, handle);
      buildingGroup.add(handle.group);
      clickableMeshes.push(handle.hitbox);
    });
    clickableMeshesRef.current = clickableMeshes;

    // 9. Active Route Ribbon & Animated Directional Chevrons Group
    const routeGroup = new THREE.Group();
    scene.add(routeGroup);

    // 10. Simulation Actor Vehicle Container
    const vehicleContainer = new THREE.Group();
    scene.add(vehicleContainer);

    sceneObjectsRef.current = {
      scene,
      renderer,
      camera,
      controls,
      groundMesh,
      groundDarkTex: textures.groundDark,
      groundLightTex: textures.groundLight,
      buildings,
      buildingGroup,
      textures,
      routeGroup,
      chevronMeshes: [],
      vehicleContainer,
      currentVehicle: null,
      currentVehicleType: null,
      roadMaterials: {
        baseMat: roadBaseMat,
        curbMat: roadCurbMat,
        crowdMat,
      },
      roadEdgeMeshes,
      treeCanopyMat,
      sunLight,
      hemiLight,
      plazaGroup,
    };

    // 11. Raycasting for Building Click, Double-Click Focus, Hover
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };
    let lastMoveCheck = 0;

    const getHitNodeId = (e: MouseEvent): string | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(clickableMeshesRef.current, false);
      if (hits.length > 0) {
        return (hits[0].object.userData.nodeId as string) || null;
      }
      return null;
    };

    const handlePointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const handleClick = (e: MouseEvent) => {
      const dragDist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dragDist > 6) return; // Ignore orbit drags
      const hitId = getHitNodeId(e);
      if (hitId && LIBRARY_NODES[hitId]) {
        setSelectedBuilding(LIBRARY_NODES[hitId]);
      } else {
        setSelectedBuilding(null);
      }
    };

    const handleDblClick = (e: MouseEvent) => {
      const hitId = getHitNodeId(e);
      if (hitId && LIBRARY_NODES[hitId]) {
        const node = LIBRARY_NODES[hitId];
        setSelectedBuilding(node);
        handleFocusBuilding(node);
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastMoveCheck < 50) return;
      lastMoveCheck = now;
      const hitId = getHitNodeId(e);
      renderer.domElement.style.cursor = hitId ? 'pointer' : 'grab';
      if (hitId !== latestPropsRef.current.hoveredBuildingId) {
        setHoveredBuildingId(hitId);
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('click', handleClick);
    renderer.domElement.addEventListener('dblclick', handleDblClick);
    renderer.domElement.addEventListener('pointermove', handlePointerMove);

    // 12. Responsive ResizeObserver
    const handleResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = Math.max(mount.clientHeight, 1);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(mount);

    // 13. Pre-warm shaders when hardware GPU is available
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // 14. Master Animation Loop
    let animId = 0;
    let lastTime = performance.now();
    let elapsedTotal = 0;
    let currentYaw = 0;
    let yawInitialized = false;

    const animate = (now: number) => {
      animId = requestAnimationFrame(animate);
      if (document.hidden) return;

      const delta = Math.min(0.08, (now - lastTime) / 1000);
      lastTime = now;
      elapsedTotal += delta;

      const state = latestPropsRef.current;
      const sceneObj = sceneObjectsRef.current;
      if (!sceneObj) return;

      // A. Update Synchronized 3D Vehicle Pose from Shared progressRef.current
      const pose = evaluateVehicleAtProgress(
        state.schedule,
        state.effectivePath,
        progressRef.current,
        state.startNode,
        state.goalNode
      );
      const vPos = graphToWorld(pose.worldX, pose.worldY);
      sceneObj.vehicleContainer.position.set(
        vPos.x,
        state.simObjectType === 'pointer' ? Math.sin(elapsedTotal * 3.5) * 0.14 : 0,
        vPos.z
      );

      // Compute Three.js Y-rotation angle for vehicle facing (+Z local axis -> direction vector)
      if (state.schedule.segments.length > 0) {
        const seg = state.schedule.segments[pose.activeSegmentIndex];
        const p1 = graphToWorld(seg.x1, seg.y1);
        const p2 = graphToWorld(seg.x2, seg.y2);
        const targetYaw = Math.atan2(p2.x - p1.x, p2.z - p1.z);

        if (!yawInitialized) {
          currentYaw = targetYaw;
          yawInitialized = true;
        } else {
          // Shortest angular delta + exponential damping for natural cornering
          const diff = Math.atan2(Math.sin(targetYaw - currentYaw), Math.cos(targetYaw - currentYaw));
          currentYaw += diff * (1 - Math.exp(-12 * delta));
        }
        sceneObj.vehicleContainer.rotation.y = currentYaw;
      }

      // Spin wheels & lidar when actively simulating
      if (sceneObj.currentVehicle) {
        if (state.isSimulating) {
          const wheelStep = delta * 8.5 * state.simSpeed;
          sceneObj.currentVehicle.wheels.forEach((w) => {
            w.rotation.x += wheelStep;
          });
        }
        if (sceneObj.currentVehicle.lidarMesh) {
          sceneObj.currentVehicle.lidarMesh.rotation.y += delta * 3.0;
        }
      }

      // B. Animate Directional Route Chevrons & Start/Goal Beacons
      sceneObj.chevronMeshes.forEach((chev, idx) => {
        const phase = (elapsedTotal * 2.4 - idx * 0.28) % 1;
        const pulse = 0.45 + 0.55 * Math.max(0, Math.sin(phase * Math.PI * 2));
        const mat = chev.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.35 + pulse * 0.65;
      });

      sceneObj.buildings.forEach((b, nodeId) => {
        if (nodeId === state.startNode || nodeId === state.goalNode || state.waypoints.includes(nodeId)) {
          b.beaconGlow.rotation.z = elapsedTotal * 0.9;
          const s = 1 + Math.sin(elapsedTotal * 2.5) * 0.06;
          b.beaconGlow.scale.set(s, s, 1);
        }
      });

      // C. Smooth Camera Transitions (Hero Fly-In / Building Focus / Follow Vehicle)
      if (state.followVehicle && state.schedule.segments.length > 0) {
        _targetLook.set(vPos.x, 1.5, vPos.z);
        _targetCamPos.set(
          vPos.x - Math.sin(currentYaw) * 16,
          12.5,
          vPos.z - Math.cos(currentYaw) * 16
        );
        controls.target.x = THREE.MathUtils.damp(controls.target.x, _targetLook.x, 4.5, delta);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, _targetLook.y, 4.5, delta);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, _targetLook.z, 4.5, delta);
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _targetCamPos.x, 3.5, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _targetCamPos.y, 3.5, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _targetCamPos.z, 3.5, delta);
      } else if (camTransitionRef.current.active) {
        const { camPos, target } = camTransitionRef.current;
        camera.position.x = THREE.MathUtils.damp(camera.position.x, camPos.x, 4.5, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, camPos.y, 4.5, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, camPos.z, 4.5, delta);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, target.x, 5.0, delta);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, target.y, 5.0, delta);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, target.z, 5.0, delta);

        if (camera.position.distanceTo(camPos) < 0.08 && controls.target.distanceTo(target) < 0.08) {
          camTransitionRef.current.active = false;
        }
      }

      controls.update();
      renderer.render(scene, camera);

      // D. Project Crisp 2D HTML Labels directly via DOM Refs (zero React re-renders)
      const canvasW = mount.clientWidth;
      const canvasH = mount.clientHeight;
      if (state.showLabels && canvasW > 0 && canvasH > 0) {
        sceneObj.buildings.forEach((b, nodeId) => {
          const el = buildingLabelRefs.current[nodeId];
          if (!el) return;
          _projVec.set(b.group.position.x, b.labelHeight + 0.6, b.group.position.z);
          _projVec.project(camera);
          if (_projVec.z > 1 || _projVec.z < -1) {
            el.style.opacity = '0';
            return;
          }
          const sx = (_projVec.x * 0.5 + 0.5) * canvasW;
          const sy = (-_projVec.y * 0.5 + 0.5) * canvasH;
          if (sx < -60 || sx > canvasW + 60 || sy < -30 || sy > canvasH + 30) {
            el.style.opacity = '0';
          } else {
            el.style.opacity = '1';
            el.style.transform = `translate3d(${sx}px, ${sy}px, 0) translate(-50%, -100%)`;
          }
        });

        activeEdgesRef.current.forEach((edge) => {
          const el = edgeLabelRefs.current[edge.key];
          if (!el) return;
          _projVec.set(edge.midX, 0.9, edge.midZ);
          _projVec.project(camera);
          if (_projVec.z > 1 || _projVec.z < -1) {
            el.style.opacity = '0';
            return;
          }
          const sx = (_projVec.x * 0.5 + 0.5) * canvasW;
          const sy = (-_projVec.y * 0.5 + 0.5) * canvasH;
          el.style.opacity = '1';
          el.style.transform = `translate3d(${sx}px, ${sy}px, 0) translate(-50%, -50%)`;
        });
      }
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      controls.removeEventListener('start', onControlStart);
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('click', handleClick);
      renderer.domElement.removeEventListener('dblclick', handleDblClick);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.Points) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material?.dispose();
          }
        }
      });
      Object.values(textures).forEach((t) => t.dispose());
      envTex.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      sceneObjectsRef.current = null;
    };
  }, [handleFocusBuilding, progressRef]);

  // =========================================================================
  // SYNC VEHICLE MODEL WHEN simObjectType CHANGES ('car' | 'pointer' | 'cart')
  // =========================================================================
  useEffect(() => {
    const sceneObj = sceneObjectsRef.current;
    if (!sceneObj) return;
    if (sceneObj.currentVehicleType === simObjectType && sceneObj.currentVehicle) return;

    while (sceneObj.vehicleContainer.children.length > 0) {
      const child = sceneObj.vehicleContainer.children[0];
      child.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry?.dispose();
          if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
          else o.material?.dispose();
        }
      });
      sceneObj.vehicleContainer.remove(child);
    }

    const vHandles = buildVehicle3D(simObjectType);
    sceneObj.vehicleContainer.add(vHandles.root);
    sceneObj.currentVehicle = vHandles;
    sceneObj.currentVehicleType = simObjectType;
  }, [simObjectType]);

  // =========================================================================
  // SYNC THEME COLORS IN-PLACE (Light / Dark) WITHOUT RESETTING CAMERA
  // =========================================================================
  useEffect(() => {
    const sceneObj = sceneObjectsRef.current;
    if (!sceneObj) return;

    const isLight = effectiveTheme === 'light';
    const bgHex = isLight ? 0xeef3f8 : 0x060a13;
    sceneObj.scene.background = new THREE.Color(bgHex);
    sceneObj.scene.fog = new THREE.FogExp2(bgHex, 0.0082);

    const groundMat = sceneObj.groundMesh.material as THREE.MeshStandardMaterial;
    groundMat.map = isLight ? sceneObj.groundLightTex : sceneObj.groundDarkTex;
    groundMat.needsUpdate = true;

    sceneObj.hemiLight.color.setHex(isLight ? 0xf8fafc : 0x38bdf8);
    sceneObj.hemiLight.groundColor.setHex(isLight ? 0x94a3b8 : 0x090d16);
    sceneObj.hemiLight.intensity = isLight ? 0.95 : 0.72;

    sceneObj.sunLight.color.setHex(isLight ? 0xfffbeb : 0xd1fae5);
    sceneObj.sunLight.intensity = isLight ? 1.55 : 1.35;

    sceneObj.treeCanopyMat.color.setHex(isLight ? 0x15803d : 0x065f46);

    // Rebuild buildings seamlessly with theme glazing/stone materials
    sceneObj.buildings.forEach((oldB) => {
      sceneObj.buildingGroup.remove(oldB.group);
      oldB.group.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry?.dispose();
          if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
          else o.material?.dispose();
        }
      });
    });
    sceneObj.buildings.clear();

    const nextClickables: THREE.Object3D[] = [];
    Object.values(LIBRARY_NODES).forEach((node) => {
      const handle = buildCampusBuilding(node, sceneObj.textures, isLight);
      sceneObj.buildings.set(node.id, handle);
      sceneObj.buildingGroup.add(handle.group);
      nextClickables.push(handle.hitbox);
    });
    clickableMeshesRef.current = nextClickables;
  }, [effectiveTheme]);

  // =========================================================================
  // SYNC BUILDING STATUS BEACONS, CONGESTED ROADS & ACTIVE ROUTE RIBBON
  // =========================================================================
  useEffect(() => {
    const sceneObj = sceneObjectsRef.current;
    if (!sceneObj) return;

    const isLight = effectiveTheme === 'light';

    // 1. Update Building Ring & Beacon States (Start / Goal / Waypoint / Closed / Hover)
    sceneObj.buildings.forEach((b, nodeId) => {
      const isStart = nodeId === startNode;
      const isGoal = nodeId === goalNode;
      const isWaypoint = waypoints.includes(nodeId);
      const isClosed = closedSections.has(nodeId);
      const isHovered = nodeId === hoveredBuildingId;

      if (isClosed) {
        b.statusLightMat.color.setHex(0xe11d48);
        b.statusLightMat.emissive.setHex(0xe11d48);
        b.statusLightMat.emissiveIntensity = 1.1;
        b.beaconGlow.visible = true;
      } else if (isStart) {
        b.statusLightMat.color.setHex(0x10b981);
        b.statusLightMat.emissive.setHex(0x10b981);
        b.statusLightMat.emissiveIntensity = 1.25;
        b.beaconGlow.visible = true;
      } else if (isGoal) {
        b.statusLightMat.color.setHex(0xf59e0b);
        b.statusLightMat.emissive.setHex(0xf59e0b);
        b.statusLightMat.emissiveIntensity = 1.25;
        b.beaconGlow.visible = true;
      } else if (isWaypoint) {
        b.statusLightMat.color.setHex(0x0ea5e9);
        b.statusLightMat.emissive.setHex(0x0284c7);
        b.statusLightMat.emissiveIntensity = 1.05;
        b.beaconGlow.visible = true;
      } else if (isHovered) {
        b.statusLightMat.color.setHex(0x34d399);
        b.statusLightMat.emissive.setHex(0x10b981);
        b.statusLightMat.emissiveIntensity = 0.9;
        b.beaconGlow.visible = false;
      } else {
        b.statusLightMat.emissiveIntensity = isLight ? 0.15 : 0.35;
        b.beaconGlow.visible = false;
      }
    });

    // 2. Highlight Crowded Road Segments directly on Road Deck
    sceneObj.roadEdgeMeshes.forEach((roadMesh, key) => {
      const mat = roadMesh.material as THREE.MeshStandardMaterial;
      if (crowdedAisles.has(key)) {
        mat.color.setHex(0xf97316);
        mat.emissive.setHex(0xc2410c);
        mat.emissiveIntensity = 0.65;
      } else {
        mat.color.setHex(isLight ? 0x94a3b8 : 0x475569);
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0;
      }
    });

    // 3. Rebuild Glowing Route Ribbon & Directional Road Chevrons along effectivePath
    while (sceneObj.routeGroup.children.length > 0) {
      const child = sceneObj.routeGroup.children[0];
      child.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry?.dispose();
          if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
          else o.material?.dispose();
        }
      });
      sceneObj.routeGroup.remove(child);
    }
    sceneObj.chevronMeshes = [];

    if (effectivePath.length >= 2) {
      const pts: THREE.Vector3[] = [];
      effectivePath.forEach((nodeId) => {
        const n = LIBRARY_NODES[nodeId];
        if (n) {
          const p = graphToWorld(n.x, n.y);
          pts.push(new THREE.Vector3(p.x, 0.24, p.z));
        }
      });

      if (pts.length >= 2) {
        const routeCurve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.08);
        const tubeGeo = new THREE.TubeGeometry(routeCurve, Math.max(24, pts.length * 16), 0.22, 8, false);
        const tubeMat = new THREE.MeshStandardMaterial({
          color: isLight ? 0x059669 : 0x34d399,
          emissive: isLight ? 0x059669 : 0x10b981,
          emissiveIntensity: isLight ? 0.55 : 1.35,
          roughness: 0.2,
          metalness: 0.3,
        });
        const ribbon = new THREE.Mesh(tubeGeo, tubeMat);
        sceneObj.routeGroup.add(ribbon);

        // Directional Arrowhead Chevrons spaced evenly along every segment
        const chevGeo = new THREE.ConeGeometry(0.42, 0.9, 3);
        chevGeo.rotateX(Math.PI / 2);

        for (let i = 0; i < pts.length - 1; i++) {
          const a = pts[i];
          const b = pts[i + 1];
          const segLen = a.distanceTo(b);
          const count = Math.max(1, Math.floor(segLen / 5.5));
          const yaw = Math.atan2(b.x - a.x, b.z - a.z);

          for (let c = 1; c <= count; c++) {
            const t = c / (count + 1);
            const chevMat = new THREE.MeshBasicMaterial({
              color: isLight ? 0x047857 : 0x6ee7b7,
              transparent: true,
              opacity: 0.85,
            });
            const chev = new THREE.Mesh(chevGeo, chevMat);
            chev.position.lerpVectors(a, b, t);
            chev.position.y = 0.42;
            chev.rotation.y = yaw;
            sceneObj.routeGroup.add(chev);
            sceneObj.chevronMeshes.push(chev);
          }
        }
      }
    }
  }, [
    effectiveTheme,
    startNode,
    goalNode,
    waypoints,
    closedSections,
    crowdedAisles,
    effectivePath,
    hoveredBuildingId,
  ]);

  return (
    <div
      ref={wrapperRef}
      className={`relative w-full overflow-hidden select-none ${
        isFullscreen ? 'h-screen bg-slate-50 dark:bg-[#060A13]' : 'h-[520px] sm:h-[580px]'
      }`}
    >
      {/* Isolated WebGL Canvas Container */}
      <div ref={canvasMountRef} className="w-full h-full" />

      {/* Projected Building & Route Distance Labels Layer */}
      {showLabels && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
          {Object.values(LIBRARY_NODES).map((node) => {
            const isStart = node.id === startNode;
            const isGoal = node.id === goalNode;
            const isClosed = closedSections.has(node.id);
            const isWaypoint = waypoints.includes(node.id);
            return (
              <div
                key={node.id}
                ref={(el) => {
                  buildingLabelRefs.current[node.id] = el;
                }}
                style={{ opacity: 0, left: 0, top: 0 }}
                className={`absolute px-2 py-0.5 rounded-md border text-[10px] font-display font-semibold whitespace-nowrap shadow-md transition-colors ${
                  isClosed
                    ? 'bg-rose-50/95 dark:bg-rose-950/90 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-500/50'
                    : isStart
                    ? 'bg-emerald-50/95 dark:bg-emerald-950/95 text-emerald-900 dark:text-emerald-200 border-emerald-400 dark:border-emerald-400/60'
                    : isGoal
                    ? 'bg-amber-50/95 dark:bg-amber-950/95 text-amber-900 dark:text-amber-200 border-amber-400 dark:border-amber-400/60'
                    : isWaypoint
                    ? 'bg-sky-50/95 dark:bg-sky-950/90 text-sky-900 dark:text-sky-200 border-sky-300 dark:border-sky-400/50'
                    : 'bg-white/90 dark:bg-[#0B101C]/90 text-slate-900 dark:text-slate-100 border-slate-300/90 dark:border-slate-700/80'
                }`}
              >
                {isStart ? 'START · ' : isGoal ? 'GOAL · ' : isClosed ? 'CLOSED · ' : ''}
                {node.name}
              </div>
            );
          })}

          {activeEdgesList.map((edge) => {
            const effDist = edge.isCrowded ? edge.distance * CROWD_MULTIPLIER : edge.distance;
            const timeSec = Math.round(effDist / WALKING_SPEED_MPS);
            return (
              <div
                key={edge.key}
                ref={(el) => {
                  edgeLabelRefs.current[edge.key] = el;
                }}
                style={{ opacity: 0, left: 0, top: 0 }}
                className={`absolute px-1.5 py-0.5 rounded font-mono text-[9px] font-bold border shadow-sm whitespace-nowrap ${
                  edge.isCrowded
                    ? 'bg-amber-100/95 dark:bg-amber-950/95 text-amber-900 dark:text-amber-200 border-amber-400 dark:border-amber-600'
                    : 'bg-emerald-50/95 dark:bg-[#052e16]/95 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-600/60'
                }`}
              >
                {edge.distance}m · {timeSec}s{edge.isCrowded ? ' (2.5×)' : ''}
              </div>
            );
          })}
        </div>
      )}

      {/* Top-Right Compact 3D Camera & Viewport Controls */}
      <div className="absolute top-3 right-3 z-20 flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setFollowVehicle((v) => !v)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-medium border shadow-md transition-colors cursor-pointer ${
            followVehicle
              ? 'bg-emerald-600 text-white border-emerald-500'
              : 'bg-white/95 dark:bg-[#0D1321]/95 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-[#131B2E]'
          }`}
          title="Track moving vehicle with camera"
        >
          <Car className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{followVehicle ? 'Following' : 'Follow Car'}</span>
        </button>

        <button
          onClick={() => setShowLabels((v) => !v)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-medium border shadow-md transition-colors cursor-pointer ${
            showLabels
              ? 'bg-white/95 dark:bg-[#0D1321]/95 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/60'
              : 'bg-white/95 dark:bg-[#0D1321]/95 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
          }`}
          title="Toggle 3D building and distance labels"
        >
          <Tag className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Labels</span>
        </button>

        <button
          onClick={handleResetCamera}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-medium bg-white/95 dark:bg-[#0D1321]/95 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-[#131B2E] shadow-md transition-colors cursor-pointer"
          title="Reset 3D camera overview"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reset Camera</span>
        </button>

        <button
          onClick={handleToggleFullscreen}
          className="p-1.5 rounded-lg bg-white/95 dark:bg-[#0D1321]/95 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-[#131B2E] shadow-md transition-colors cursor-pointer"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Bottom-Right Interactive Hint */}
      <div className="hidden md:flex absolute bottom-3 right-3 z-20 items-center gap-2 px-3 py-1.5 rounded-lg bg-white/90 dark:bg-[#0D1321]/90 border border-slate-200 dark:border-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-400 shadow-sm pointer-events-none">
        <span>Drag: Rotate</span>
        <span>·</span>
        <span>Right-Drag: Pan</span>
        <span>·</span>
        <span>Scroll: Zoom</span>
        <span>·</span>
        <span>Dbl-Click Building: Focus</span>
      </div>

      {/* Selected Building Info Card */}
      {selectedBuilding && (
        <div className="absolute bottom-3 left-3 z-20 max-w-xs sm:max-w-sm p-4 rounded-xl bg-white/95 dark:bg-[#0D1321]/95 border border-slate-200 dark:border-slate-700 shadow-2xl text-xs space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-bold text-slate-900 dark:text-slate-100 font-display text-sm flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{selectedBuilding.name}</span>
              </div>
              <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                {selectedBuilding.department} · ({selectedBuilding.x}, {selectedBuilding.y})
              </div>
            </div>
            <button
              onClick={() => setSelectedBuilding(null)}
              className="p-1 rounded-md text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              title="Close card"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
            {selectedBuilding.description}
          </p>

          {selectedBuilding.restricted && (
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-1 rounded border border-amber-200 dark:border-amber-800/50">
              <Lock className="w-3 h-3" />
              <span>{hasPermission ? 'Clearance Active' : 'Restricted Wing — Requires Clearance'}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => onSelectNode(selectedBuilding.id)}
              className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-[11px] font-semibold cursor-pointer transition-colors"
            >
              <Navigation className="w-3 h-3" />
              <span>Set Destination</span>
            </button>
            <button
              onClick={() => handleFocusBuilding(selectedBuilding)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-mono text-[11px] cursor-pointer transition-colors"
            >
              <Compass className="w-3 h-3" />
              <span>Focus</span>
            </button>
            <button
              onClick={() => onToggleClosed(selectedBuilding.id)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-mono text-[11px] border cursor-pointer transition-colors ${
                closedSections.has(selectedBuilding.id)
                  ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                  : 'bg-rose-50 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700'
              }`}
            >
              <ShieldAlert className="w-3 h-3" />
              <span>{closedSections.has(selectedBuilding.id) ? 'Re-open' : 'Close Wing'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
