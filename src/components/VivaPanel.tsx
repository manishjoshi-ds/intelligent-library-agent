/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  GraduationCap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const VivaPanel: React.FC = () => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const questions = [
    {
      q: '1. How are the state space, actions, and transition model formally formulated?',
      answer: (
        <div className="space-y-3">
          <p>
            <strong>State Representation:</strong> For single-target book search, the state is represented simply as the current physical location:{' '}
            <code className="bg-slate-200/80 dark:bg-slate-900 px-2 py-0.5 rounded text-emerald-800 dark:text-emerald-400 font-mono text-xs">
              s = current_location ∈ V
            </code>
            . For multi-book collection, the state is extended to a compound tuple:{' '}
            <code className="bg-slate-200/80 dark:bg-slate-900 px-2 py-0.5 rounded text-teal-800 dark:text-teal-400 font-mono text-xs">
              s = (current_location, collected_books_set)
            </code>
            .
          </p>
          <p>
            <strong>Actions &amp; Successor Function:</strong> Walk from current node{' '}
            <code className="font-mono text-slate-900 dark:text-slate-200 font-semibold">u</code> to an adjacent node{' '}
            <code className="font-mono text-slate-900 dark:text-slate-200 font-semibold">v ∈ Adj(u)</code>. Transitions are strictly validated against runtime constraints:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-700 dark:text-slate-300">
            <li>Nodes in <code className="font-mono text-rose-700 dark:text-rose-400">closed_sections</code> cannot be entered (maintenance closure).</li>
            <li>Restricted archives (e.g., Rare Manuscripts vault) require explicit user security clearance.</li>
            <li>Corridor edge weights represent physical distance in meters, or walking transit time in seconds (<code className="font-mono text-amber-800 dark:text-amber-300">time = distance / 1.2 m/s</code>).</li>
            <li>Crowded corridors apply a <code className="font-mono text-orange-700 dark:text-orange-400">2.5× penalty factor</code> to reflect human congestion delays.</li>
          </ul>
        </div>
      ),
    },
    {
      q: '2. Why is the Euclidean heuristic admissible, and why does that guarantee A* optimality?',
      answer: (
        <div className="space-y-3">
          <p>
            An admissible heuristic never overestimates the actual minimum cost to reach the goal node:{' '}
            <code className="bg-slate-200/80 dark:bg-slate-900 px-2 py-0.5 rounded text-amber-800 dark:text-amber-300 font-mono text-xs">
              h(n) ≤ h*(n), ∀ n ∈ V
            </code>
            .
          </p>
          <p>
            <strong>Proof of Admissibility:</strong> In Euclidean 2D space, the straight-line distance between two points{' '}
            <code className="font-mono text-slate-900 dark:text-slate-200 font-semibold">(x₁, y₁)</code> and <code className="font-mono text-slate-900 dark:text-slate-200 font-semibold">(x₂, y₂)</code> is the geodesic minimum possible distance between them:
          </p>
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 font-mono text-emerald-800 dark:text-emerald-400 text-xs text-center border border-slate-300 dark:border-slate-800 font-semibold">
            h(n) = √[ (x₁ - x₂)² + (y₁ - y₂)² ]
          </div>
          <p>
            Because any physical walking route in the library must follow constrained corridors (edges), the actual path length must be greater than or equal to this straight line:{' '}
            <code className="font-mono text-emerald-800 dark:text-emerald-400">d_walk ≥ d_straight</code>. Since our heuristic also satisfies the triangle inequality (<code className="font-mono text-slate-900 dark:text-slate-200 font-semibold">h(u) ≤ c(u, v) + h(v)</code>), it is monotonic (consistent). With a consistent heuristic, A* graph search is mathematically guaranteed to return the cost-optimal path without needing to reopen closed nodes.
          </p>
        </div>
      ),
    },
    {
      q: '3. Can you demonstrate a concrete case where A* finds a cheaper path than BFS?',
      answer: (
        <div className="space-y-3">
          <p>
            Yes! Breadth-First Search (BFS) is strictly <strong>hop-optimal</strong> (it finds the path with the fewest edges/hops), completely blind to edge weights. When corridor distances or crowd multipliers vary, BFS can fail to find the minimum-cost route:
          </p>
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 font-mono text-xs border border-slate-300 dark:border-slate-800 space-y-1.5 text-slate-900 dark:text-slate-200">
            <div><strong>Scenario:</strong> Start = Main Entrance, Goal = Rare Manuscripts Archive.</div>
            <div className="text-slate-700 dark:text-slate-300">
              • Path A (1 Hop): Entrance → Rare Manuscripts (direct corridor, length = 60 meters).
            </div>
            <div className="text-slate-700 dark:text-slate-300">
              • Path B (2 Hops): Entrance → Information Desk (10m) → Rare Manuscripts (15m) = 25 meters total.
            </div>
          </div>
          <p>
            <strong>BFS Result:</strong> Explores by depth level and stops at level 1, returning Path A (Cost = 60m) because it is only 1 hop.
          </p>
          <p>
            <strong>A* Result:</strong> Evaluates <code className="font-mono text-emerald-800 dark:text-emerald-400 font-semibold">f(n) = g(n) + h(n)</code>. It explores Path B, recognizing its cumulative cost of 25m is far cheaper than 60m. Thus, A* returns Path B, proving that A* is cost-optimal while BFS is merely hop-optimal.
          </p>
        </div>
      ),
    },
    {
      q: '4. How is the Multi-Book Collection Problem formulated and solved?',
      answer: (
        <div className="space-y-3">
          <p>
            The multi-book collection challenge is an instance of the <strong>Traveling Salesperson Problem (TSP)</strong> with fixed endpoints:
          </p>
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 font-mono text-teal-800 dark:text-teal-400 text-xs text-center border border-slate-300 dark:border-slate-800 font-semibold">
            Tour: Start (Entrance) → σ(Shelf₁, Shelf₂, ..., Shelf_k) → Checkout
          </div>
          <p>
            <strong>Algorithmic Strategy:</strong>
          </p>
          <ol className="list-decimal pl-5 space-y-1 text-slate-700 dark:text-slate-300">
            <li>
              <strong>Pairwise All-Pairs Shortest Paths:</strong> A* is run between all unique shelf locations to compute an exact distance matrix.
            </li>
            <li>
              <strong>Optimal Tour Optimization:</strong> For small sets (k ≤ 6 waypoints), the agent performs an exhaustive permutation search (O(k!)) finding the global optimum. For larger sets, it executes Greedy Nearest-Neighbor followed by 2-Opt local search refinement.
            </li>
            <li>
              <strong>Priority Budget Pruning:</strong> If total estimated mission time (<code className="font-mono text-slate-900 dark:text-slate-200 font-semibold">transit_time + k × 45s pickup_time</code>) exceeds the user's specified time budget, books with lowest priority (P3 then P2) are iteratively pruned until the tour conforms to the limit.
            </li>
          </ol>
        </div>
      ),
    },
    {
      q: '5. What is the fundamental role of the Open List and Closed List in A* search?',
      answer: (
        <div className="space-y-3">
          <p>
            <strong>Open List (Frontier):</strong> Implemented as a min-heap priority queue (<code className="font-mono text-emerald-800 dark:text-emerald-400 font-semibold">heapq</code> in Python). It stores candidate nodes discovered but not yet expanded, prioritized by lowest evaluation score:
          </p>
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 font-mono text-amber-800 dark:text-amber-300 text-xs text-center border border-slate-300 dark:border-slate-800 font-semibold">
            f(n) = g(n) + h(n)
          </div>
          <p>
            where <code className="font-mono text-slate-900 dark:text-slate-200 font-semibold">g(n)</code> is the exact known cost from the start node, and <code className="font-mono text-slate-900 dark:text-slate-200 font-semibold">h(n)</code> is the Euclidean heuristic estimate to the goal.
          </p>
          <p>
            <strong>Closed List (Explored Set):</strong> A hash set recording nodes whose outgoing edges have already been fully expanded. This prevents infinite cycles in cyclic graphs and redundant re-evaluation. Because Euclidean distance is consistent, when a node is removed from the Open List, its <code className="font-mono text-emerald-800 dark:text-emerald-400 font-semibold">g(n)</code> is guaranteed to be minimal.
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Viva Header */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-2 shadow-md dark:shadow-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-slate-900 dark:text-slate-100 text-base">
              Viva & Oral Defense Theoretical Guide
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-sans">
              Rigorous mathematical formulations, complexity proofs, and algorithmic defense answers for classical search.
            </p>
          </div>
        </div>
      </div>

      {/* Accordion Questions */}
      <div className="space-y-3">
        {questions.map((item, idx) => {
          const isExpanded = expandedIndex === idx;
          return (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 overflow-hidden transition-colors shadow-sm dark:shadow-none"
            >
              <button
                onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                className="w-full p-4 text-left flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-900/80 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center font-mono text-xs font-bold ${
                      isExpanded
                        ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-transparent'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <span className="font-semibold text-slate-900 dark:text-slate-200 text-xs sm:text-sm">
                    {item.q.replace(/^\d+\.\s*/, '')}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                )}
              </button>

              {isExpanded && (
                <div className="p-5 pt-3 border-t border-slate-200 dark:border-slate-800/80 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50/70 dark:bg-slate-950/40">
                  {item.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
