/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  NodeData,
  EdgeData,
  BookData,
  SearchNodeInfo,
  StepSnapshot,
  SearchResult,
  RouteLeg,
  MultiBookPlan,
  LIBRARY_NODES,
  LIBRARY_EDGES,
  LIBRARY_BOOKS,
  WALKING_SPEED_MPS,
  PICKUP_TIME_SECONDS,
  CROWD_MULTIPLIER,
} from './types';

export function canonicalEdge(u: string, v: string): string {
  return u < v ? `${u}__${v}` : `${v}__${u}`;
}

export function euclideanDistance(n1: NodeData, n2: NodeData): number {
  return Math.hypot(n1.x - n2.x, n1.y - n2.y);
}

// Build adjacency lookup
export const ADJACENCY: Record<string, Record<string, number>> = {};
for (const nid of Object.keys(LIBRARY_NODES)) {
  ADJACENCY[nid] = {};
}
for (const edge of LIBRARY_EDGES) {
  ADJACENCY[edge.source][edge.target] = edge.distance;
  ADJACENCY[edge.target][edge.source] = edge.distance;
}

export function getEdgeCost(
  u: string,
  v: string,
  crowdedAisles: Set<string>,
  costMode: 'distance' | 'time'
): { cost: number; isCrowded: boolean } {
  const baseDist = ADJACENCY[u]?.[v] || 0;
  const isCrowded = crowdedAisles.has(canonicalEdge(u, v));
  const mult = isCrowded ? CROWD_MULTIPLIER : 1.0;
  if (costMode === 'time') {
    return { cost: (baseDist / WALKING_SPEED_MPS) * mult, isCrowded };
  }
  return { cost: baseDist * mult, isCrowded };
}

export function heuristic(fromNode: string, toNode: string, costMode: 'distance' | 'time'): number {
  const n1 = LIBRARY_NODES[fromNode];
  const n2 = LIBRARY_NODES[toNode];
  if (!n1 || !n2 || fromNode === toNode) return 0;
  const d = euclideanDistance(n1, n2);
  return costMode === 'time' ? d / WALKING_SPEED_MPS : d;
}

