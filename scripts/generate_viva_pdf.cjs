/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Ensure public directory exists
const publicDir = path.resolve(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const outputPath = path.resolve(publicDir, 'The_Alexandria_Codex_Viva_Voce_and_System_Dossier.pdf');
const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 45, bottom: 45, left: 45, right: 45 },
  info: {
    Title: 'The Alexandria Codex: Autonomous Spatial Navigation & Viva Voce Dossier',
    Author: 'Autonomous Systems & AI Laboratory',
    Subject: 'Artificial Intelligence Graph Search, A*, BFS, DFS, and TSP 2-Opt Optimization',
    Keywords: 'AI, Graph Search, A*, BFS, DFS, TSP, Heuristic, Viva Voce',
  },
});

const writeStream = fs.createWriteStream(outputPath);
doc.pipe(writeStream);

// Helper styles
const colors = {
  primary: '#064E3B',       // Deep emerald
  accent: '#059669',        // Mid emerald
  highlight: '#D97706',     // Amber
  textDark: '#0F172A',      // Slate 900
  textMuted: '#475569',     // Slate 600
  cardBg: '#F8FAFC',        // Slate 50
  cardBorder: '#CBD5E1',    // Slate 300
  codeBg: '#0F172A',        // Dark slate for code
  codeText: '#34D399',      // Mint code text
};

function drawHeaderBanner(title, subtitle) {
  doc.rect(45, 45, 505, 55).fill(colors.primary);
  doc.fillColor('#FFFFFF').fontSize(16).font('Helvetica-Bold').text(title, 55, 55, { width: 485 });
  doc.fillColor('#A7F3D0').fontSize(9).font('Helvetica').text(subtitle, 55, 78, { width: 485 });
  doc.y = 115;
}

function drawSectionHeading(num, text) {
  doc.moveDown(0.8);
  const startY = doc.y;
  doc.rect(45, startY, 20, 16).fill(colors.accent);
  doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold').text(String(num), 45, startY + 3, { width: 20, align: 'center' });
  doc.fillColor(colors.primary).fontSize(13).font('Helvetica-Bold').text(text, 72, startY + 1);
  doc.strokeColor(colors.cardBorder).lineWidth(0.8).moveTo(45, startY + 20).lineTo(550, startY + 20).stroke();
  doc.moveDown(0.6);
}

function drawSubheading(text) {
  doc.fillColor(colors.accent).fontSize(10.5).font('Helvetica-Bold').text(text);
  doc.moveDown(0.2);
}

function drawParagraph(text) {
  doc.fillColor(colors.textDark).fontSize(9).font('Helvetica').text(text, { align: 'justify', lineGap: 2.5 });
  doc.moveDown(0.4);
}

function drawBullet(title, desc) {
  doc.fillColor(colors.primary).fontSize(9).font('Helvetica-Bold').text(`• ${title}: `, { continued: true });
  doc.fillColor(colors.textDark).font('Helvetica').text(desc, { lineGap: 2 });
  doc.moveDown(0.25);
}

function drawFormulaBox(title, formula, explanation) {
  const boxY = doc.y;
  doc.rect(45, boxY, 505, 52).fillAndStroke(colors.cardBg, colors.cardBorder);
  doc.fillColor(colors.primary).fontSize(8.5).font('Helvetica-Bold').text(title.toUpperCase(), 55, boxY + 6);
  doc.fillColor(colors.accent).fontSize(11).font('Helvetica-Bold').text(formula, 55, boxY + 18, { align: 'center', width: 485 });
  doc.fillColor(colors.textMuted).fontSize(8).font('Helvetica').text(explanation, 55, boxY + 34, { width: 485, align: 'center' });
  doc.y = boxY + 58;
}

// ==========================================
// PAGE 1: TITLE & EXECUTIVE SUMMARY
// ==========================================
drawHeaderBanner(
  'THE ALEXANDRIA CODEX',
  'AUTONOMOUS SPATIAL NAVIGATION & HEURISTIC GRAPH OPTIMIZATION'
);

