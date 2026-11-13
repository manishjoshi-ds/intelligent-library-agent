/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  LIBRARY_NODES,
  LIBRARY_EDGES,
  NodeData,
  WALKING_SPEED_MPS,
  CROWD_MULTIPLIER,
} from '../types';
import { canonicalEdge } from '../searchEngine';
import { useTheme } from '../context/ThemeContext';
import {
  MapViewMode,
  SimObjectType,
  buildRouteSchedule,
  evaluateVehicleAtProgress,
} from '../simulation/routeSimulation';
import { LibraryCity3D } from './LibraryCity3D';
import {
  ShieldAlert,
  CheckCircle2,
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Repeat,
  Bot,
  Navigation,
  Route,
  ChevronDown,
  ChevronUp,
  Plus,
  PlusCircle,
  MinusCircle,
  Car,
  Map as MapIcon,
  Building2,
  X,
  AlertTriangle,
} from 'lucide-react';

interface FloorplanCanvasProps {
  startNode: string;
  goalNode: string;
  activePath: string[];
  currentAgentNode?: string;
  closedSections: Set<string>;
  crowdedAisles: Set<string>;
  hasPermission: boolean;
  onSelectNode: (nodeId: string) => void;
  onToggleClosed: (nodeId: string) => void;
  onToggleCrowded: (edgeKey: string) => void;
  waypoints?: string[];
}