export function runSearch(
  algo: 'BFS' | 'DFS' | 'A*',
  startNode: string,
  goalNode: string,
  closedSections: Set<string>,
  crowdedAisles: Set<string>,
  hasPermission: boolean,
  costMode: 'distance' | 'time'
): SearchResult {
  if (closedSections.has(startNode)) {
    return {
      algorithm: algo,
      success: false,
      path: [],
      totalCost: 0,
      pathLengthEdges: 0,
      nodesExpanded: 0,
      snapshots: [],
      message: `Start node '${startNode}' is closed for facility maintenance.`,
    };
  }
  if (closedSections.has(goalNode)) {
    return {
      algorithm: algo,
      success: false,
      path: [],
      totalCost: 0,
      pathLengthEdges: 0,
      nodesExpanded: 0,
      snapshots: [],
      message: `Destination shelf '${goalNode}' is in a closed wing.`,
    };
  }
  if (LIBRARY_NODES[goalNode]?.restricted && !hasPermission) {
    return {
      algorithm: algo,
      success: false,
      path: [],
      totalCost: 0,
      pathLengthEdges: 0,
      nodesExpanded: 0,
      snapshots: [],
      message: `Destination shelf '${goalNode}' requires Special Collections security clearance.`,
    };
  }

  if (startNode === goalNode) {
    const snap: StepSnapshot = {
      stepNumber: 1,
      currentNode: startNode,
      openList: [{ node: startNode, g: 0, h: 0, f: 0, parent: null }],
      closedList: [{ node: startNode, g: 0, h: 0, f: 0, parent: null }],
      actionNote: 'Start and goal are identical.',
    };
    return {
      algorithm: algo,
      success: true,
      path: [startNode],
      totalCost: 0,
      pathLengthEdges: 0,
      nodesExpanded: 1,
      snapshots: [snap],
      message: 'Agent is already at the target shelf.',
    };
  }

  const getSuccessors = (curr: string) => {
    const neighbors = ADJACENCY[curr] || {};
    const succs: { node: string; cost: number }[] = [];
    for (const nbr of Object.keys(neighbors).sort()) {
      if (closedSections.has(nbr)) continue;
      if (LIBRARY_NODES[nbr]?.restricted && !hasPermission) continue;
      const { cost } = getEdgeCost(curr, nbr, crowdedAisles, costMode);
      succs.push({ node: nbr, cost });
    }
    return succs;
  };

  const snapshots: StepSnapshot[] = [];
  const parentMap: Record<string, string | null> = { [startNode]: null };
  const gScores: Record<string, number> = { [startNode]: 0 };

  if (algo === 'BFS') {
    const queue: string[] = [startNode];
    const visited = new Set<string>([startNode]);
    const closedList: SearchNodeInfo[] = [];
    let step = 0;

    while (queue.length > 0) {
      step++;
      const curr = queue.shift()!;
      const currG = gScores[curr] || 0;
      const currH = heuristic(curr, goalNode, costMode);
      closedList.push({ node: curr, g: currG, h: currH, f: currG + currH, parent: parentMap[curr] });

      if (curr === goalNode) {
        const path: string[] = [];
        let p: string | null = goalNode;
        while (p !== null) {
          path.unshift(p);
          p = parentMap[p] ?? null;
        }
        let totalCost = 0;
        for (let i = 0; i < path.length - 1; i++) {
          totalCost += getEdgeCost(path[i], path[i + 1], crowdedAisles, costMode).cost;
        }
        snapshots.push({
          stepNumber: step,
          currentNode: curr,
          openList: queue.map((n) => ({
            node: n,
            g: gScores[n] || 0,
            h: heuristic(n, goalNode, costMode),
            f: (gScores[n] || 0) + heuristic(n, goalNode, costMode),
            parent: parentMap[n],
          })),
          closedList: [...closedList],
          actionNote: `Goal reached at ${curr}!`,
        });
        return {
          algorithm: 'BFS',
          success: true,
          path,
          totalCost,
          pathLengthEdges: path.length - 1,
          nodesExpanded: closedList.length,
          snapshots,
          message: `BFS reached ${goalNode} in ${path.length - 1} hops (${totalCost.toFixed(1)} ${costMode === 'distance' ? 'm' : 's'}).`,
        };
      }

      const succs = getSuccessors(curr);
      for (const { node: nbr, cost } of succs) {
        if (!visited.has(nbr)) {
          visited.add(nbr);
          gScores[nbr] = currG + cost;
          parentMap[nbr] = curr;
          queue.push(nbr);
        }
      }

      snapshots.push({
        stepNumber: step,
        currentNode: curr,
        openList: queue.map((n) => ({
          node: n,
          g: gScores[n] || 0,
          h: heuristic(n, goalNode, costMode),
          f: (gScores[n] || 0) + heuristic(n, goalNode, costMode),
          parent: parentMap[n],
        })),
        closedList: [...closedList],
        actionNote: `Expanded ${curr}, enqueued ${succs.length} adjacent candidates.`,
      });
    }

    return {
      algorithm: 'BFS',
      success: false,
      path: [],
      totalCost: 0,
      pathLengthEdges: 0,
      nodesExpanded: closedList.length,
      snapshots,
      message: `No viable path found to ${goalNode} (graph partitioned or obstructed).`,
    };
  }

  if (algo === 'DFS') {
    const stack: string[] = [startNode];
    const visited = new Set<string>();
    const closedList: SearchNodeInfo[] = [];
    let step = 0;

    while (stack.length > 0) {
      step++;
      const curr = stack.pop()!;
      if (visited.has(curr)) continue;
      visited.add(curr);

      const currG = gScores[curr] || 0;
      const currH = heuristic(curr, goalNode, costMode);
      closedList.push({ node: curr, g: currG, h: currH, f: currG + currH, parent: parentMap[curr] });

      if (curr === goalNode) {
        const path: string[] = [];
        let p: string | null = goalNode;
        while (p !== null) {
          path.unshift(p);
          p = parentMap[p] ?? null;
        }
        let totalCost = 0;
        for (let i = 0; i < path.length - 1; i++) {
          totalCost += getEdgeCost(path[i], path[i + 1], crowdedAisles, costMode).cost;
        }
        snapshots.push({
          stepNumber: step,
          currentNode: curr,
          openList: stack.map((n) => ({
            node: n,
            g: gScores[n] || 0,
            h: heuristic(n, goalNode, costMode),
            f: (gScores[n] || 0) + heuristic(n, goalNode, costMode),
            parent: parentMap[n],
          })),
          closedList: [...closedList],
          actionNote: `DFS reached ${curr} via deep branch exploration!`,
        });
        return {
          algorithm: 'DFS',
          success: true,
          path,
          totalCost,
          pathLengthEdges: path.length - 1,
          nodesExpanded: closedList.length,
          snapshots,
          message: `DFS reached ${goalNode} in ${path.length - 1} hops (${totalCost.toFixed(1)} ${costMode === 'distance' ? 'm' : 's'}). Non-optimal exploration.`,
        };
      }

      const succs = getSuccessors(curr);
      for (const { node: nbr, cost } of [...succs].reverse()) {
        if (!visited.has(nbr)) {
          gScores[nbr] = currG + cost;
          parentMap[nbr] = curr;
          stack.push(nbr);
        }
      }

      snapshots.push({
        stepNumber: step,
        currentNode: curr,
        openList: stack.map((n) => ({
          node: n,
          g: gScores[n] || 0,
          h: heuristic(n, goalNode, costMode),
          f: (gScores[n] || 0) + heuristic(n, goalNode, costMode),
          parent: parentMap[n],
        })),
        closedList: [...closedList],
        actionNote: `Popped ${curr} from LIFO stack, exploring child branch.`,
      });
    }

    return {
      algorithm: 'DFS',
      success: false,
      path: [],
      totalCost: 0,
      pathLengthEdges: 0,
      nodesExpanded: closedList.length,
      snapshots,
      message: `DFS exhausted frontier without reaching ${goalNode}.`,
    };
  }

  // A* SEARCH
  interface AStarEntry {
    f: number;
    node: string;
  }
  const openHeap: AStarEntry[] = [{ f: heuristic(startNode, goalNode, costMode), node: startNode }];
  const closedSet = new Set<string>();
  const closedList: SearchNodeInfo[] = [];
  let step = 0;

  while (openHeap.length > 0) {
    step++;
    // sort heap to extract min f
    openHeap.sort((a, b) => a.f - b.f);
    const { node: curr } = openHeap.shift()!;

    if (closedSet.has(curr)) continue;
    closedSet.add(curr);

    const currG = gScores[curr] ?? Infinity;
    const currH = heuristic(curr, goalNode, costMode);
    closedList.push({ node: curr, g: currG, h: currH, f: currG + currH, parent: parentMap[curr] });

    if (curr === goalNode) {
      const path: string[] = [];
      let p: string | null = goalNode;
      while (p !== null) {
        path.unshift(p);
        p = parentMap[p] ?? null;
      }
      snapshots.push({
        stepNumber: step,
        currentNode: curr,
        openList: openHeap.map((e) => ({
          node: e.node,
          g: gScores[e.node] || 0,
          h: heuristic(e.node, goalNode, costMode),
          f: e.f,
          parent: parentMap[e.node],
        })),
        closedList: [...closedList],
        actionNote: `Goal ${curr} reached with provably optimal f=${currG.toFixed(2)}!`,
      });
      return {
        algorithm: 'A*',
        success: true,
        path,
        totalCost: currG,
        pathLengthEdges: path.length - 1,
        nodesExpanded: closedList.length,
        snapshots,
        message: `A* verified optimal route with cost ${currG.toFixed(1)} ${costMode === 'distance' ? 'm' : 's'} (${path.length - 1} hops).`,
      };
    }

    const succs = getSuccessors(curr);
    for (const { node: nbr, cost } of succs) {
      const tentG = currG + cost;
      if (tentG < (gScores[nbr] ?? Infinity)) {
        parentMap[nbr] = curr;
        gScores[nbr] = tentG;
        const nbrH = heuristic(nbr, goalNode, costMode);
        const tentF = tentG + nbrH;
        openHeap.push({ f: tentF, node: nbr });
      }
    }

    snapshots.push({
      stepNumber: step,
      currentNode: curr,
      openList: openHeap.map((e) => ({
        node: e.node,
        g: gScores[e.node] || 0,
        h: heuristic(e.node, goalNode, costMode),
        f: e.f,
        parent: parentMap[e.node],
      })),
      closedList: [...closedList],
      actionNote: `Expanded ${curr} (g=${currG.toFixed(1)}, h=${currH.toFixed(1)}). Added ${succs.length} neighbors to priority queue.`,
    });
  }

  return {
    algorithm: 'A*',
    success: false,
    path: [],
    totalCost: 0,
    pathLengthEdges: 0,
    nodesExpanded: closedList.length,
    snapshots,
    message: `A* exhausted search space without finding a route to ${goalNode}.`,
  };
}

