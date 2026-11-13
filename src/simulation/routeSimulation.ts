/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  LIBRARY_NODES,
  LIBRARY_EDGES,
  WALKING_SPEED_MPS,
  CROWD_MULTIPLIER,
} from '../types';
import { canonicalEdge } from '../searchEngine';

export type SimObjectType = 'car' | 'pointer' | 'cart';
export type MapViewMode = '2d' | '3d';

export interface RouteSegment {
  index: number;
  from: string;
  to: string;
  baseDist: number;
  isCrowded: boolean;
  effectiveCostDist: number;
  durationSeconds: number;
  cumStartDist: number;
  cumEndDist: number;
  cumStartTime: number;
  cumEndTime: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface RouteSchedule {
  segments: RouteSegment[];
  totalBaseDist: number;
  totalEffectiveDist: number;
  totalDurationSec: number;
}

export interface InterpolatedVehiclePose {
  worldX: number;
  worldY: number;
  /** Direction of travel in library Cartesian space (radians, +X = 0, +Y = PI/2) */
  headingRad: number;
  activeSegmentIndex: number;
  segmentProgress: number;
  currentFrom: string;
  currentTo: string;
  currentLocationLabel: string;
  nextDestinationLabel: string;
  traveledEffectiveMeters: number;
  totalEffectiveMeters: number;
  traveledPhysicalMeters: number;
  totalPhysicalMeters: number;
  elapsedTimeSec: number;
  remainingTimeSec: number;
  visitedNodeIds: Set<string>;
  hasArrived: boolean;
}

/**
 * Builds an authoritative segment schedule from the active route path and
 * real edge distances / congestion penalties.
 */
export function buildRouteSchedule(
  effectivePath: string[],
  crowdedAisles: Set<string>
): RouteSchedule {
  if (!effectivePath || effectivePath.length < 2) {
    return {
      segments: [],
      totalBaseDist: 0,
      totalEffectiveDist: 0,
      totalDurationSec: 0,
    };
  }

  const segments: RouteSegment[] = [];
  let accumEffective = 0;
  let accumBase = 0;
  let accumTime = 0;

  for (let i = 0; i < effectivePath.length - 1; i++) {
    const fromId = effectivePath[i];
    const toId = effectivePath[i + 1];
    const u = LIBRARY_NODES[fromId];
    const v = LIBRARY_NODES[toId];
    if (!u || !v) continue;

    const edgeKey = canonicalEdge(fromId, toId);
    const existingEdge = LIBRARY_EDGES.find(
      (e) => canonicalEdge(e.source, e.target) === edgeKey
    );
    const isCrowded = crowdedAisles.has(edgeKey);
    const baseDist = existingEdge
      ? existingEdge.distance
      : Math.max(1, Math.hypot(v.x - u.x, v.y - u.y));
    const effectiveCostDist = isCrowded ? baseDist * CROWD_MULTIPLIER : baseDist;
    const durationSeconds = effectiveCostDist / WALKING_SPEED_MPS;

    segments.push({
      index: segments.length,
      from: fromId,
      to: toId,
      baseDist,
      isCrowded,
      effectiveCostDist,
      durationSeconds,
      cumStartDist: accumEffective,
      cumEndDist: accumEffective + effectiveCostDist,
      cumStartTime: accumTime,
      cumEndTime: accumTime + durationSeconds,
      x1: u.x,
      y1: u.y,
      x2: v.x,
      y2: v.y,
    });

    accumBase += baseDist;
    accumEffective += effectiveCostDist;
    accumTime += durationSeconds;
  }

  return {
    segments,
    totalBaseDist: accumBase,
    totalEffectiveDist: accumEffective,
    totalDurationSec: accumTime,
  };
}

/**
 * Evaluates the exact vehicle position, heading, location labels, and timing metrics
 * for any normalized progress in [0, 1]. Shared between 2D Map and 3D City View.
 */
export function evaluateVehicleAtProgress(
  schedule: RouteSchedule,
  effectivePath: string[],
  progress: number,
  startNode: string,
  goalNode: string
): InterpolatedVehiclePose {
  const clampedProgress = Math.max(0, Math.min(1, progress));

  if (schedule.segments.length === 0 || schedule.totalEffectiveDist <= 0) {
    const fallbackNodeId = effectivePath[0] || startNode || 'Entrance';
    const node = LIBRARY_NODES[fallbackNodeId] || LIBRARY_NODES.Entrance;
    const nextNodeId = effectivePath[effectivePath.length - 1] || goalNode || fallbackNodeId;
    const nextNode = LIBRARY_NODES[nextNodeId] || node;

    return {
      worldX: node.x,
      worldY: node.y,
      headingRad: 0,
      activeSegmentIndex: 0,
      segmentProgress: 0,
      currentFrom: fallbackNodeId,
      currentTo: nextNodeId,
      currentLocationLabel: node.name,
      nextDestinationLabel: nextNode.name,
      traveledEffectiveMeters: 0,
      totalEffectiveMeters: 0,
      traveledPhysicalMeters: 0,
      totalPhysicalMeters: 0,
      elapsedTimeSec: 0,
      remainingTimeSec: 0,
      visitedNodeIds: new Set([fallbackNodeId]),
      hasArrived: clampedProgress >= 1,
    };
  }

  const currentEffectiveDist = clampedProgress * schedule.totalEffectiveDist;

  let segIndex = schedule.segments.findIndex(
    (s) => currentEffectiveDist >= s.cumStartDist && currentEffectiveDist <= s.cumEndDist
  );
  if (segIndex === -1) {
    segIndex = clampedProgress >= 1 ? schedule.segments.length - 1 : 0;
  }

  const seg = schedule.segments[segIndex];
  const segSpan = seg.effectiveCostDist > 0 ? seg.effectiveCostDist : 1;
  const rawSegT = (currentEffectiveDist - seg.cumStartDist) / segSpan;
  const segT = Math.max(0, Math.min(1, rawSegT));

  const worldX = seg.x1 + (seg.x2 - seg.x1) * segT;
  const worldY = seg.y1 + (seg.y2 - seg.y1) * segT;
  const headingRad = Math.atan2(seg.y2 - seg.y1, seg.x2 - seg.x1);

  // Track physical meters completed
  let traveledPhysicalMeters = 0;
  for (let i = 0; i < segIndex; i++) {
    traveledPhysicalMeters += schedule.segments[i].baseDist;
  }
  traveledPhysicalMeters += seg.baseDist * segT;

  const elapsedTimeSec = clampedProgress * schedule.totalDurationSec;
  const remainingTimeSec = Math.max(0, schedule.totalDurationSec - elapsedTimeSec);

  const visitedNodeIds = new Set<string>();
  for (let i = 0; i <= segIndex; i++) {
    visitedNodeIds.add(schedule.segments[i].from);
  }
  if (clampedProgress >= 0.999 || segT >= 0.92) {
    visitedNodeIds.add(seg.to);
  }

  const fromNodeData = LIBRARY_NODES[seg.from];
  const toNodeData = LIBRARY_NODES[seg.to];
  const finalDestId = effectivePath[effectivePath.length - 1] || goalNode;
  const finalDestData = LIBRARY_NODES[finalDestId];

  const hasArrived = clampedProgress >= 0.999;

  let currentLocationLabel = fromNodeData?.name || seg.from;
  if (hasArrived) {
    currentLocationLabel = `Arrived at ${finalDestData?.name || finalDestId}`;
  } else if (segT > 0.12 && segT < 0.88) {
    currentLocationLabel = `${fromNodeData?.name || seg.from} → ${toNodeData?.name || seg.to}`;
  } else if (segT >= 0.88) {
    currentLocationLabel = toNodeData?.name || seg.to;
  }

  const nextDestinationLabel = hasArrived
    ? finalDestData?.name || finalDestId
    : toNodeData?.name || seg.to;

  return {
    worldX,
    worldY,
    headingRad,
    activeSegmentIndex: segIndex,
    segmentProgress: segT,
    currentFrom: seg.from,
    currentTo: seg.to,
    currentLocationLabel,
    nextDestinationLabel,
    traveledEffectiveMeters: currentEffectiveDist,
    totalEffectiveMeters: schedule.totalEffectiveDist,
    traveledPhysicalMeters,
    totalPhysicalMeters: schedule.totalBaseDist,
    elapsedTimeSec,
    remainingTimeSec,
    visitedNodeIds,
    hasArrived,
  };
}