doc.fillColor(colors.textMuted).fontSize(8.5).font('Helvetica-Oblique').text(
  'Comprehensive Academic Viva Voce Defense Dossier | Artificial Intelligence & Robotics Examination Guide',
  45, doc.y
);
doc.moveDown(0.5);

drawSectionHeading(1, 'Executive Summary & System Purpose');
drawParagraph(
  'The Alexandria Codex is an artificial intelligence navigation, cartography, and multi-goal collection agent engineered to solve real-world logistical transit challenges in large university libraries, archives, and automated storage facilities. Patrons and Automated Guided Vehicles (AGVs) frequently encounter convoluted multi-tier aisles, unanticipated maintenance corridor closures, and congested reading rooms. This project formulates the entire navigation environment into an obstacle-aware weighted graph with exact Euclidean geometry, providing cost-optimal single-target routing and time-budgeted multi-book Traveling Salesperson (TSP) tours.'
);

drawSubheading('Core Capabilities & Engineering Milestones:');
drawBullet('Classical Graph Search', 'Custom-engineered pure implementations of Breadth-First Search (BFS), Depth-First Search (DFS), and A* Search without third-party black-box libraries.');
drawBullet('Admissible Euclidean Heuristic', 'Rigorous mathematical proof ensuring h(n) <= h*(n) across all 14 library zones and 20 weighted corridors.');
drawBullet('Multi-Book TSP Optimization', 'All-pairs obstacle-aware metric construction via pairwise A*, solved via exact permutations (k <= 7) or Greedy Nearest-Neighbor + 2-Opt local search for larger orders.');
drawBullet('Dynamic Real-World Constraints', 'Active avoidance of closed sections, 2.5x crowd transit penalties, security clearances for Rare Manuscripts, and greedy priority-based time budget pruning.');
drawBullet('Dual Cost Modeling', 'Independent optimization for physical footstep distance (meters) or complete mission duration (seconds, including per-book shelf inspection time).');
drawBullet('Interactive Simulation Engine', 'Vector SVG floorplan with autonomous vehicle simulation (Electric AGV Car, Directional Navigation Pointer, Book Bot) and GPU Three.js WebGL procedural backdrop.');

drawSectionHeading(2, 'State Space Problem Formulation');
drawParagraph(
  'The library navigation agent is formally defined as a mathematical 5-tuple: (S, s₀, A(s), T(s, a), G):'
);
drawBullet('State Space (S)', 'For single search, s in V represents current node. For multi-book TSP, s = (current_node, collected_books), where collected_books is a subset of the catalog.');
drawBullet('Initial State (s₀)', 's₀ = "Entrance" with collected_books = ∅.');
drawBullet('Action Space A(s)', 'Moving from current node u to any neighbor v in Adj(u) provided v is not in ClosedSections and (v.restricted implies has_permission).');
drawBullet('Step Cost c(u, v)', 'Distance mode: c = dist(u,v) * (2.5 if crowded else 1.0). Time mode: c = (dist(u,v) / 1.2 m/s) * crowd_penalty.');
drawBullet('Goal Test (G)', 'Single book: current_location == book.shelf. Multi-book: current_location == checkout AND all target books collected.');

// ==========================================
// PAGE 2: ALGORITHM ANALYSIS & PROOFS
// ==========================================
doc.addPage();
drawHeaderBanner('MATHEMATICAL FORMULATIONS & ALGORITHM COMPARISON', 'FORMAL COMPLEXITY ANALYSIS & HEURISTIC ADMISSIBILITY');

drawSectionHeading(3, 'Heuristic Admissibility & Consistency Proof');
drawFormulaBox(
  'A* Evaluation Function',
  'f(n) = g(n) + h(n)',
  'g(n) = exact accumulated cost from start to n | h(n) = estimated remaining cost to goal'
);
doc.moveDown(0.3);