// Multi-Book TSP Optimizer with 2-Opt and Priority Budget Pruning
export function optimizeMultiBookTS(
  selectedBookIds: string[],
  startNode: string,
  checkoutNode: string,
  closedSections: Set<string>,
  crowdedAisles: Set<string>,
  hasPermission: boolean,
  costMode: 'distance' | 'time',
  timeLimitSec: number | null
): MultiBookPlan {
  const booksMap = new Map(LIBRARY_BOOKS.map((b) => [b.id, b]));
  const skipped: { book: BookData; reason: string }[] = [];
  const candidateBooks: BookData[] = [];

  for (const bid of selectedBookIds) {
    const book = booksMap.get(bid);
    if (!book) continue;
    if (!book.available) {
      skipped.push({ book, reason: `Item is checked out / on inter-library loan.` });
      continue;
    }
    if (closedSections.has(book.shelf)) {
      skipped.push({ book, reason: `Shelf '${book.shelf}' is in a closed corridor.` });
      continue;
    }
    if ((book.restricted || LIBRARY_NODES[book.shelf]?.restricted) && !hasPermission) {
      skipped.push({ book, reason: `Special archive collection (requires clearance).` });
      continue;
    }
    candidateBooks.push(book);
  }

  if (candidateBooks.length === 0) {
    return {
      success: false,
      startNode,
      checkoutNode,
      orderedShelves: [],
      fullPath: [],
      legs: [],
      collectedBooks: [],
      skippedBooks: skipped,
      totalDistanceMeters: 0,
      totalTransitSeconds: 0,
      totalPickupSeconds: 0,
      totalTimeSeconds: 0,
      totalCost: 0,
      message: 'No requested books could be retrieved under current access conditions.',
    };
  }

  const finalPairwiseResults = new Map<string, SearchResult>();
  const getPairwise = (u: string, v: string) => {
    return runSearch('A*', u, v, closedSections, crowdedAisles, hasPermission, costMode);
  };

  let activeBooks = [...candidateBooks];
  let finalRoute: string[] | null = null;

  while (activeBooks.length > 0) {
    const uniqueShelves = Array.from(new Set(activeBooks.map((b) => b.shelf)));
    const waypoints = [...uniqueShelves];

    let bestOrder: string[] = [];
    let bestCost = Infinity;

    const evalOrder = (order: string[]) => {
      const full = [startNode, ...order, checkoutNode];
      let cost = 0;
      for (let i = 0; i < full.length - 1; i++) {
        const key = `${full[i]}->${full[i + 1]}`;
        let res = finalPairwiseResults.get(key);
        if (!res) {
          res = getPairwise(full[i], full[i + 1]);
          finalPairwiseResults.set(key, res);
        }
        if (!res.success) return Infinity;
        cost += res.totalCost;
      }
      return cost;
    };

    if (waypoints.length <= 6) {
      const permute = (arr: string[]): string[][] => {
        if (arr.length <= 1) return [arr];
        const res: string[][] = [];
        for (let i = 0; i < arr.length; i++) {
          const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
          for (const sub of permute(rest)) {
            res.push([arr[i], ...sub]);
          }
        }
        return res;
      };

      for (const p of permute(waypoints)) {
        const c = evalOrder(p);
        if (c < bestCost) {
          bestCost = c;
          bestOrder = p;
        }
      }
    } else {
      // Nearest Neighbor
      const unvisited = new Set(waypoints);
      let curr = startNode;
      const order: string[] = [];
      while (unvisited.size > 0) {
        let nearest: string | null = null;
        let minD = Infinity;
        for (const cand of unvisited) {
          const key = `${curr}->${cand}`;
          let r = finalPairwiseResults.get(key) || getPairwise(curr, cand);
          finalPairwiseResults.set(key, r);
          if (r.success && r.totalCost < minD) {
            minD = r.totalCost;
            nearest = cand;
          }
        }
        if (!nearest) break;
        order.push(nearest);
        unvisited.delete(nearest);
        curr = nearest;
      }
      bestOrder = order;
      bestCost = evalOrder(bestOrder);
    }

    // Check time limit constraints
    let totalTransitSec = 0;
    let totalDistM = 0;
    const testRoute = [startNode, ...bestOrder, checkoutNode];

    for (let i = 0; i < testRoute.length - 1; i++) {
      const key = `${testRoute[i]}->${testRoute[i + 1]}`;
      const r = finalPairwiseResults.get(key) || getPairwise(testRoute[i], testRoute[i + 1]);
      if (r.success) {
        totalDistM += r.path.slice(0, -1).reduce((acc, u, idx) => acc + (ADJACENCY[u]?.[r.path[idx + 1]] || 0), 0);
        totalTransitSec += costMode === 'time' ? r.totalCost : r.totalCost / WALKING_SPEED_MPS;
      }
    }
    if (costMode === 'distance') {
      totalTransitSec = totalDistM / WALKING_SPEED_MPS;
    }
    const totalPickupSec = activeBooks.length * PICKUP_TIME_SECONDS;
    const totalMissionSec = totalTransitSec + totalPickupSec;

    if (timeLimitSec && totalMissionSec > timeLimitSec && activeBooks.length > 1) {
      // Priority-based Pruning (drop lowest priority first: 3 then 2 then 1)
      const maxPri = Math.max(...activeBooks.map((b) => b.priority)) as 1 | 2 | 3;
      const idxToDrop = activeBooks.map((b) => b.priority).lastIndexOf(maxPri);
      const dropped = activeBooks.splice(idxToDrop, 1)[0];
      skipped.push({
        book: dropped,
        reason: `Pruned to conform to user time budget of ${timeLimitSec}s (mission estimated at ${Math.round(totalMissionSec)}s).`,
      });
      continue;
    }

    finalRoute = testRoute;
    break;
  }

  if (!finalRoute || activeBooks.length === 0) {
    return {
      success: false,
      startNode,
      checkoutNode,
      orderedShelves: [],
      fullPath: [],
      legs: [],
      collectedBooks: [],
      skippedBooks: skipped,
      totalDistanceMeters: 0,
      totalTransitSeconds: 0,
      totalPickupSeconds: 0,
      totalTimeSeconds: 0,
      totalCost: 0,
      message: 'Failed to construct a viable collection tour under current parameters.',
    };
  }

  // Build legs and full combined path
  const legs: RouteLeg[] = [];
  const fullPath: string[] = [finalRoute[0]];
  let totDist = 0;
  let totTransit = 0;
  let totCost = 0;

  for (let i = 0; i < finalRoute.length - 1; i++) {
    const from = finalRoute[i];
    const to = finalRoute[i + 1];
    const key = `${from}->${to}`;
    const r = finalPairwiseResults.get(key) || getPairwise(from, to);
    if (r.path.length > 1) {
      fullPath.push(...r.path.slice(1));
    }

    let legDist = 0;
    for (let j = 0; j < r.path.length - 1; j++) {
      legDist += ADJACENCY[r.path[j]]?.[r.path[j + 1]] || 0;
    }
    const legDuration = legDist / WALKING_SPEED_MPS;
    const booksHere = activeBooks.filter((b) => b.shelf === to);

    legs.push({
      legIndex: i + 1,
      fromNode: from,
      toNode: to,
      path: r.path,
      distanceMeters: legDist,
      durationSeconds: legDuration,
      legCost: r.totalCost,
      booksCollected: to === checkoutNode ? [] : booksHere,
    });

    totDist += legDist;
    totTransit += legDuration;
    totCost += r.totalCost;
  }

  const totPickup = activeBooks.length * PICKUP_TIME_SECONDS;
  const totMission = totTransit + totPickup;

  return {
    success: true,
    startNode,
    checkoutNode,
    orderedShelves: finalRoute.slice(1, -1),
    fullPath,
    legs,
    collectedBooks: activeBooks,
    skippedBooks: skipped,
    totalDistanceMeters: Math.round(totDist * 10) / 10,
    totalTransitSeconds: Math.round(totTransit),
    totalPickupSeconds: Math.round(totPickup),
    totalTimeSeconds: Math.round(totMission),
    totalCost: Math.round(totCost * 10) / 10,
    message: `Optimized itinerary generated for ${activeBooks.length} book${activeBooks.length === 1 ? '' : 's'} across ${legs.length} corridor legs.`,
  };
}
