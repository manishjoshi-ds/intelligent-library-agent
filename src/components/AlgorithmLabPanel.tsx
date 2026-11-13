/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import {
  LIBRARY_NODES,
} from '../types';
import { runSearch } from '../searchEngine';
import {
  GitCompare,
  Sparkles,
} from 'lucide-react';

interface AlgorithmLabPanelProps {
  startNode: string;
  goalNode: string;
  closedSections: Set<string>;
  crowdedAisles: Set<string>;
  hasPermission: boolean;
  costMode: 'distance' | 'time';
}

export const AlgorithmLabPanel: React.FC<AlgorithmLabPanelProps> = ({
  startNode,
  goalNode,
  closedSections,
  crowdedAisles,
  hasPermission,
  costMode,
}) => {
  // Run all 3 algorithms simultaneously on the current configuration
  const results = useMemo(() => {
    const bfsRes = runSearch('BFS', startNode, goalNode, closedSections, crowdedAisles, hasPermission, costMode);
    const dfsRes = runSearch('DFS', startNode, goalNode, closedSections, crowdedAisles, hasPermission, costMode);
    const astarRes = runSearch('A*', startNode, goalNode, closedSections, crowdedAisles, hasPermission, costMode);

    return {
      BFS: bfsRes,
      DFS: dfsRes,
      'A*': astarRes,
    };
  }, [startNode, goalNode, closedSections, crowdedAisles, hasPermission, costMode]);

  const minCost = Math.min(
    ...[results.BFS, results.DFS, results['A*']].filter((r) => r.success).map((r) => r.totalCost)
  );

  return (
    <div className="space-y-6">
      {/* Benchmark Header Banner */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#0D1321] border border-slate-200 dark:border-slate-800/80 space-y-2 shadow-md dark:shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-display font-bold text-slate-900 dark:text-slate-100 text-base">
              Classical Graph Search Tri-Algorithm Benchmark
            </h3>
          </div>
          <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
            {LIBRARY_NODES[startNode]?.name} → {LIBRARY_NODES[goalNode]?.name}
          </span>
        </div>
        <p className="text-xs text-slate-700 dark:text-slate-300 font-sans leading-relaxed max-w-3xl">
          Direct comparative analysis of uninformed strategies (BFS FIFO queue, DFS LIFO stack) versus informed heuristic search (A* Priority Queue with Euclidean distance).
        </p>
      </div>

      {/* 3-Way Side-by-Side Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {(['BFS', 'DFS', 'A*'] as const).map((algoKey) => {
          const res = results[algoKey];
          const isOptimal = res.success && Math.abs(res.totalCost - minCost) < 0.01;
          const isAStar = algoKey === 'A*';

          return (
            <div
              key={algoKey}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between shadow-md dark:shadow-xl ${
                isAStar
                  ? 'bg-gradient-to-b from-emerald-50/90 to-white dark:from-[#064E3B]/25 dark:to-[#0D1321] border-emerald-400 dark:border-emerald-500/40 shadow-emerald-600/10 dark:shadow-emerald-500/10 ring-1 ring-emerald-500/20'
                  : 'bg-white dark:bg-[#0D1321] border-slate-200 dark:border-slate-800/80'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800/80">
                  <div>
                    <h4 className="font-display font-bold text-slate-900 dark:text-slate-100 text-lg">{algoKey}</h4>
                    <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                      {algoKey === 'BFS'
                        ? 'Breadth-First Search'
                        : algoKey === 'DFS'
                        ? 'Depth-First Search'
                        : 'A-Star Heuristic'}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-mono flex items-center gap-1.5 font-semibold ${
                      isOptimal ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isOptimal ? 'bg-emerald-600 dark:bg-emerald-400' : 'bg-amber-600 dark:bg-amber-400'}`} />
                    {isOptimal ? 'Optimal Cost' : 'Sub-Optimal'}
                  </span>
                </div>

                {/* Metrics List */}
                <div className="space-y-3 py-4 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-400 font-sans">Total Path Cost:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                      {res.success ? `${res.totalCost.toFixed(1)} ${costMode === 'distance' ? 'm' : 's'}` : 'N/A'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-400 font-sans">Path Length (Hops):</span>
                    <span className="font-mono text-teal-700 dark:text-teal-300 font-bold">
                      {res.success ? `${res.pathLengthEdges} edges` : '—'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-400 font-sans">Nodes Expanded:</span>
                    <span className="font-mono text-amber-700 dark:text-amber-400 font-bold">
                      {res.nodesExpanded} states
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-400 font-sans">Time Complexity:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {algoKey === 'BFS' ? 'O(b^d)' : algoKey === 'DFS' ? 'O(b^m)' : 'O(b^d) directed'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-400 font-sans">Space Complexity:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {algoKey === 'BFS' ? 'O(b^d) memory heavy' : algoKey === 'DFS' ? 'O(b·m) linear' : 'O(b^d)'}
                    </span>
                  </div>
                </div>

                {/* Path string */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 text-[11px] font-mono">
                  <span className="text-slate-600 dark:text-slate-500 block mb-1">Discovered Traversal:</span>
                  {res.success ? (
                    <div className="text-slate-800 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-[#080C14] p-2.5 rounded-lg border border-slate-200 dark:border-slate-800/80 max-h-24 overflow-y-auto no-scrollbar">
                      {res.path.join(' → ')}
                    </div>
                  ) : (
                    <div className="text-rose-700 dark:text-rose-400 italic">No path discovered</div>
                  )}
                </div>
              </div>

              {/* Theoretical Analysis Note */}
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/80 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                {algoKey === 'BFS' &&
                  'Guarantees shortest path in unweighted edges (hop-optimal), but can take a longer physical distance when corridor lengths or crowded penalties vary.'}
                {algoKey === 'DFS' &&
                  'Plunges down branches without cost awareness. May return circuitous paths and is prone to exhaustive exploration on cyclic topologies.'}
                {algoKey === 'A*' &&
                  'Mathematically optimal with admissible Euclidean heuristic h(n) ≤ h*(n). Focuses search beam directly toward goal, minimizing state expansions.'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Side-by-Side Formal Comparison Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0D1321] overflow-hidden shadow-md dark:shadow-xl">
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-[#0A0E17] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="font-display font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider text-[11px]">
            Formal Performance Matrix
          </span>
          <span className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">
            Admissibility Test: Euclidean h(n) ≤ h*(n)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-slate-100 dark:bg-[#080C14] text-slate-600 dark:text-slate-400 text-[10px] uppercase">
              <tr>
                <th className="px-5 py-3 font-medium">Algorithm</th>
                <th className="px-4 py-3 font-medium">Cost Metric</th>
                <th className="px-4 py-3 font-medium">Corridor Hops</th>
                <th className="px-4 py-3 font-medium">Nodes Expanded</th>
                <th className="px-4 py-3 font-medium">Optimality Proof</th>
                <th className="px-4 py-3 font-medium">Frontier Data Structure</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              <tr className="hover:bg-slate-50 dark:hover:bg-[#131B2E]/40 transition-colors">
                <td className="px-5 py-3 font-bold text-slate-900 dark:text-slate-100">BFS (Breadth-First)</td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                  {results.BFS.success ? `${results.BFS.totalCost.toFixed(1)} ${costMode === 'distance' ? 'm' : 's'}` : '—'}
                </td>
                <td className="px-4 py-3 text-teal-700 dark:text-teal-300 font-semibold">{results.BFS.pathLengthEdges}</td>
                <td className="px-4 py-3 text-amber-700 dark:text-amber-400 font-semibold">{results.BFS.nodesExpanded}</td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-sans">Hop-optimal only (non-uniform cost failure)</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">FIFO Queue (collections.deque)</td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-[#131B2E]/40 transition-colors">
                <td className="px-5 py-3 font-bold text-slate-900 dark:text-slate-100">DFS (Depth-First)</td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                  {results.DFS.success ? `${results.DFS.totalCost.toFixed(1)} ${costMode === 'distance' ? 'm' : 's'}` : '—'}
                </td>
                <td className="px-4 py-3 text-teal-700 dark:text-teal-300 font-semibold">{results.DFS.pathLengthEdges}</td>
                <td className="px-4 py-3 text-amber-700 dark:text-amber-400 font-semibold">{results.DFS.nodesExpanded}</td>
                <td className="px-4 py-3 text-rose-700 dark:text-rose-400 font-semibold font-sans">No (arbitrary depth exploration)</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">LIFO Stack (list.pop)</td>
              </tr>
              <tr className="bg-emerald-50/70 dark:bg-[#064E3B]/15 hover:bg-emerald-100/70 dark:hover:bg-[#064E3B]/25 transition-colors">
                <td className="px-5 py-3 font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  A* (Euclidean Heuristic)
                </td>
                <td className="px-4 py-3 text-emerald-800 dark:text-emerald-300 font-bold">
                  {results['A*'].success ? `${results['A*'].totalCost.toFixed(1)} ${costMode === 'distance' ? 'm' : 's'}` : '—'}
                </td>
                <td className="px-4 py-3 text-teal-700 dark:text-teal-300 font-bold">{results['A*'].pathLengthEdges}</td>
                <td className="px-4 py-3 text-amber-700 dark:text-amber-400 font-bold">{results['A*'].nodesExpanded}</td>
                <td className="px-4 py-3 text-emerald-700 dark:text-emerald-400 font-bold font-sans">Yes (Strictly Optimal)</td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">Min-Heap Priority Queue (heapq)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