drawFormulaBox(
  'Euclidean Straight-Line Distance Heuristic',
  'h(n) = √((x_n - x_goal)² + (y_n - y_goal)²)',
  'Calculated directly from 2D spatial coordinates (x, y) assigned to library nodes'
);
doc.moveDown(0.4);

drawSubheading('Mathematical Proof of Admissibility:');
drawParagraph(
  'Theorem: The Euclidean distance heuristic h(n) is strictly admissible, meaning h(n) <= h*(n) for all nodes n in V, where h*(n) is the true optimal cost from n to the goal.\n' +
  'Proof: In 2D Euclidean space, the shortest possible continuous trajectory between two points (x_n, y_n) and (x_goal, y_goal) is the straight line segment connecting them. In a real-world library, corridors and aisles are constrained by bookshelves, walls, and hallways, which introduce right-angle turns and detours. By the geometric Triangle Inequality, any physical walking route has length L >= h(n). Since step costs represent physical distance (or distance / max_velocity), the heuristic never overestimates the true cost. Therefore, A* graph search is guaranteed to return the cost-optimal path.'
);

drawSubheading('Proof of Monotonicity (Consistency):');
drawParagraph(
  'A heuristic is consistent if for every node n and every neighbor n\' generated by action a, h(n) <= c(n, a, n\') + h(n\'). Since the Euclidean distance satisfies the triangle inequality d(n, goal) <= d(n, n\') + d(n\', goal) and corridor edge costs c(n, n\') >= d(n, n\'), the condition strictly holds. As a consequence, f(n) is non-decreasing along every path, and nodes added to the Closed List (explored set) never require reopening.'
);

drawSectionHeading(4, 'Algorithm Complexity & Benchmark Matrix');

// Table layout
const tableTop = doc.y + 4;
const cols = [110, 110, 95, 95, 55, 80];
const colX = [45, 155, 265, 360, 455, 510];

doc.rect(45, tableTop, 505, 18).fill('#0D1321');
const headers = ['Algorithm', 'Data Structure', 'Time Compl.', 'Space Compl.', 'Complete?', 'Optimality'];
doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
headers.forEach((h, i) => doc.text(h, colX[i] + 4, tableTop + 5, { width: cols[i] - 8 }));

const rows = [
  ['A* Search', 'Min-Priority Queue (Heap)', 'O(b^d) worst', 'O(b^d) stores frontier', 'Yes', 'Cost-Optimal (100%)'],
  ['Breadth-First (BFS)', 'FIFO Queue (deque)', 'O(b^d)', 'O(b^d)', 'Yes', 'Hop-Optimal Only'],
  ['Depth-First (DFS)', 'LIFO Stack', 'O(b^m)', 'O(b * m) Low Memory', 'Yes (finite)', 'Not Optimal'],
  ['TSP (k <= 7)', 'Full Permutations (k!)', 'O(k! * A*)', 'O(k)', 'Yes', 'Globally Optimal'],
  ['TSP (k > 7)', 'Nearest-Neighbor + 2-Opt', 'O(k² * iterations)', 'O(k)', 'Yes', 'Local Optimum (~97%)'],
];

let rowY = tableTop + 18;
rows.forEach((r, idx) => {
  const bg = idx % 2 === 0 ? '#F8FAFC' : '#FFFFFF';
  doc.rect(45, rowY, 505, 18).fillAndStroke(bg, '#E2E8F0');
  doc.fillColor(idx === 0 ? colors.accent : colors.textDark).fontSize(7.5).font(idx === 0 ? 'Helvetica-Bold' : 'Helvetica');
  r.forEach((val, i) => doc.text(val, colX[i] + 4, rowY + 5, { width: cols[i] - 8 }));
  rowY += 18;
});
doc.y = rowY + 12;

drawSubheading('Crucial Viva Insight: Why BFS Fails on Weighted Corridors:');
drawParagraph(
  'BFS evaluates paths strictly by the number of edges (hops) traversed. If a direct corridor of 60 meters connects Entrance and Goal (1 hop), BFS immediately terminates and selects it. Meanwhile, an alternate path traversing 2 intermediate corridors of 10 meters each costs only 20 meters (2 hops). A* evaluates f(n) = g(n) + h(n), correctly selecting the 20-meter route (saving 66% physical transit distance), proving why BFS is insufficient for real spatial navigation.'
);