export const FloorplanCanvas: React.FC<FloorplanCanvasProps> = ({
  startNode,
  goalNode,
  activePath,
  currentAgentNode,
  closedSections,
  crowdedAisles,
  hasPermission,
  onSelectNode,
  onToggleClosed,
  onToggleCrowded,
  waypoints = [],
}) => {
  const { effectiveTheme } = useTheme();
  const isLight = effectiveTheme === 'light';
  const [hoveredNode, setHoveredNode] = useState<NodeData | null>(null);

  // View Mode (2D Blueprint vs 3D City View)
  const [viewMode, setViewMode] = useState<MapViewMode>('2d');

  // Simulation State
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simProgress, setSimProgress] = useState<number>(0); // 0.0 to 1.0
  const [simSpeed, setSimSpeed] = useState<number>(1.0); // 0.5, 1.0, 2.0, 4.0
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [activePickupToast, setActivePickupToast] = useState<string | null>(null);
  const [completionBanner, setCompletionBanner] = useState<{
    destination: string;
    distance: number;
    timeSec: number;
  } | null>(null);
  const [isPathTableOpen, setIsPathTableOpen] = useState<boolean>(false);
  const [nodeToAdd, setNodeToAdd] = useState<string>('Information_Desk');
  const [simObjectType, setSimObjectType] = useState<SimObjectType>('car');

  // Authoritative progress ref shared in real time between 2D SVG and 3D WebGL
  const progressRef = useRef<number>(0);
  const isLoopingRef = useRef<boolean>(isLooping);
  isLoopingRef.current = isLooping;
  const simSpeedRef = useRef<number>(simSpeed);
  simSpeedRef.current = simSpeed;

  // SVG coordinate transformation
  // Domain: X in [-4, 42], Y in [-8, 36]
  const svgWidth = 860;
  const svgHeight = 560;
  const paddingX = 70;
  const paddingY = 60;

  const minX = -3;
  const maxX = 42;
  const minY = -7;
  const maxY = 35;

  const scaleX = (x: number) => paddingX + ((x - minX) / (maxX - minX)) * (svgWidth - 2 * paddingX);
  // SVG coordinates have Y increasing downwards; in our cartesian library layout, positive Y is north/up.
  const scaleY = (y: number) => svgHeight - paddingY - ((y - minY) / (maxY - minY)) * (svgHeight - 2 * paddingY);

  // Effective path to simulate (active path or fallback start -> goal)
  const effectivePath = useMemo(() => {
    if (activePath && activePath.length >= 2) return activePath;
    if (startNode && goalNode && startNode !== goalNode) return [startNode, goalNode];
    return ['Entrance', 'Information_Desk', 'Study_Commons', 'Computer_Science'];
  }, [activePath, startNode, goalNode]);

  // Build active path edges set for fast lookup
  const activePathEdges = useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i < effectivePath.length - 1; i++) {
      set.add(canonicalEdge(effectivePath[i], effectivePath[i + 1]));
    }
    return set;
  }, [effectivePath]);

  // Zone regions for floorplan zoning underlay
  const zoneRegions = [
    {
      name: 'Special Archives (Restricted)',
      color: isLight ? 'rgba(244, 63, 94, 0.06)' : 'rgba(244, 63, 94, 0.04)',
      border: isLight ? 'rgba(225, 29, 72, 0.35)' : 'rgba(244, 63, 94, 0.2)',
      x: 30,
      y: 22,
      w: 12,
      h: 14,
    },
    {
      name: 'STEM & AI Laboratories',
      color: isLight ? 'rgba(14, 165, 233, 0.06)' : 'rgba(56, 189, 248, 0.04)',
      border: isLight ? 'rgba(2, 132, 199, 0.3)' : 'rgba(56, 189, 248, 0.15)',
      x: 21,
      y: 7,
      w: 18,
      h: 16,
    },
    {
      name: 'Humanities & Classical Literature',
      color: isLight ? 'rgba(245, 158, 11, 0.07)' : 'rgba(251, 191, 36, 0.04)',
      border: isLight ? 'rgba(217, 119, 6, 0.3)' : 'rgba(251, 191, 36, 0.15)',
      x: 0,
      y: 14,
      w: 18,
      h: 20,
    },
    {
      name: 'Circulation & Entry Concourse',
      color: isLight ? 'rgba(16, 185, 129, 0.06)' : 'rgba(16, 185, 129, 0.04)',
      border: isLight ? 'rgba(5, 150, 105, 0.3)' : 'rgba(16, 185, 129, 0.15)',
      x: -2,
      y: -6,
      w: 16,
      h: 14,
    },
  ];

  // Shared authoritative route schedule factoring in real edge distances and 2.5x crowd weights
  const schedule = useMemo(
    () => buildRouteSchedule(effectivePath, crowdedAisles),
    [effectivePath, crowdedAisles]
  );

  // Automatically reset vehicle progress cleanly to the start when the route sequence changes
  const pathKey = effectivePath.join('->');
  const prevPathKeyRef = useRef<string>(pathKey);
  useEffect(() => {
    if (prevPathKeyRef.current !== pathKey) {
      prevPathKeyRef.current = pathKey;
      progressRef.current = 0;
      setSimProgress(0);
      setCompletionBanner(null);
    }
  }, [pathKey]);

  // Auto-dismiss arrival banner after 6.5 seconds
  useEffect(() => {
    if (!completionBanner) return;
    const t = setTimeout(() => setCompletionBanner(null), 6500);
    return () => clearTimeout(t);
  }, [completionBanner]);

  // Master Simulation Animation Loop via requestAnimationFrame (drives both 2D and 3D)
  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    if (!isSimulating || schedule.segments.length === 0 || schedule.totalEffectiveDist <= 0) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    lastTimeRef.current = performance.now();

    const loop = (time: number) => {
      const deltaSec = Math.min(0.1, (time - lastTimeRef.current) / 1000);
      lastTimeRef.current = time;

      // Physical walking speed = WALKING_SPEED_MPS (1.2 m/s), scaled 3.5x for responsive visual pacing
      const metersAdvanced = WALKING_SPEED_MPS * 3.5 * simSpeedRef.current * deltaSec;
      const progressDelta = metersAdvanced / schedule.totalEffectiveDist;
      const next = progressRef.current + progressDelta;

      if (next >= 1) {
        if (isLoopingRef.current) {
          progressRef.current = 0;
          setSimProgress(0);
          animRef.current = requestAnimationFrame(loop);
        } else {
          progressRef.current = 1;
          setSimProgress(1);
          setIsSimulating(false);
          const destId = effectivePath[effectivePath.length - 1] || goalNode;
          const destName = LIBRARY_NODES[destId]?.name || destId;
          setCompletionBanner({
            destination: destName,
            distance: Math.round(schedule.totalBaseDist),
            timeSec: Math.round(schedule.totalDurationSec),
          });
        }
        return;
      }

      progressRef.current = next;
      setSimProgress(next);
      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isSimulating, schedule, effectivePath, goalNode]);

  // Continuous Interpolated Agent Pose from authoritative schedule & simProgress
  const simPose = useMemo(
    () => evaluateVehicleAtProgress(schedule, effectivePath, simProgress, startNode, goalNode),
    [schedule, effectivePath, simProgress, startNode, goalNode]
  );

  // Project Cartesian pose to SVG pixel space & true edge heading angle
  const svgAgentPos = useMemo(() => {
    const svgX = scaleX(simPose.worldX);
    const svgY = scaleY(simPose.worldY);
    let headingDeg = 0;
    if (schedule.segments.length > 0) {
      const seg = schedule.segments[simPose.activeSegmentIndex];
      const dxSvg = scaleX(seg.x2) - scaleX(seg.x1);
      const dySvg = scaleY(seg.y2) - scaleY(seg.y1);
      headingDeg = Math.atan2(dySvg, dxSvg) * (180 / Math.PI);
    }
    return {
      x: svgX,
      y: svgY,
      heading: headingDeg,
    };
  }, [simPose, schedule]);

  // Waypoint Pickup Toast Trigger
  useEffect(() => {
    const currentNode = simPose.currentTo;
    if (waypoints.includes(currentNode) && simPose.visitedNodeIds.has(currentNode)) {
      setActivePickupToast(`Shelf reached: ${LIBRARY_NODES[currentNode]?.name || currentNode}`);
      const t = setTimeout(() => setActivePickupToast(null), 2500);
      return () => clearTimeout(t);
    }
  }, [simPose.currentTo, simPose.visitedNodeIds, waypoints]);

  // Simulation Controls Handlers
  const handleTogglePlay = () => {
    setCompletionBanner(null);
    if (!isSimulating && progressRef.current >= 0.999) {
      progressRef.current = 0;
      setSimProgress(0);
    }
    setIsSimulating((prev) => !prev);
  };

  const handleReset = () => {
    setIsSimulating(false);
    setCompletionBanner(null);
    progressRef.current = 0;
    setSimProgress(0);
  };

  const handleStepBack = () => {
    setIsSimulating(false);
    setCompletionBanner(null);
    const totalSegs = schedule.segments.length;
    if (totalSegs === 0 || schedule.totalEffectiveDist <= 0) return;
    const currentIdx = simPose.activeSegmentIndex;
    const prevIdx = simPose.segmentProgress > 0.15 ? currentIdx : Math.max(0, currentIdx - 1);
    const nextProg = schedule.segments[prevIdx].cumStartDist / schedule.totalEffectiveDist;
    progressRef.current = nextProg;
    setSimProgress(nextProg);
  };

  const handleStepForward = () => {
    setIsSimulating(false);
    setCompletionBanner(null);
    const totalSegs = schedule.segments.length;
    if (totalSegs === 0 || schedule.totalEffectiveDist <= 0) return;
    const currentIdx = simPose.activeSegmentIndex;
    const nextIdx = Math.min(totalSegs - 1, currentIdx + (simPose.segmentProgress > 0.85 ? 1 : 0));
    const nextProg = schedule.segments[nextIdx].cumEndDist / schedule.totalEffectiveDist;
    progressRef.current = nextProg;
    setSimProgress(nextProg);
  };

  return (
    <div className="relative flex flex-col bg-white dark:bg-[#0D1321] rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xl dark:shadow-2xl overflow-hidden">
      {/* Floorplan Header / Top Cartography Deck Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-50 dark:bg-[#0A0E17] border-b border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_8px_#34d399]" />
          <span className="font-semibold text-slate-900 dark:text-slate-200 font-display uppercase tracking-wider text-[11px]">
            Architectural Cartography Deck
          </span>
          <span className="text-slate-400 dark:text-slate-500">·</span>
          <span className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">Level 2 Central Library</span>
          <span className="text-slate-400 dark:text-slate-500">·</span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-mono text-[10px] font-semibold">
            {simObjectType === 'car' ? (
              <Car className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            ) : simObjectType === 'pointer' ? (
              <Navigation className="w-3 h-3 text-sky-600 dark:text-sky-400" />
            ) : (
              <Bot className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            )}
            <span>
              {isSimulating ? 'SIMULATING' : 'STANDBY'}:{' '}
              {simObjectType === 'car' ? 'AGV CAR' : simObjectType === 'pointer' ? 'NAV POINTER' : 'BOOK BOT'}
            </span>
          </span>
        </div>

        {/* Right Side: Legend + Top-Right 2D / 3D View Switch */}
        <div className="flex flex-wrap items-center gap-3 ml-auto">
          <div className="hidden xl:flex flex-wrap items-center gap-3 font-mono text-[11px] text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 ring-2 ring-emerald-500/20" /> Start
            </span>
            <span className="text-slate-400 dark:text-slate-600">·</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-400 ring-2 ring-amber-500/20" /> Goal / Waypoint
            </span>
            <span className="text-slate-400 dark:text-slate-600">·</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 dark:bg-rose-400 ring-2 ring-rose-500/20" /> Closed Wing
            </span>
            <span className="text-slate-400 dark:text-slate-600">·</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-600 ring-2 ring-amber-600/20" /> Crowded (2.5×)
            </span>
          </div>

          {/* Interactive 2D Map / 3D City View Segmented Toggle */}
          <div
            className="inline-flex items-center p-0.5 rounded-xl bg-slate-200/80 dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 shadow-inner"
            role="group"
            aria-label="Map Visualization View Mode"
          >
            <button
              onClick={() => setViewMode('2d')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono font-semibold transition-all cursor-pointer ${
                viewMode === '2d'
                  ? 'bg-white dark:bg-emerald-600 text-emerald-700 dark:text-white shadow-sm ring-1 ring-emerald-500/30 dark:ring-emerald-400/50'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Switch to 2D Interactive Blueprint Graph"
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>2D Map</span>
            </button>
            <button
              onClick={() => setViewMode('3d')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono font-semibold transition-all cursor-pointer ${
                viewMode === '3d'
                  ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 shadow-sm ring-1 ring-emerald-400/50'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Switch to Interactive 3D Campus City View"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>3D City View</span>
            </button>
          </div>
        </div>
      </div>

      {/* Map Canvas Stage (2D Blueprint or 3D Campus City) */}
      <div className="relative w-full overflow-hidden bg-slate-50 dark:bg-[#000000] flex justify-center select-none">
        {viewMode === '3d' ? (
          <LibraryCity3D
            effectiveTheme={effectiveTheme}
            startNode={startNode}
            goalNode={goalNode}
            effectivePath={effectivePath}
            schedule={schedule}
            progressRef={progressRef}
            isSimulating={isSimulating}
            simSpeed={simSpeed}
            simObjectType={simObjectType}
            closedSections={closedSections}
            crowdedAisles={crowdedAisles}
            hasPermission={hasPermission}
            waypoints={waypoints}
            onSelectNode={onSelectNode}
            onToggleClosed={onToggleClosed}
            onToggleCrowded={onToggleCrowded}
          />
        ) : (
        <div className="w-full overflow-x-auto flex justify-center p-2">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full max-w-[940px] h-auto drop-shadow-md"
          style={{ minWidth: '600px' }}
        >
          <defs>
            {/* Grid Pattern */}
            <pattern id="blueprintGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke={isLight ? 'rgba(15, 23, 42, 0.06)' : 'rgba(255, 255, 255, 0.03)'}
                strokeWidth="1"
              />
              <path
                d="M 200 0 L 0 0 0 200"
                fill="none"
                stroke={isLight ? 'rgba(5, 150, 105, 0.12)' : 'rgba(16, 185, 129, 0.06)'}
                strokeWidth="1.5"
              />
            </pattern>

            {/* Glowing Gradient for Path */}
            <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#2dd4bf" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>

            {/* AGV Headlight Cone Gradient */}
            <linearGradient id="headlightCone" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="rgba(56, 189, 248, 0.7)" />
              <stop offset="100%" stopColor="rgba(56, 189, 248, 0)" />
            </linearGradient>

            {/* Projected Dual Headlight Beam for Library Car */}
            <linearGradient id="carDualBeam" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0.95)" />
              <stop offset="25%" stopColor="rgba(56, 189, 248, 0.7)" />
              <stop offset="65%" stopColor="rgba(56, 189, 248, 0.25)" />
              <stop offset="100%" stopColor="rgba(56, 189, 248, 0)" />
            </linearGradient>

            {/* Pointer Navigation Gradient */}
            <linearGradient id="pointerGradient" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="50%" stopColor="#0ea5e9" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>

            {/* Car Chassis Metallic Gradient */}
            <linearGradient id="carChassisGrad" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#042f2e" />
              <stop offset="40%" stopColor="#065f46" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>

            {/* Danger Pattern for Closed Sections */}
            <pattern id="closedHatch" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="10" stroke="rgba(244, 63, 94, 0.35)" strokeWidth="3" />
            </pattern>

            {/* Crowded Stripe Pattern */}
            <pattern id="crowdStripe" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(249, 115, 22, 0.5)" strokeWidth="2.5" />
            </pattern>

            {/* Filter for Glow Effect */}
            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background Blueprint Base (Focus Mode Element) */}
          <rect
            width={svgWidth}
            height={svgHeight}
            fill={isLight ? '#F8FAFC' : '#000000'}
            style={{ backgroundColor: isLight ? '#F8FAFC' : '#000000' }}
          />

          {/* Blueprint Overlay Grid */}
          <rect
            width={svgWidth}
            height={svgHeight}
            fill="url(#blueprintGrid)"
            opacity="0.75"
            pointerEvents="none"
          />

          {/* Underlay Department Zones */}
          {zoneRegions.map((z, idx) => {
            const rx1 = scaleX(z.x);
            const ry1 = scaleY(z.y + z.h);
            const rx2 = scaleX(z.x + z.w);
            const ry2 = scaleY(z.y);
            const rw = rx2 - rx1;
            const rh = ry2 - ry1;
            return (
              <g key={idx} className="pointer-events-none">
                <rect
                  x={rx1}
                  y={ry1}
                  width={rw}
                  height={rh}
                  rx="14"
                  fill={z.color}
                  stroke={z.border}
                  strokeWidth="1"
                  strokeDasharray="4,4"
                />
                <text
                  x={rx1 + 12}
                  y={ry1 + 18}
                  fill={isLight ? 'rgba(15, 23, 42, 0.48)' : 'rgba(255,255,255,0.25)'}
                  fontSize="10"
                  fontFamily="Space Grotesk, sans-serif"
                  fontWeight="600"
                  letterSpacing="1"
                >
                  {z.name.toUpperCase()}
                </text>
              </g>
            );
          })}

          {/* Corridor Edges */}
          {LIBRARY_EDGES.map((edge) => {
            const u = LIBRARY_NODES[edge.source];
            const v = LIBRARY_NODES[edge.target];
            if (!u || !v) return null;

            const x1 = scaleX(u.x);
            const y1 = scaleY(u.y);
            const x2 = scaleX(v.x);
            const y2 = scaleY(v.y);
            const edgeKey = canonicalEdge(edge.source, edge.target);
            const isCrowded = crowdedAisles.has(edgeKey);
            const isPath = activePathEdges.has(edgeKey);
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;

            return (
              <g
                key={edgeKey}
                className="cursor-pointer group"
                onClick={() => onToggleCrowded(edgeKey)}
              >
                {/* Wide invisible click target */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="transparent"
                  strokeWidth="20"
                />

                {/* Base Corridor Line */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={
                    isPath
                      ? '#059669'
                      : isCrowded
                      ? '#f97316'
                      : isLight
                      ? 'rgba(100, 116, 139, 0.42)'
                      : 'rgba(148, 163, 184, 0.22)'
                  }
                  strokeWidth={isPath ? 4 : isCrowded ? 3 : 1.75}
                  strokeDasharray={isCrowded && !isPath ? '6,4' : undefined}
                  className="transition-colors duration-300"
                />

                {/* Planned Route Line Glow */}
                {isPath && (
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="url(#routeGradient)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    opacity="0.6"
                  />
                )}

                {/* Distance & Travel-Time Label along corridor */}
                <g transform={`translate(${midX}, ${midY})`}>
                  {(() => {
                    const effDist = isCrowded ? edge.distance * CROWD_MULTIPLIER : edge.distance;
                    const travelSec = Math.round(effDist / WALKING_SPEED_MPS);
                    const showExpanded = isPath || isCrowded;
                    const pillW = showExpanded ? 62 : 36;
                    return (
                      <>
                        <rect
                          x={-pillW / 2}
                          y="-9"
                          width={pillW}
                          height="18"
                          rx="4"
                          fill={
                            isLight
                              ? isCrowded
                                ? '#FFF7ED'
                                : isPath
                                ? '#ECFDF5'
                                : '#FFFFFF'
                              : isCrowded
                              ? '#431407'
                              : isPath
                              ? '#064e3b'
                              : '#0f172a'
                          }
                          stroke={
                            isLight
                              ? isCrowded
                                ? '#EA580C'
                                : isPath
                                ? '#059669'
                                : '#CBD5E1'
                              : isCrowded
                              ? '#ea580c'
                              : isPath
                              ? '#059669'
                              : '#334155'
                          }
                          strokeWidth="1"
                          className="group-hover:stroke-emerald-500 transition-colors"
                        />
                        <text
                          x="0"
                          y="3"
                          textAnchor="middle"
                          fill={
                            isLight
                              ? isCrowded
                                ? '#C2410C'
                                : isPath
                                ? '#065F46'
                                : '#475569'
                              : isCrowded
                              ? '#fdba74'
                              : isPath
                              ? '#a7f3d0'
                              : '#94a3b8'
                          }
                          fontSize="8.5"
                          fontFamily="JetBrains Mono, monospace"
                          fontWeight="600"
                        >
                          {showExpanded ? `${edge.distance}m · ${travelSec}s` : `${edge.distance}m`}
                        </text>
                      </>
                    );
                  })()}
                </g>
              </g>
            );
          })}

          {/* Dynamic Traversed Simulation Trail (Bright Neon Emerald) */}
          {schedule.segments.map((seg, idx) => {
            const x1 = scaleX(seg.x1);
            const y1 = scaleY(seg.y1);
            const x2 = scaleX(seg.x2);
            const y2 = scaleY(seg.y2);
            if (idx < simPose.activeSegmentIndex || simPose.hasArrived) {
              return (
                <line
                  key={`sim-trail-${idx}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#10b981"
                  strokeWidth="5"
                  strokeLinecap="round"
                  filter="url(#neonGlow)"
                  opacity="0.95"
                />
              );
            } else if (idx === simPose.activeSegmentIndex) {
              return (
                <line
                  key={`sim-trail-active-${idx}`}
                  x1={x1}
                  y1={y1}
                  x2={svgAgentPos.x}
                  y2={svgAgentPos.y}
                  stroke="#34d399"
                  strokeWidth="6"
                  strokeLinecap="round"
                  filter="url(#neonGlow)"
                  opacity="0.95"
                />
              );
            }
            return null;
          })}

          {/* Interactive Library Nodes */}
          {Object.values(LIBRARY_NODES).map((node) => {
            const cx = scaleX(node.x);
            const cy = scaleY(node.y);
            const isStart = node.id === startNode;
            const isGoal = node.id === goalNode;
            const isWaypoint = waypoints.includes(node.id);
            const isClosed = closedSections.has(node.id);
            const isPathNode = effectivePath.includes(node.id);
            const isRestricted = node.restricted;
            const isVisitedInSim = simPose.visitedNodeIds.has(node.id);

            let fillColor = isLight ? '#FFFFFF' : '#0f172a';
            let strokeColor = isLight ? '#94A3B8' : '#334155';
            let radius = 14;

            if (isClosed) {
              fillColor = isLight ? '#FFE4E6' : '#450a0a';
              strokeColor = '#e11d48';
            } else if (isStart) {
              fillColor = isLight ? '#D1FAE5' : '#064e3b';
              strokeColor = '#10b981';
              radius = 16;
            } else if (isGoal) {
              fillColor = isLight ? '#FEF3C7' : '#78350f';
              strokeColor = '#f59e0b';
              radius = 16;
            } else if (isWaypoint) {
              fillColor = isLight
                ? isVisitedInSim
                  ? '#D1FAE5'
                  : '#E0F2FE'
                : isVisitedInSim
                ? '#064e3b'
                : '#0c4a6e';
              strokeColor = isVisitedInSim ? '#10b981' : '#0284c7';
              radius = 15;
            } else if (isPathNode) {
              fillColor = isLight
                ? isVisitedInSim
                  ? '#D1FAE5'
                  : '#ECFDF5'
                : isVisitedInSim
                ? '#064e3b'
                : '#0f172a';
              strokeColor = isVisitedInSim ? '#10b981' : '#059669';
              radius = 14;
            } else if (isRestricted) {
              fillColor = isLight ? '#F1F5F9' : '#27272a';
              strokeColor = hasPermission ? '#f59e0b' : '#ef4444';
            }

            return (
              <g
                key={node.id}
                className="cursor-pointer group"
                onClick={() => onSelectNode(node.id)}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                {/* Node Outer Ring */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={isStart || isGoal ? 3 : 2}
                  strokeDasharray={isRestricted ? '4,3' : undefined}
                  className="transition-transform duration-200 group-hover:scale-110 origin-center"
                />

                {/* Visited Checkmark Aura during Simulation */}
                {isVisitedInSim && (isWaypoint || isGoal) && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={radius + 5}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="1.5"
                    opacity="0.8"
                    strokeDasharray="3,3"
                  />
                )}

                {/* Marker Content */}
                {isClosed ? (
                  <g transform={`translate(${cx - 6}, ${cy - 6})`}>
                    <line x1="0" y1="0" x2="12" y2="12" stroke="#f43f5e" strokeWidth="2" />
                    <line x1="12" y1="0" x2="0" y2="12" stroke="#f43f5e" strokeWidth="2" />
                  </g>
                ) : isRestricted ? (
                  <circle cx={cx} cy={cy} r="3" fill={hasPermission ? '#f59e0b' : '#ef4444'} />
                ) : (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isStart || isGoal || isWaypoint ? 5 : 3.5}
                    fill={
                      isStart
                        ? isLight
                          ? '#059669'
                          : '#34d399'
                        : isGoal
                        ? isLight
                          ? '#D97706'
                          : '#fbbf24'
                        : isWaypoint
                        ? isVisitedInSim
                          ? isLight
                            ? '#059669'
                            : '#34d399'
                          : isLight
                          ? '#0284C7'
                          : '#38bdf8'
                        : isLight
                        ? '#64748B'
                        : '#cbd5e1'
                    }
                  />
                )}

                {/* Node Label Below */}
                <g transform={`translate(${cx}, ${cy + radius + 14})`}>
                  <rect
                    x="-45"
                    y="-9"
                    width="90"
                    height="18"
                    rx="4"
                    fill={isLight ? 'rgba(255, 255, 255, 0.94)' : 'rgba(11, 15, 23, 0.88)'}
                    stroke={
                      isClosed
                        ? isLight
                          ? 'rgba(225, 29, 72, 0.5)'
                          : 'rgba(244, 63, 94, 0.4)'
                        : isStart
                        ? isLight
                          ? 'rgba(5, 150, 105, 0.55)'
                          : 'rgba(16, 185, 129, 0.5)'
                        : isGoal
                        ? isLight
                          ? 'rgba(217, 119, 6, 0.55)'
                          : 'rgba(245, 158, 11, 0.5)'
                        : isVisitedInSim && isPathNode
                        ? isLight
                          ? 'rgba(5, 150, 105, 0.45)'
                          : 'rgba(16, 185, 129, 0.4)'
                        : isLight
                        ? 'rgba(148, 163, 184, 0.65)'
                        : 'rgba(51, 65, 85, 0.6)'
                    }
                    strokeWidth="1"
                  />
                  <text
                    x="0"
                    y="3"
                    textAnchor="middle"
                    fill={
                      isLight
                        ? isClosed
                          ? '#9F1239'
                          : isStart
                          ? '#065F46'
                          : isGoal
                          ? '#92400E'
                          : '#0F172A'
                        : isClosed
                        ? '#fda4af'
                        : isStart
                        ? '#6ee7b7'
                        : isGoal
                        ? '#fde68a'
                        : '#e2e8f0'
                    }
                    fontSize="9.5"
                    fontFamily="Space Grotesk, sans-serif"
                    fontWeight="600"
                    className="select-none"
                  >
                    {node.name.length > 15 ? node.name.slice(0, 14) + '…' : node.name}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Autonomous Simulation Actor Object (Car, Pointer, Cart Bot) */}
          <g
            transform={`translate(${svgAgentPos.x}, ${svgAgentPos.y})`}
            className="pointer-events-none"
          >
            {/* Animated Environmental Radar Pulse Ring */}
            <circle
              r={simObjectType === 'car' ? 30 : 25}
              fill={simObjectType === 'pointer' ? 'rgba(56, 189, 248, 0.12)' : 'rgba(16, 185, 129, 0.12)'}
              stroke={simObjectType === 'pointer' ? '#38bdf8' : '#10b981'}
              strokeWidth="1.5"
              opacity="0.6"
              className={isSimulating ? 'animate-ping' : ''}
            />

            {/* 1. AUTONOMOUS LIBRARY CAR MODEL */}
            {simObjectType === 'car' && (
              <g transform={`rotate(${svgAgentPos.heading})`}>
                {/* Dual Headlight Forward Projected Cones */}
                <polygon
                  points="20,-8 60,-22 60,-2"
                  fill="url(#carDualBeam)"
                  opacity="0.85"
                />
                <polygon
                  points="20,8 60,2 60,22"
                  fill="url(#carDualBeam)"
                  opacity="0.85"
                />

                {/* 4 Rubber Tires / Wheels */}
                {/* Front Left */}
                <rect x="8" y="-17" width="11" height="5" rx="1.5" fill="#0f172a" stroke="#475569" strokeWidth="1" />
                <line x1="13.5" y1="-17" x2="13.5" y2="-12" stroke="#34d399" strokeWidth="1" />
                {/* Front Right */}
                <rect x="8" y="12" width="11" height="5" rx="1.5" fill="#0f172a" stroke="#475569" strokeWidth="1" />
                <line x1="13.5" y1="12" x2="13.5" y2="17" stroke="#34d399" strokeWidth="1" />
                {/* Rear Left */}
                <rect x="-19" y="-17" width="11" height="5" rx="1.5" fill="#0f172a" stroke="#475569" strokeWidth="1" />
                <line x1="-13.5" y1="-17" x2="-13.5" y2="-12" stroke="#34d399" strokeWidth="1" />
                {/* Rear Right */}
                <rect x="-19" y="12" width="11" height="5" rx="1.5" fill="#0f172a" stroke="#475569" strokeWidth="1" />
                <line x1="-13.5" y1="12" x2="-13.5" y2="17" stroke="#34d399" strokeWidth="1" />

                {/* Main Aerodynamic Car Body Shell */}
                <rect
                  x="-21"
                  y="-13"
                  width="42"
                  height="26"
                  rx="8"
                  fill="url(#carChassisGrad)"
                  stroke="#34d399"
                  strokeWidth="2"
                  filter="url(#neonGlow)"
                />

                {/* Hood Inset & Aerodynamic Lines */}
                <path d="M 12 -10 Q 18 0 12 10" stroke="#10b981" strokeWidth="1.2" fill="none" />
                <line x1="21" y1="-6" x2="21" y2="6" stroke="#6ee7b7" strokeWidth="2" strokeLinecap="round" />

                {/* Front Curved Windshield Cockpit */}
                <path d="M 0 -10 Q 12 0 0 10 Z" fill="#022c22" stroke="#6ee7b7" strokeWidth="1.2" />

                {/* Glass Panoramic Roof Panel */}
                <rect x="-10" y="-8" width="9" height="16" rx="2" fill="#042f2e" stroke="#10b981" strokeWidth="0.8" />

                {/* Rear Window Glass */}
                <path d="M -15 -9 Q -9 0 -15 9 Z" fill="#022c22" stroke="#34d399" strokeWidth="0.8" />

                {/* Side Mirrors */}
                <polygon points="5,-13 8,-17 3,-17" fill="#065f46" stroke="#34d399" strokeWidth="0.8" />
                <polygon points="5,13 8,17 3,17" fill="#065f46" stroke="#34d399" strokeWidth="0.8" />

                {/* Roof Autonomous Lidar Sensor Dome */}
                <circle cx="-5.5" cy="0" r="3.5" fill="#10b981" />
                <circle cx="-5.5" cy="0" r="1.5" fill="#ffffff" />
                <line x1="-5.5" y1="0" x2="-5.5" y2="-9" stroke="#38bdf8" strokeWidth="1.2" strokeDasharray="1.5,1.5" />

                {/* Dual Projector Headlights (Front) */}
                <circle cx="20" cy="-7.5" r="2.8" fill="#ffffff" filter="url(#neonGlow)" />
                <circle cx="20" cy="7.5" r="2.8" fill="#ffffff" filter="url(#neonGlow)" />

                {/* Dual Red LED Taillights (Rear) */}
                <line x1="-21" y1="-10" x2="-21" y2="-4" stroke="#ef4444" strokeWidth="2.8" strokeLinecap="round" />
                <line x1="-21" y1="4" x2="-21" y2="10" stroke="#ef4444" strokeWidth="2.8" strokeLinecap="round" />
                <circle cx="-24" cy="-7" r="3.5" fill="rgba(239, 68, 68, 0.45)" />
                <circle cx="-24" cy="7" r="3.5" fill="rgba(239, 68, 68, 0.45)" />
              </g>
            )}

            {/* 2. DIRECTIONAL HIGH-TECH POINTER / ARROW MODEL */}
            {simObjectType === 'pointer' && (
              <g transform={`rotate(${svgAgentPos.heading})`}>
                {/* Forward Scanner Beam */}
                <polygon
                  points="0,0 55,-18 55,18"
                  fill="url(#carDualBeam)"
                  opacity="0.65"
                />

                {/* Stealth Navigation Arrow Body */}
                <path
                  d="M 30 0 L -18 -18 L -9 0 L -18 18 Z"
                  fill="url(#pointerGradient)"
                  stroke="#38bdf8"
                  strokeWidth="2.2"
                  filter="url(#neonGlow)"
                />

                {/* Inset Aerodynamic Winglets */}
                <path
                  d="M 21 0 L -8 -10 L -3 0 L -8 10 Z"
                  fill="#0369a1"
                  stroke="#bae6fd"
                  strokeWidth="1.2"
                />

                {/* Dynamic Range Radar Ring */}
                <ellipse
                  cx="-9"
                  cy="0"
                  rx="6"
                  ry="13"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="1.2"
                  opacity="0.8"
                  strokeDasharray="2.5,2.5"
                />

                {/* GPS Core Navigation Beacon */}
                <circle cx="5" cy="0" r="4" fill="#38bdf8" />
                <circle cx="5" cy="0" r="1.8" fill="#ffffff" />
                <circle cx="28" cy="0" r="2.2" fill="#ffffff" filter="url(#neonGlow)" />
              </g>
            )}

            {/* 3. AUTONOMOUS BOOK CART BOT MODEL */}
            {simObjectType === 'cart' && (
              <g transform={`rotate(${svgAgentPos.heading})`}>
                {/* Forward Optical Scanner */}
                <polygon
                  points="16,0 48,-16 48,16"
                  fill="url(#headlightCone)"
                  opacity="0.75"
                />

                {/* 4 Omni-directional Wheels */}
                <rect x="9" y="-18" width="8" height="4.5" rx="1.5" fill="#334155" stroke="#f59e0b" strokeWidth="0.8" />
                <rect x="9" y="13.5" width="8" height="4.5" rx="1.5" fill="#334155" stroke="#f59e0b" strokeWidth="0.8" />
                <rect x="-17" y="-18" width="8" height="4.5" rx="1.5" fill="#334155" stroke="#f59e0b" strokeWidth="0.8" />
                <rect x="-17" y="13.5" width="8" height="4.5" rx="1.5" fill="#334155" stroke="#f59e0b" strokeWidth="0.8" />

                {/* Cart Chassis Frame */}
                <rect
                  x="-17"
                  y="-14"
                  width="34"
                  height="28"
                  rx="6"
                  fill="#1e293b"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  filter="url(#neonGlow)"
                />

                {/* Book Tray Bay with Shelved Books */}
                <rect x="-13" y="-10" width="16" height="20" rx="2" fill="#0f172a" stroke="#f59e0b" strokeWidth="0.8" />
                <rect x="-11" y="-8" width="12" height="3.5" rx="1" fill="#10b981" />
                <rect x="-11" y="-3" width="12" height="3.5" rx="1" fill="#38bdf8" />
                <rect x="-11" y="2" width="12" height="3.5" rx="1" fill="#f43f5e" />

                {/* Front Sensor Head & Dual Cameras */}
                <rect x="5" y="-8" width="10" height="16" rx="3.5" fill="#d97706" stroke="#fbbf24" strokeWidth="1" />
                <circle cx="11" cy="-4" r="2.2" fill="#ffffff" />
                <circle cx="11" cy="4" r="2.2" fill="#ffffff" />
                <circle cx="15" cy="0" r="2" fill="#34d399" filter="url(#neonGlow)" />
              </g>
            )}

            {/* Overhead Simulation Identification Badge */}
            <g transform="translate(0, -32)">
              <rect
                x="-46"
                y="-10"
                width="92"
                height="20"
                rx="5"
                fill={
                  isLight
                    ? simObjectType === 'pointer'
                      ? '#F0F9FF'
                      : simObjectType === 'cart'
                      ? '#FFFBEB'
                      : '#ECFDF5'
                    : '#052e16'
                }
                stroke={simObjectType === 'pointer' ? '#0284c7' : simObjectType === 'cart' ? '#d97706' : '#059669'}
                strokeWidth="1.2"
                opacity="0.96"
                filter={isLight ? undefined : 'url(#neonGlow)'}
              />
              <text
                x="0"
                y="3.5"
                textAnchor="middle"
                fill={
                  isLight
                    ? simObjectType === 'pointer'
                      ? '#075985'
                      : simObjectType === 'cart'
                      ? '#92400E'
                      : '#065F46'
                    : simObjectType === 'pointer'
                    ? '#7dd3fc'
                    : simObjectType === 'cart'
                    ? '#fde68a'
                    : '#a7f3d0'
                }
                fontSize="9"
                fontFamily="JetBrains Mono, monospace"
                fontWeight="700"
              >
                {simObjectType === 'car' ? '🚗 CAR' : simObjectType === 'pointer' ? '🧭 POINTER' : '🤖 CART'} · {Math.round(simProgress * 100)}%
              </text>
            </g>
          </g>
        </svg>
        </div>
        )}

        {/* Arrival Completion Notification Toast (Shown in Both 2D and 3D) */}
        {completionBanner && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/95 dark:bg-[#052e16]/95 border border-emerald-400 dark:border-emerald-500/60 text-emerald-950 dark:text-emerald-100 text-xs shadow-2xl">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="flex flex-col">
              <span className="font-display font-bold text-xs">
                Destination Reached: {completionBanner.destination}
              </span>
              <span className="font-mono text-[10px] text-emerald-700 dark:text-emerald-300">
                Completed {completionBanner.distance}m route in ~{completionBanner.timeSec}s simulated transit
              </span>
            </div>
            <button
              onClick={() => setCompletionBanner(null)}
              className="p-1 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 cursor-pointer"
              title="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Live Pickup Alert Toast */}
        {activePickupToast && (
          <div className="absolute top-4 left-4 z-30 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/95 dark:bg-emerald-950/95 border border-emerald-300 dark:border-emerald-500/40 text-emerald-900 dark:text-emerald-200 text-xs shadow-2xl animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="font-mono font-medium">{activePickupToast}</span>
          </div>
        )}

        {/* Hover Inspector Tooltip Floating Card (2D Mode) */}
        {viewMode === '2d' && hoveredNode && (
          <div className="absolute bottom-4 left-4 z-20 max-w-sm p-4 rounded-xl bg-white/95 dark:bg-[#0D1321]/95 backdrop-blur-md border border-slate-200 dark:border-slate-700/80 shadow-2xl text-xs space-y-2.5 pointer-events-none ring-1 ring-emerald-500/15">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-slate-900 dark:text-slate-100 font-display text-sm">{hoveredNode.name}</span>
              <span className="font-mono text-[10px] text-slate-600 dark:text-slate-400">ID: {hoveredNode.id}</span>
            </div>
            <div className="text-[11px] text-slate-700 dark:text-slate-300 font-sans leading-relaxed">
              {hoveredNode.description}
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-400">
              <span>Coord: ({hoveredNode.x}, {hoveredNode.y})</span>
              <span>·</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-sans font-medium">{hoveredNode.department}</span>
              {hoveredNode.restricted && (
                <>
                  <span>·</span>
                  <span className="text-amber-700 dark:text-amber-400 flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> Special Clearance
                  </span>
                </>
              )}
              {closedSections.has(hoveredNode.id) && (
                <>
                  <span>·</span>
                  <span className="text-rose-700 dark:text-rose-400 font-bold uppercase">Section Closed</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Comprehensive Simulation Deck Controls Toolbar */}
      <div className="p-4 bg-slate-50 dark:bg-[#0A0E17] border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 text-xs">
        {/* Playback Transport Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={handleTogglePlay}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all shadow-md cursor-pointer ${
              isSimulating
                ? 'bg-amber-600 hover:bg-amber-700 dark:hover:bg-amber-500 text-white shadow-amber-900/20 dark:shadow-amber-900/30 ring-1 ring-amber-400/40'
                : 'bg-emerald-600 hover:bg-emerald-700 dark:hover:bg-emerald-500 text-white shadow-emerald-900/20 dark:shadow-emerald-900/30 ring-1 ring-emerald-400/40'
            }`}
            title={
              isSimulating
                ? 'Pause Simulation'
                : simProgress > 0.005 && simProgress < 0.999
                ? 'Resume Simulation'
                : 'Start Simulation'
            }
          >
            {isSimulating ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>Pause</span>
              </>
            ) : simProgress > 0.005 && simProgress < 0.999 ? (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Resume</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Start Simulation</span>
              </>
            )}
          </button>

          <button
            onClick={handleReset}
            className="p-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-colors"
            title="Rewind to Start"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={handleStepBack}
            className="p-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-colors"
            title="Step Back One Node"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={handleStepForward}
            className="p-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-colors"
            title="Step Forward One Node"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsLooping(!isLooping)}
            className={`p-2 rounded-xl border transition-colors ${
              isLooping
                ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title={`Loop Mode: ${isLooping ? 'Enabled' : 'Disabled'}`}
          >
            <Repeat className="w-4 h-4" />
          </button>

          {/* Speed Presets */}
          <div className="flex items-center gap-1 pl-2 border-l border-slate-200 dark:border-slate-800">
            {[0.5, 1.0, 2.0, 4.0].map((spd) => (
              <button
                key={spd}
                onClick={() => setSimSpeed(spd)}
                className={`px-2 py-1 rounded-md text-[11px] font-mono transition-colors ${
                  simSpeed === spd
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200 border border-slate-300 dark:border-slate-800'
                }`}
              >
                {spd}×
              </button>
            ))}
          </div>

          {/* Simulation Object Selector (Car, Pointer, Cart) */}
          <div className="flex items-center gap-1 pl-2 border-l border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-mono text-slate-600 dark:text-slate-500 hidden xl:inline">Vehicle:</span>
            <button
              onClick={() => setSimObjectType('car')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all cursor-pointer ${
                simObjectType === 'car'
                  ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 font-bold shadow-md shadow-emerald-600/20'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200 border border-slate-300 dark:border-slate-800'
              }`}
              title="Show simulation as Autonomous Electric Library Car"
            >
              <Car className="w-3.5 h-3.5" />
              <span>Car</span>
            </button>
            <button
              onClick={() => setSimObjectType('pointer')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all cursor-pointer ${
                simObjectType === 'pointer'
                  ? 'bg-sky-600 dark:bg-sky-500 text-white dark:text-slate-950 font-bold shadow-md shadow-sky-600/20'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200 border border-slate-300 dark:border-slate-800'
              }`}
              title="Show simulation as High-Tech Navigation Pointer / Arrow"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Pointer</span>
            </button>
            <button
              onClick={() => setSimObjectType('cart')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all cursor-pointer ${
                simObjectType === 'cart'
                  ? 'bg-amber-600 dark:bg-amber-500 text-white dark:text-slate-950 font-bold shadow-md shadow-amber-600/20'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200 border border-slate-300 dark:border-slate-800'
              }`}
              title="Show simulation as Autonomous Book Cart Bot"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Cart Bot</span>
            </button>
          </div>
        </div>

        {/* Center: Live Telemetry Progress Bar & Interactive Scrubber */}
        <div className="flex-1 max-w-md flex flex-col gap-1.5 px-2">
          <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium truncate">
              <Navigation className="w-3 h-3 shrink-0" />
              <span className="truncate">{simPose.currentLocationLabel}</span>
            </span>
            <span className="font-bold text-slate-900 dark:text-slate-200 shrink-0">
              {Math.round(simProgress * 100)}%
            </span>
            <span className="flex items-center gap-1 text-sky-700 dark:text-sky-400 font-medium truncate">
              <span className="truncate">Next: {simPose.nextDestinationLabel}</span>
            </span>
          </div>

          <div className="relative flex items-center">
            <div className="w-full h-2 rounded-lg bg-slate-200 dark:bg-slate-800 overflow-hidden pointer-events-none">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-sky-400 transition-none"
                style={{ width: `${Math.min(100, Math.max(0, simProgress * 100))}%` }}
              />
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.002"
              value={simProgress}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setIsSimulating(false);
                setCompletionBanner(null);
                progressRef.current = val;
                setSimProgress(val);
              }}
              aria-label="Simulation Route Progress"
              className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-600 dark:text-slate-500">
            <span className="flex items-center gap-1.5">
              <span>Leg {simPose.activeSegmentIndex + 1} of {schedule.segments.length || 1}</span>
              {schedule.segments[simPose.activeSegmentIndex]?.isCrowded && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 font-semibold">
                  <AlertTriangle className="w-2.5 h-2.5" /> 2.5× Crowded
                </span>
              )}
            </span>
            <span>
              {Math.round(simPose.traveledPhysicalMeters)}m / {Math.round(schedule.totalBaseDist)}m
            </span>
          </div>
        </div>

        {/* Right: Telemetry & Section Quick Toggle */}
        <div className="flex items-center gap-2 justify-end">
          {hoveredNode && (
            <button
              onClick={() => onToggleClosed(hoveredNode.id)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-medium border transition-colors ${
                closedSections.has(hoveredNode.id)
                  ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900'
                  : 'bg-white dark:bg-[#131B2E] text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-[#1A253D]'
              }`}
            >
              {closedSections.has(hoveredNode.id) ? 'Re-open Section' : 'Close for Maintenance'}
            </button>
          )}

          <div className="hidden sm:flex flex-col text-right font-mono text-[10px] text-slate-600 dark:text-slate-400">
            <span className="text-slate-800 dark:text-slate-300 font-medium">
              {simPose.hasArrived
                ? 'Arrived (0s left)'
                : `ETA: ~${Math.max(1, Math.round(simPose.remainingTimeSec / simSpeed))}s`}
            </span>
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
              Velocity: {(WALKING_SPEED_MPS * simSpeed).toFixed(1)} m/s
            </span>
          </div>
        </div>
      </div>

      {/* Path Nodes Sequence Manifest Toggle & Drawer */}
      <div className="px-4 py-2.5 bg-slate-100/80 dark:bg-[#080C14] border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
        <button
          onClick={() => setIsPathTableOpen(!isPathTableOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-[#0D1321] hover:bg-slate-50 dark:hover:bg-[#131B2E] text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700/80 font-mono text-[11px] transition-colors cursor-pointer shadow-xs"
        >
          <Route className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Active Route Nodes Sequence ({effectivePath.length})</span>
          {isPathTableOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />}
        </button>

        <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
          Add or remove specific nodes from the active route
        </span>
      </div>

      {isPathTableOpen && (
        <div className="p-4 bg-slate-50 dark:bg-[#0A0E17] border-t border-slate-200 dark:border-slate-800/80 space-y-3">
          {/* Quick Toolbar to Add Any Node or Restore Excluded Nodes to Path */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-[#080C14] border border-slate-200 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-700 dark:text-slate-400 font-mono text-[11px] flex items-center gap-1 font-medium">
                <Plus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Add Node to Path:
              </span>
              <select
                value={nodeToAdd}
                onChange={(e) => setNodeToAdd(e.target.value)}
                className="bg-slate-50 dark:bg-[#0D1321] border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-900 dark:text-slate-200 text-xs font-mono focus:border-emerald-500 focus:outline-none"
              >
                {Object.values(LIBRARY_NODES).map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name} ({n.id})
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  if (closedSections.has(nodeToAdd)) {
                    onToggleClosed(nodeToAdd);
                  }
                  onSelectNode(nodeToAdd);
                }}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:hover:bg-emerald-500 text-white dark:text-slate-950 font-bold text-[11px] font-mono transition-colors shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add to Path</span>
              </button>
            </div>

            {closedSections.size > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-slate-600 dark:text-slate-400 font-mono text-[10px]">Excluded Detours:</span>
                {Array.from(closedSections).map((cId) => (
                  <button
                    key={cId}
                    onClick={() => onToggleClosed(cId)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/70 hover:bg-emerald-50 dark:hover:bg-emerald-950/80 text-rose-800 dark:text-rose-300 hover:text-emerald-800 dark:hover:text-emerald-300 border border-rose-200 dark:border-rose-800/60 hover:border-emerald-400 dark:hover:border-emerald-600 text-[10px] font-mono transition-colors cursor-pointer group"
                    title="Click to restore and add back to path"
                  >
                    <span>{LIBRARY_NODES[cId]?.name || cId}</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold group-hover:scale-125 transition-transform">+ Add</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Active Nodes Sequence Table with Both Add & Remove Options */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#080C14]">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-100 dark:bg-[#0A0E17] text-slate-700 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-2 font-semibold">Step</th>
                  <th className="px-4 py-2 font-semibold">Node Name</th>
                  <th className="px-3 py-2 font-semibold">Node ID</th>
                  <th className="px-3 py-2 font-semibold">Department</th>
                  <th className="px-3 py-2 font-semibold">Role</th>
                  <th className="px-4 py-2 font-semibold text-right text-slate-800 dark:text-slate-300">Path Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                {effectivePath.map((nodeId, idx) => {
                  const node = LIBRARY_NODES[nodeId] || { name: nodeId, department: 'General' };
                  const isStart = idx === 0;
                  const isGoal = idx === effectivePath.length - 1;
                  const isClosed = closedSections.has(nodeId);

                  return (
                    <tr key={`${nodeId}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-[#131B2E]/50 transition-colors">
                      <td className="px-4 py-2 text-slate-600 dark:text-slate-400 font-bold">#{idx + 1}</td>
                      <td className="px-4 py-2 font-semibold text-slate-900 dark:text-slate-200">{node.name}</td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{nodeId}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{node.department}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            isStart
                              ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50'
                              : isGoal
                              ? 'bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50'
                              : isClosed
                              ? 'bg-rose-50 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50'
                              : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          {isStart ? 'Origin' : isGoal ? 'Destination' : isClosed ? 'Excluded' : 'Corridor'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Option to Add to Path */}
                          <button
                            onClick={() => {
                              if (isClosed) {
                                onToggleClosed(nodeId);
                              } else {
                                onSelectNode(nodeId);
                              }
                            }}
                            disabled={isGoal && !isClosed}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium transition-all shadow-sm ${
                              isGoal && !isClosed
                                ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-800'
                                : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/80 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60 hover:border-emerald-400 dark:hover:border-emerald-700 cursor-pointer'
                            }`}
                            title={
                              isClosed
                                ? `Restore '${node.name}' to path`
                                : isGoal
                                ? `'${node.name}' is already destination`
                                : `Add / set '${node.name}' as destination in path`
                            }
                          >
                            <PlusCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>{isClosed ? 'Restore to Path' : 'Add to Path'}</span>
                          </button>

                          {/* Option to Remove from Path */}
                          <button
                            onClick={() => onToggleClosed(nodeId)}
                            disabled={isStart}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium transition-all shadow-sm ${
                              isStart
                                ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-800'
                                : isClosed
                                ? 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/50 cursor-pointer'
                                : 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/70 dark:hover:bg-rose-900 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800/60 hover:border-rose-400 dark:hover:border-rose-700 cursor-pointer'
                            }`}
                            title={
                              isStart
                                ? 'Cannot remove origin start node'
                                : isClosed
                                ? `Already excluded from path. Click to re-open.`
                                : `Remove '${node.name}' from path`
                            }
                          >
                            <MinusCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                            <span>Remove from Path</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
