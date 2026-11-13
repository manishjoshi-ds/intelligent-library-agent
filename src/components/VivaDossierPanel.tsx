/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  GraduationCap,
  Printer,
  Compass,
  Route,
  GitCompare,
  Terminal,
  Layers,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  Sparkles,
} from 'lucide-react';

export const VivaDossierPanel: React.FC = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const vivaQuestions = [
    {
      q: 'Q1: What is the formal state-space formulation of this library navigation problem?',
      a: 'The problem is formulated as a 5-tuple (S, s₀, A(s), T(s, a), G):\n• State Space (S): For single-search, s ∈ V represents the agent’s current spatial node (aisle, shelf, or desk). For multi-book collection, s = (current_node, collected_books) where collected_books ⊆ Catalog.\n• Initial State (s₀): The library entrance s₀ = "Entrance" with collected_books = ∅.\n• Action Space A(s): Traversal to any adjacent node v ∈ Adj(u) subject to constraints (v ∉ ClosedSections, and v.restricted ⇒ has_permission).\n• Transition Model T(s, a): Updates location to v and appends any target books shelved at v to collected_books.\n• Goal Test (G): In single search, current_location == goal_shelf. In multi-book, current_location == checkout_location ∧ TargetBooks ⊆ collected_books.',
    },
    {
      q: 'Q2: Why is the Euclidean heuristic h(n) guaranteed to be strictly admissible and consistent?',
      a: 'A heuristic h(n) is admissible if it never overestimates the true minimal cost to the goal: h(n) ≤ h*(n) for all nodes n. In our library cartography layout, each node possesses a 2D Euclidean coordinate (x, y). The heuristic calculates the straight-line distance:\n  h(n) = √((x_n - x_goal)² + (y_n - y_goal)²)\nBy the geometric triangle inequality and Euclidean metric axioms, the straight line is the absolute minimum distance between any two points in 2D space. Because library corridors and aisles can only add bends and detours, any physical walking path has length L ≥ h(n). Furthermore, it satisfies consistency (monotonicity): h(u) ≤ c(u, v) + h(v), ensuring that f(n) never decreases along any search trajectory and nodes in the Closed list never need reopening.',
    },
    {
      q: 'Q3: Why can Breadth-First Search (BFS) produce a suboptimal route on a weighted graph?',
      a: 'BFS explores nodes strictly in order of shallowest hop count (number of edges). It implicitly treats every edge as having uniform weight (cost = 1). If there is a direct corridor between Entrance and Goal with physical length 60m (1 hop), BFS will terminate immediately and declare it the answer. However, an alternate corridor via two intermediate segments of 10m each costs only 20m (2 hops). A* evaluates the cumulative path cost g(n) + h(n), thereby discovering and selecting the 20m route (saving 66% walking cost), whereas BFS blindly selects the 60m path.',
    },
    {
      q: 'Q4: How does Depth-First Search (DFS) behave, and why is it not recommended for pathfinding?',
      a: 'DFS prioritizes exploring as deep as possible along a single branch before backtracking (using a LIFO stack). On cyclic graphs, it requires an explored set to avoid infinite loops. While DFS has lower space complexity O(b·m) where m is maximum depth, it is neither complete on infinite graphs nor cost-optimal. In our library, DFS frequently traverses circuitous detours (e.g. visiting 8 or 10 nodes for a target only 2 nodes away), making it unsuited for optimal routing, though useful for exhaustive topological traversal.',
    },
    {
      q: 'Q5: How is the Multi-Book Collection Problem formulated and solved?',
      a: 'Multi-book collection is an instance of the NP-hard Traveling Salesperson Problem (TSP) with fixed endpoints (Start → Shelf₁ → ... → Shelf_k → Checkout). We solve it in two stages:\n1. All-Pairs Metric Construction: Pairwise A* is executed between all required shelf waypoints to compute the shortest obstacle-aware paths and build an exact distance matrix D.\n2. Tour Sequencing Optimization:\n   • For small orders (k ≤ 7 unique shelves), exact permutation evaluation checks all k! orderings to guarantee the absolute global minimum.\n   • For larger orders (k > 7), a Greedy Nearest-Neighbor heuristic generates a strong initial seed, which is iteratively refined using 2-Opt local search by reversing sub-tours that eliminate crossing corridor paths.',
    },
    {
      q: 'Q6: How are dynamic environmental constraints (Closed Wings, Crowded Aisles, Permissions) enforced?',
      a: 'During neighbor expansion, the successor generator evaluates dynamic rules:\n• Closed Sections: If a node id is present in the closedSections Set, it is pruned from neighbor generation, forcing A* to route through alternative aisles.\n• Crowded Aisles: If an edge is congested, its traversal cost is scaled by 2.5×. If the detour cost around the aisle is less than the 2.5× penalty, A* autonomously routes around it.\n• Restricted Clearance: Nodes flagged as restricted (e.g., Rare Manuscripts) require has_permission=true; otherwise they act as impassable walls.\n• Time Budget Pruning: In multi-book mode, if total estimated collection time exceeds the user budget, the agent greedily drops low-priority titles (Priority 3 standard before Priority 1 urgent) and re-computes until compliant.',
    },
    {
      q: 'Q7: What is the dual cost metric system (Distance vs Time)?',
      a: 'The system models two distinct real-world logistics objectives:\n1. Distance Mode (Meters): Step cost c(u, v) = base_distance(u, v) × (2.5 if crowded else 1.0). Minimizes physical student footsteps and AGV battery consumption.\n2. Time Mode (Seconds): Step cost c(u, v) = [base_distance(u, v) / v_walk] × crowd_multiplier, where walking velocity v_walk = 1.2 m/s. For multi-book TSP, an additional 45-second shelf-inspection/pickup duration is added per unique book. Heuristic h_time(n) = Euclidean_distance / v_walk_max (where v_walk_max = 1.4 m/s) to maintain strict admissibility.',
    },
    {
      q: 'Q8: What is the purpose of the Open List and Closed List in A*?',
      a: '• Open List (Frontier): A Min-Priority Queue (implemented via binary heap in Python and indexed array in TypeScript) containing discovered nodes awaiting evaluation, keyed by f(n) = g(n) + h(n). At each step, the node with smallest f(n) is popped.\n• Closed List (Explored Set): A hash table/set recording nodes already expanded. It prevents redundant re-exploration and eliminates cycles. Because our Euclidean heuristic is monotone/consistent, when a node is added to the Closed List, its shortest path has been permanently identified.',
    },
    {
      q: 'Q9: What is the architectural stack of this web application?',
      a: 'The project is engineered as a modern, high-performance hybrid system:\n• Frontend: React 19 SPA running on Vite 6 and Tailwind CSS v4, providing sub-millisecond reactive UI updates.\n• 3D Scene Layer: Procedural Three.js WebGL engine rendering architectural library stacks, banker lamps, fluted columns, and atmospheric dust motes with PBR tone-mapping.\n• Floorplan Canvas: Interactive SVG engine with 2D spatial coordinate scaling, real-time agent simulation (Electric AGV Car, Navigation Pointer, Book Bot) with animated dual headlights and compass heading.\n• Cloud Persistence & Auth: Google Firebase Firestore and Firebase Authentication for saving and retrieving route manifests.\n• Algorithmic Engine: Mirrored TypeScript engine for client-side instant dispatch alongside a standalone pure Python 3.10 reference package in library_agent/.',
    },
    {
      q: 'Q10: How do the automated unit tests prove the correctness of the search algorithms?',
      a: 'The suite contains 10 rigorous unit tests executed via Python unittest and accessible through the frontend Test Suite panel:\n1. test_astar_finds_optimal_path: Verifies lowest-cost route matches ground truth.\n2. test_astar_cheaper_than_bfs_on_weighted_graph: Proves A* cost is strictly less than BFS cost on weighted corridors.\n3. test_heuristic_admissibility: Evaluates h(n, goal) ≤ h*(n, goal) across all 14 graph nodes.\n4. test_closed_section_rerouting: Ensures automatic detouring when critical corridors are closed.\n5. test_crowded_aisle_penalty: Confirms 2.5× transit multiplier is applied.\n6. test_restricted_shelf_permission: Verifies Rare Manuscripts requires valid security clearance.\n7. test_multi_book_optimizer_and_time_limit: Confirms TSP sequence optimization and priority budget pruning.\n8. test_bfs_basic_path, test_dfs_basic_path, test_graph_integrity.',
    },
  ];

  return (
    <div className="space-y-6 print:space-y-4 print:text-black print:bg-white">
      {/* Top Action Header (Hidden in Print) */}
      <div className="print:hidden p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-white to-teal-50 dark:from-[#0D1527] dark:via-[#0E1A33] dark:to-[#0D1527] border border-emerald-200 dark:border-emerald-500/30 shadow-md dark:shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-display font-bold text-slate-900 dark:text-slate-100">
                Viva Voce Defense & Technical Dossier
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/50 font-semibold">
                Official Exam Guide
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Comprehensive academic defense documentation, mathematical proofs, algorithm derivations, and sample examiner questions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href="/api/download-viva-pdf"
            download="The_Alexandria_Codex_Viva_Voce_and_System_Dossier.pdf"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 font-bold text-xs font-mono shadow-lg shadow-emerald-600/20 dark:shadow-emerald-500/20 transition-all cursor-pointer"
            title="Download standalone PDF document"
          >
            <Download className="w-4 h-4 text-white dark:text-slate-950" />
            <span>Download PDF File (.pdf)</span>
          </a>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-semibold text-xs font-mono transition-all cursor-pointer shadow-xs dark:shadow-none"
            title="Open browser print / export dialog"
          >
            <Printer className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <span>Print Dialog</span>
          </button>
        </div>
      </div>

      {/* PRINT-READY DOSSIER CONTAINER */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0A0E17] p-6 sm:p-10 shadow-md dark:shadow-2xl space-y-8 text-xs font-sans print:border-none print:shadow-none print:p-0 print:text-black">
        {/* Cover Header Banner */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-6 print:border-black print:pb-4">
          <div className="flex items-center justify-between gap-4 text-[11px] font-mono text-slate-600 dark:text-slate-400 print:text-black mb-2">
            <span>PROJECT DEFENSE DOSSIER</span>
            <span>UNIVERSITY LIBRARY AUTONOMOUS DISPATCH SYSTEM</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-slate-100 print:text-black tracking-tight">
            The Alexandria Codex: Autonomous Spatial Navigation & Graph Optimization
          </h1>
          <p className="text-slate-700 dark:text-slate-300 print:text-gray-800 text-xs sm:text-sm mt-2 max-w-3xl leading-relaxed">
            An artificial intelligence navigation, cartography, and multi-goal Traveling Salesperson logistics agent engineered to optimize book retrieval routes across university libraries using classical graph search (BFS, DFS, A*) and local heuristic optimization.
          </p>
          <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/60 print:border-gray-300 text-[11px] font-mono text-emerald-700 dark:text-emerald-400 print:text-black font-semibold">
            <span>Author: Student / Research Engineer</span>
            <span>·</span>
            <span>Course: Artificial Intelligence & Autonomous Agents</span>
            <span>·</span>
            <span>Topology: 14 Nodes, 20 Corridors, 20 Books</span>
            <span>·</span>
            <span>Target Runtime: Python 3.10 / React 19</span>
          </div>
        </div>

        {/* Section 1: Executive Summary & Project Purpose */}
        <section className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 print:border-gray-400 pb-2">
            <h3 className="font-display font-bold text-slate-900 dark:text-slate-100 print:text-black text-sm uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-mono">1</span>
              Executive Summary & Project Scope
            </h3>
            <button
              onClick={() => handleCopy('sec1', 'Executive Summary: The Alexandria Codex is an intelligent spatial dispatch system...')}
              className="print:hidden text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition-colors cursor-pointer"
              title="Copy Section"
            >
              {copiedSection === 'sec1' ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="text-slate-700 dark:text-slate-300 print:text-gray-900 leading-relaxed">
            In modern university libraries and archive repositories, patrons and automated guided vehicles (AGVs) frequently waste significant transit time navigating circuitous multi-tier stacks, encountering closed maintenance corridors, and getting trapped in congested reading hallways.
          </p>
          <p className="text-slate-700 dark:text-slate-300 print:text-gray-900 leading-relaxed">
            <strong>The Alexandria Codex</strong> addresses this through rigorous graph-theoretic formulation:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 print:text-gray-800 pl-2">
            <li><strong className="text-slate-800 dark:text-slate-200">Single-Book Pathfinding:</strong> Implements pure Breadth-First Search (BFS), Depth-First Search (DFS), and A* Search with an admissible Euclidean heuristic to compute mathematically cost-optimal routes.</li>
            <li><strong className="text-slate-800 dark:text-slate-200">Multi-Book Collection Tour:</strong> Formulates multi-stop book gathering as an obstacle-aware Traveling Salesperson Problem (TSP) with fixed endpoints, resolved via exact permutations for small batches and Nearest-Neighbor + 2-Opt local search for larger orders.</li>
            <li><strong className="text-slate-800 dark:text-slate-200">Dynamic Operational Constraints:</strong> Models temporary wing closures, corridor congestion multipliers (2.5×), security clearances (Rare Manuscripts vault), out-of-stock titles, and user time budget enforcement.</li>
            <li><strong className="text-slate-800 dark:text-slate-200">Dual Cost Modeling:</strong> Dynamically optimizes for either minimal footstep distance (meters) or total mission duration (seconds including per-book physical retrieval time).</li>
          </ul>
        </section>

        {/* Section 2: Mathematical Formulation & Algorithm Complexities */}
        <section className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 print:border-gray-400 pb-2">
            <h3 className="font-display font-bold text-slate-900 dark:text-slate-100 print:text-black text-sm uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-mono">2</span>
              Mathematical Formulation & Heuristic Proof
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#080C14] border border-slate-200 dark:border-slate-800 print:border-gray-400 print:bg-gray-50 space-y-2">
              <div className="font-mono font-bold text-emerald-700 dark:text-emerald-400 print:text-black text-xs uppercase">
                A* Cost Evaluation Function
              </div>
              <div className="p-2.5 rounded-lg bg-white dark:bg-[#05080E] print:bg-white border border-slate-300 dark:border-slate-800 print:border-gray-300 font-mono text-[11px] text-center text-emerald-800 dark:text-emerald-300 print:text-black font-semibold">
                f(n) = g(n) + h(n)
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 print:text-gray-700 leading-normal">
                • <strong className="text-slate-800 dark:text-slate-200">g(n):</strong> The exact path cost accrued from the initial start node s₀ to node n through graph edges.<br />
                • <strong className="text-slate-800 dark:text-slate-200">h(n):</strong> The estimated lower-bound cost from node n to the target goal.<br />
                • <strong className="text-slate-800 dark:text-slate-200">f(n):</strong> The estimated total cost of the cheapest solution path passing through node n.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#080C14] border border-slate-200 dark:border-slate-800 print:border-gray-400 print:bg-gray-50 space-y-2">
              <div className="font-mono font-bold text-teal-700 dark:text-teal-400 print:text-black text-xs uppercase">
                Admissible Euclidean Distance Heuristic
              </div>
              <div className="p-2.5 rounded-lg bg-white dark:bg-[#05080E] print:bg-white border border-slate-300 dark:border-slate-800 print:border-gray-300 font-mono text-[11px] text-center text-teal-800 dark:text-teal-300 print:text-black font-semibold">
                h(n) = √((x_n - x_goal)² + (y_n - y_goal)²)
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 print:text-gray-700 leading-normal">
                <strong className="text-slate-800 dark:text-slate-200">Theorem:</strong> h(n) ≤ h*(n) ∀ n ∈ V.<br />
                <strong className="text-slate-800 dark:text-slate-200">Proof:</strong> The shortest distance between two points in Euclidean space is a line segment. Any physical corridor path involves turns, walls, or detours. Thus, corridor distance ≥ straight-line distance. Since h(n) never overestimates, A* is strictly cost-optimal.
              </p>
            </div>
          </div>

          {/* Algorithm Comparison Matrix */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 print:border-gray-400 bg-slate-50 dark:bg-[#080C14] print:bg-white mt-3">
            <table className="w-full text-left font-mono text-[11px]">
              <thead className="bg-slate-100 dark:bg-[#0D1321] print:bg-gray-200 text-slate-700 dark:text-slate-300 print:text-black uppercase text-[10px] border-b border-slate-200 dark:border-slate-800 print:border-gray-400">
                <tr>
                  <th className="px-3 py-2 font-semibold">Algorithm</th>
                  <th className="px-3 py-2 font-semibold">Data Structure</th>
                  <th className="px-3 py-2 font-semibold">Time Complexity</th>
                  <th className="px-3 py-2 font-semibold">Space Complexity</th>
                  <th className="px-3 py-2 font-semibold">Completeness</th>
                  <th className="px-3 py-2 font-semibold">Optimality</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 print:divide-gray-300 text-slate-800 dark:text-slate-300 print:text-black">
                <tr className="hover:bg-slate-100 dark:hover:bg-slate-900/50">
                  <td className="px-3 py-2 font-bold text-emerald-700 dark:text-emerald-400 print:text-black">A* Search</td>
                  <td className="px-3 py-2">Min-Priority Queue (Heap)</td>
                  <td className="px-3 py-2">O(b^d) worst-case</td>
                  <td className="px-3 py-2">O(b^d) stores frontier</td>
                  <td className="px-3 py-2 text-emerald-700 dark:text-emerald-400 print:text-black">Yes</td>
                  <td className="px-3 py-2 font-bold text-emerald-700 dark:text-emerald-400 print:text-black">Yes (Cost-Optimal)</td>
                </tr>
                <tr className="hover:bg-slate-100 dark:hover:bg-slate-900/50">
                  <td className="px-3 py-2 font-bold text-sky-700 dark:text-sky-400 print:text-black">BFS</td>
                  <td className="px-3 py-2">FIFO Queue (deque)</td>
                  <td className="px-3 py-2">O(b^d)</td>
                  <td className="px-3 py-2">O(b^d)</td>
                  <td className="px-3 py-2 text-emerald-700 dark:text-emerald-400 print:text-black">Yes</td>
                  <td className="px-3 py-2 text-amber-700 dark:text-amber-400 print:text-black">Hop-Optimal Only</td>
                </tr>
                <tr className="hover:bg-slate-100 dark:hover:bg-slate-900/50">
                  <td className="px-3 py-2 font-bold text-amber-700 dark:text-amber-400 print:text-black">DFS</td>
                  <td className="px-3 py-2">LIFO Stack</td>
                  <td className="px-3 py-2">O(b^m)</td>
                  <td className="px-3 py-2 font-bold text-emerald-700 dark:text-emerald-400 print:text-black">O(b · m) Low Space</td>
                  <td className="px-3 py-2 text-emerald-700 dark:text-emerald-400 print:text-black">Yes (finite graph)</td>
                  <td className="px-3 py-2 text-rose-700 dark:text-rose-400 print:text-black">No (Not Optimal)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 3: Full Website Architecture Walkthrough */}
        <section className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 print:border-gray-400 pb-2">
            <h3 className="font-display font-bold text-slate-900 dark:text-slate-100 print:text-black text-sm uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-mono">3</span>
              Complete Website Component Walkthrough
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px]">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#080C14] border border-slate-200 dark:border-slate-800 print:border-gray-400 print:bg-white space-y-1.5">
              <div className="font-bold text-slate-900 dark:text-slate-200 print:text-black flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                1. Single Search Panel & Scrubber
              </div>
              <p className="text-slate-600 dark:text-slate-400 print:text-gray-700 leading-relaxed">
                Allows selecting any start node, target book, search algorithm (BFS/DFS/A*), and cost metric. Features an interactive step-by-step scrubber slider that replays state expansions, displaying the Open List (priority queue) and Closed List (explored set) with g, h, f values and parent pointers.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#080C14] border border-slate-200 dark:border-slate-800 print:border-gray-400 print:bg-white space-y-1.5">
              <div className="font-bold text-slate-900 dark:text-slate-200 print:text-black flex items-center gap-1.5">
                <Route className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                2. Multi-Book TSP Optimizer
              </div>
              <p className="text-slate-600 dark:text-slate-400 print:text-gray-700 leading-relaxed">
                Facilitates multi-stop collection missions. Runs pairwise A* to compute the metric distance matrix, then applies permutation solving (≤7 waypoints) or Nearest-Neighbor + 2-Opt. Enforces user time budgets with automated greedy pruning of lower-priority books.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#080C14] border border-slate-200 dark:border-slate-800 print:border-gray-400 print:bg-white space-y-1.5">
              <div className="font-bold text-slate-900 dark:text-slate-200 print:text-black flex items-center gap-1.5">
                <GitCompare className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                3. Algorithm Lab (Head-to-Head Benchmark)
              </div>
              <p className="text-slate-600 dark:text-slate-400 print:text-gray-700 leading-relaxed">
                Direct side-by-side comparison executing BFS, DFS, and A* simultaneously over identical parameters. Displays comparative metrics including total cost, nodes expanded, corridor hops, and search duration.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#080C14] border border-slate-200 dark:border-slate-800 print:border-gray-400 print:bg-white space-y-1.5">
              <div className="font-bold text-slate-900 dark:text-slate-200 print:text-black flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                4. Floorplan Canvas & Vehicle Simulation
              </div>
              <p className="text-slate-600 dark:text-slate-400 print:text-gray-700 leading-relaxed">
                Interactive 2D architectural blueprint rendering all 14 library zones, nodes, and corridors. Features live autonomous simulation with selectable vehicle objects (Electric AGV Car, High-Tech Navigation Pointer, Book Bot) with animated projected headlights, wheels, and compass orientation.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#080C14] border border-slate-200 dark:border-slate-800 print:border-gray-400 print:bg-white space-y-1.5">
              <div className="font-bold text-slate-900 dark:text-slate-200 print:text-black flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                5. Three.js 3D Background Atmosphere
              </div>
              <p className="text-slate-600 dark:text-slate-400 print:text-gray-700 leading-relaxed">
                GPU-accelerated WebGL background rendering procedural library stacks, mahogany scholar desks with green banker lamps, fluted columns, and floating motes. Supports 4 presets (Grand Atrium, Cyber Stacks, Scholar Vault, Celestial Graph) with camera parallax and intensity controls.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#080C14] border border-slate-200 dark:border-slate-800 print:border-gray-400 print:bg-white space-y-1.5">
              <div className="font-bold text-slate-900 dark:text-slate-200 print:text-black flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                6. Test Suite & Python Source Explorer
              </div>
              <p className="text-slate-600 dark:text-slate-400 print:text-gray-700 leading-relaxed">
                One-click live execution of the 10 Python unit tests through the Express/Vite backend proxy, with detailed execution logs and an in-app viewer for the backend Python scripts (graph_model.py, search.py, multi_book.py).
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: 10 Core Viva Voce Questions & Model Answers */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 print:border-gray-400 pb-2">
            <h3 className="font-display font-bold text-slate-900 dark:text-slate-100 print:text-black text-sm uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-mono">4</span>
              High-Yield Examiner Viva Voce Questions & Answers
            </h3>
          </div>

          <div className="space-y-3">
            {vivaQuestions.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 print:border-gray-400 bg-slate-50 dark:bg-[#080C14] print:bg-white overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full px-4 py-3 text-left font-semibold text-slate-900 dark:text-slate-100 print:text-black text-xs flex items-center justify-between gap-3 hover:bg-slate-100 dark:hover:bg-slate-900/60 transition-colors cursor-pointer"
                  >
                    <span>{item.q}</span>
                    <span className="print:hidden text-slate-500 dark:text-slate-400">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  </button>
                  <div className={`px-4 pb-3.5 text-[11px] text-slate-700 dark:text-slate-300 print:text-gray-800 whitespace-pre-line leading-relaxed border-t border-slate-200 dark:border-slate-800/60 print:border-gray-300 pt-2 ${isOpen ? 'block' : 'print:block hidden'}`}>
                    {item.a}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 5: Demonstration Script */}
        <section className="space-y-3 print:pt-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 print:border-gray-400 pb-2">
            <h3 className="font-display font-bold text-slate-900 dark:text-slate-100 print:text-black text-sm uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-mono">5</span>
              Recommended 3-Minute Viva Demonstration Script
            </h3>
          </div>

          <div className="space-y-2 text-[11px] text-slate-700 dark:text-slate-300 print:text-gray-800 leading-relaxed font-mono">
            <p><strong className="text-slate-900 dark:text-slate-100">Step 1 (Single Search & Optimality):</strong> "First, I select Entrance to Computer Science under A* in distance mode. A* computes the optimal 20-meter corridor route. When I switch to BFS, notice how it picks a direct 60-meter route because BFS only counts hops, proving why A* is superior on weighted spatial graphs."</p>
            <p><strong className="text-slate-900 dark:text-slate-100">Step 2 (Scrubber & Telemetry):</strong> "I drag the step scrubber to inspect step 3. The Open List shows state candidates ordered by f(n) = g(n) + h(n), while the Closed List contains fully evaluated nodes with their parent backpointers."</p>
            <p><strong className="text-slate-900 dark:text-slate-100">Step 3 (Dynamic Obstacles):</strong> "Now I click on the Reference Desk to mark it Closed for maintenance. Instantly, A* dynamically re-plans an alternate detour path around the obstacle."</p>
            <p><strong className="text-slate-900 dark:text-slate-100">Step 4 (Vehicle Simulation):</strong> "On the floorplan canvas, I switch the simulation object from AGV Car to Navigation Pointer, and press Simulate Route. The animated object navigates smoothly along the path, orienting to its corridor heading."</p>
            <p><strong className="text-slate-900 dark:text-slate-100">Step 5 (Multi-Book TSP & Pruning):</strong> "In the Multi-Book TSP tab, I select 4 books and set a 300-second budget limit. The 2-Opt solver orders the shelves efficiently, and automatically drops non-essential low-priority books if the budget is exceeded."</p>
          </div>
        </section>
      </div>
    </div>
  );
};