// ==========================================
// PAGE 3: MULTI-BOOK TSP & FULL WEBSITE
// ==========================================
doc.addPage();
drawHeaderBanner('MULTI-BOOK TSP & FULL WEBSITE ARCHITECTURE', 'COMBINATORIAL HEURISTICS & INTERACTIVE CARTOGRAPHY');

drawSectionHeading(5, 'Multi-Book TSP Formulation & 2-Opt Algorithm');
drawParagraph(
  'The multi-book collection mission is modeled as an NP-hard Traveling Salesperson Problem with fixed start and termination endpoints: Entrance -> Shelf_1 -> ... -> Shelf_k -> Self_Checkout. The system resolves this in three deliberate stages:'
);
drawBullet('Stage 1: All-Pairs Metric Graph', 'The agent executes pairwise A* between all required shelf waypoints to compute obstacle-free corridor distances and store shortest paths.');
drawBullet('Stage 2: Permutation & 2-Opt Search', 'For k <= 7 unique shelves, the agent exhaustively computes all k! permutations to guarantee the true global optimum. For larger orders (k > 7), it applies a Greedy Nearest-Neighbor seed followed by 2-Opt edge exchanges, reversing sub-routes whenever D(A, C) + D(B, D) < D(A, B) + D(C, D).');
drawBullet('Stage 3: Time Budget Enforcement', 'Estimated Mission Duration = (Total Distance / 1.2 m/s) + (45 seconds per book). If this exceeds the user budget, the agent greedily drops low-priority titles (Priority 3 Standard first) and re-optimizes until compliant.');

drawSectionHeading(6, 'Full Website Features & Technical Walkthrough');
drawBullet('1. Single Search Panel', 'Select start/goal, algorithm (BFS/DFS/A*), cost mode, and inspect the real-time Step Scrubber showing Open List (frontier) and Closed List (explored) with g, h, f values and parent pointers.');
drawBullet('2. Multi-Book TSP Panel', 'Manage book collection cart, set time limits (e.g. 600s), execute 2-Opt optimization, and review leg-by-leg transit metrics and pickup waypoints.');
drawBullet('3. Algorithm Lab', 'Simultaneous head-to-head benchmarking of BFS, DFS, and A* under identical conditions, generating side-by-side comparative analytics for viva presentations.');
drawBullet('4. Interactive 2D Floorplan', 'Custom vector blueprint rendering all 14 library zones, nodes, and corridors. Features an autonomous vehicle simulation actor supporting Electric AGV Car, Navigation Pointer, and Book Cart Bot with headlights, wheels, and compass heading.');
drawBullet('5. 3D WebGL Background', 'Three.js procedural architectural library environment featuring multi-tier bookshelves, mahogany desks, banker lamps, fluted columns, and floating motes across 4 presets.');
drawBullet('6. Cloud Persistence & Tests', 'Google Firebase Firestore synchronization for saved route manifests alongside a one-click in-browser runner for the 10 Python backend unit tests.');

drawSectionHeading(7, 'Dynamic Environmental Constraints');
drawBullet('Closed Maintenance Sections', 'Clicking any node marks it closed, removing it from neighbor expansion and triggering dynamic re-routing around the barrier.');
drawBullet('Crowded Aisles (2.5x Penalty)', 'Designates congested corridors. If bypass routes cost less than the 2.5x multiplier, A* autonomously detours around the congestion.');
drawBullet('Special Collections Clearance', 'Protects Rare Manuscripts with security permissions. Unauthorized agents treat the entrance as an impassable wall.');

// ==========================================
// PAGE 4: 15 VIVA QUESTIONS & DEMO SCRIPT
// ==========================================
doc.addPage();
drawHeaderBanner('EXAMINER VIVA VOCE QUESTIONS & DEMONSTRATION SCRIPT', '15 HIGH-YIELD QUESTIONS WITH MODEL ANSWERS & DEMO GUIDE');

drawSectionHeading(8, 'Top 10 High-Yield Viva Voce Questions & Answers');

const questions = [
  ['Q1: What makes the heuristic function h(n) admissible?', 'It calculates the straight-line Euclidean distance between 2D coordinates. Because the straight line is the absolute minimum distance between two points, physical corridors can only add turns and detours. Therefore, h(n) <= h*(n) always holds.'],
  ['Q2: Why does BFS fail on weighted graphs?', 'BFS only counts edge hops. A 1-hop edge of 60m is chosen over a 2-hop route of 10m + 10m = 20m. A* evaluates actual costs g(n) + h(n), guaranteeing the true 20m lowest-cost path.'],
  ['Q3: Why is DFS unsuitable for pathfinding?', 'DFS plunges deep along one branch via a LIFO stack. On cyclic graphs, it takes massive detours and is not cost-optimal, making it hazardous for battery-limited AGVs.'],
  ['Q4: How does the 2-Opt algorithm work in multi-book TSP?', 'It takes an initial tour and iteratively removes two non-adjacent edges, reconnecting the paths in reverse. If the new distance is shorter, the swap is preserved, uncrossing tangled corridor paths.'],
  ['Q5: What is the purpose of the Closed List in A*?', 'It stores already-expanded nodes in a hash set to eliminate cycles and redundant work. Because our heuristic is consistent, nodes in the Closed list never need reopening.'],
  ['Q6: How does the agent enforce dynamic constraints like closed wings?', 'During successor generation, closed nodes are filtered out of the adjacency list, forcing A* to find an alternate obstacle-free route.'],
  ['Q7: How is the time budget enforced?', 'Total time = walking time + 45s pickup per book. If total time exceeds budget, the agent greedily drops Priority 3 books first and re-optimizes until the tour fits within the time limit.'],
  ['Q8: What is the dual cost system?', 'Distance mode minimizes physical meters walked. Time mode calculates transit seconds (velocity = 1.2 m/s) with a 2.5x congestion penalty and per-book physical inspection durations.'],
  ['Q9: How are the 10 unit tests structured?', 'They cover: A* optimality, A* vs BFS cost comparison, heuristic admissibility, closed section detours, crowded corridor penalties, restricted shelf permissions, and TSP priority pruning.'],
  ['Q10: What is the technology stack?', 'Frontend: React 19, TypeScript, Vite, Tailwind CSS v4, Three.js WebGL. Backend/Storage: Python 3.10 reference package, Express/Vite test runner, Google Firebase Firestore & Auth.'],
];

questions.forEach(([q, a]) => {
  doc.fillColor(colors.primary).fontSize(8.5).font('Helvetica-Bold').text(q);
  doc.fillColor(colors.textDark).fontSize(8).font('Helvetica').text(`Answer: ${a}`, { lineGap: 1.5 });
  doc.moveDown(0.3);
});

drawSectionHeading(9, '3-Minute Examiner Demonstration Script');
drawParagraph(
  '1. Single Search: Select Entrance -> Computer Science under A* in distance mode. Highlight the optimal 20m route. Switch to BFS to show the suboptimal 60m path.\n' +
  '2. Scrubber Inspection: Move the step slider to Step 3. Point out the Open List (f = g + h) and Closed List with parent backpointers.\n' +
  '3. Dynamic Obstacle: Click Reference Desk to close it. Show A* immediately re-routing through the catalog hallway.\n' +
  '4. Vehicle Simulation: Select 🚗 Car on the floorplan. Click "Simulate Route" to demonstrate animated headlights, wheels, and corridor heading.\n' +
  '5. Multi-Book TSP: Add 4 books, set a 300s budget, and demonstrate 2-Opt tour ordering and automated priority budget pruning.'
);

doc.end();

writeStream.on('finish', () => {
  console.log(`Successfully generated PDF dossier at: ${outputPath}`);
});
