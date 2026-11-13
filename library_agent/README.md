# 📚 Intelligent Library Search and Book Collection Agent

An AI navigation and logistics agent that locates books in a university library environment and computes optimal routes for single-target search and multi-book collection missions using classical search algorithms (**BFS**, **DFS**, **A\***) and **Traveling Salesperson (TSP) heuristic optimization**.

---

## 🌟 Features

- **Custom-Engineered Search Algorithms**: Pure Python implementation of **Breadth-First Search (BFS)**, **Depth-First Search (DFS)**, and **A\* Search** without external graph search libraries.
- **Admissible Euclidean Heuristic**: Uses 2D spatial coordinates to guarantee minimum Euclidean lower-bounds ($h(n) \le h^*(n)$) for cost-optimal routing.
- **Dual Cost Modes**:
  - **Walking Distance Mode**: Physical distance in meters with congestion multipliers.
  - **Collection Time Mode**: Real-world transit time ($t = \frac{d}{v_{walk}}$) + per-book pickup duration ($45s$) + crowd delay factors.
- **Dynamic Real-World Constraints**:
  - 🚧 **Closed Sections**: Corridors under maintenance or cleaning cannot be entered.
  - 👥 **Crowded Aisles**: Congested pathways incur a $2.5\times$ traversal penalty.
  - 🔐 **Restricted Archives**: Rare manuscript archives require verified permission to access.
  - ❌ **Unavailable Books**: Out-of-stock or borrowed titles are reported and excluded.
  - ⏱️ **Time Budget Limits**: Automated greedy pruning drops low-priority books if the user's mission time budget is exceeded.
- **Multi-Book TSP Optimizer**: Computes all-pairs shortest paths via A*, then uses exact permutations ($\le 7$ waypoints) or Nearest-Neighbor + 2-Opt local search for larger orders with priority weighting.
- **Search Telemetry & Step Scrubber**: Full step-by-step breakdown of the Open List (frontier) and Closed List (explored) with $g(n)$, $h(n)$, $f(n)$, and parent pointers.
- **Interactive Visualizations**: High-contrast NetworkX + Matplotlib graph drawing and side-by-side comparative analytics.

---

## 🚀 Setup & Execution

### Prerequisites
- Python 3.10 or higher
- pip package manager

### 1. Installation
Clone or navigate to the project directory:
```bash
cd library_agent
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Launch the Streamlit Web Application
```bash
streamlit run app.py
```
Open your browser at `http://localhost:8501`.

### 3. Run the Unit Test Suite
```bash
python3 -m unittest discover -s tests -p "test_*.py" -v
```
All tests should pass with status `OK`.

---

## 🏗️ Project Architecture

```
library_agent/
├── app.py                 # Interactive Streamlit Web UI with NetworkX visualization
├── graph_model.py         # Graph topology, nodes, edges, books, and heuristic calculation
├── search.py              # BFS, DFS, and A* algorithms with step-by-step telemetry
├── multi_book.py          # Pairwise A*, TSP permutation/2-opt solver, and budget pruning
├── requirements.txt       # Python package dependencies
├── README.md              # Documentation, formulation, and viva preparation
├── data/
│   └── library.json       # Graph layout (14 nodes, 20 edges, 20 books, 2D coordinates)
└── tests/
    └── test_search.py     # 10 unit tests covering optimality, BFS vs A*, and constraints
```

---

## 📐 Formal Problem Formulation

### 1. State Space ($S$)
- **Single-Book Search**:
  $$\text{State } s = \text{current\_location} \in V$$
  where $V$ is the set of library sections, aisles, and shelves.
- **Multi-Book Collection**:
  $$\text{State } s = (\text{current\_location}, \text{collected\_books})$$
  where $\text{current\_location} \in V$ and $\text{collected\_books} \subseteq \text{Catalog}$.

### 2. Initial State ($s_0$)
- Typically $s_0 = \text{"Entrance"}$ with $\text{collected\_books} = \emptyset$.

### 3. Actions ($A(s)$) and Transition Model
- $\text{Action}(s, v)$: Walk from current node $u$ to adjacent node $v \in \text{Adj}(u)$.
- Constraints enforce:
  1. $v \notin \text{ClosedSections}$
  2. $v.\text{restricted} \implies \text{has\_permission} = \text{True}$
- The step cost $c(u, v)$ is:
  $$c_{\text{distance}}(u, v) = \text{base\_dist}(u, v) \times (\text{multiplier if crowded else } 1.0)$$
  $$c_{\text{time}}(u, v) = \frac{\text{base\_dist}(u, v)}{v_{\text{walk}}} \times (\text{multiplier if crowded else } 1.0)$$

### 4. Goal Test
- **Single Book**: $\text{current\_location} == \text{book.shelf}$
- **Multi-Book**: $\text{current\_location} == \text{checkout\_location} \land \text{TargetBooks} \subseteq \text{collected\_books}$

### 5. Admissible & Consistent Heuristic ($h(n)$)
The heuristic estimates remaining cost to the goal coordinate $(x_g, y_g)$ from node $n$ at $(x_n, y_n)$:
$$h_{\text{distance}}(n) = \sqrt{(x_n - x_g)^2 + (y_n - y_g)^2}$$
$$h_{\text{time}}(n) = \frac{\sqrt{(x_n - x_g)^2 + (y_n - y_g)^2}}{v_{\text{walk\_max}}}$$

**Proof of Admissibility**:
The Euclidean distance is the shortest possible physical distance between two points in Euclidean space (straight-line segment). Any walkable path through library corridors must be greater than or equal to the straight-line distance due to the triangle inequality:
$$h(n) \le h^*(n) \quad \forall n \in V$$
Because corridors only add detours and speed is capped at $v_{\text{walk\_max}}$, the time heuristic is also strictly admissible.

---

## 📊 Algorithm Complexity Summary

| Algorithm | Data Structure | Time Complexity | Space Complexity | Completeness | Optimality |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **BFS** | FIFO Queue (`collections.deque`) | $O(b^d)$ | $O(b^d)$ | Yes (finite $b$) | Only in hop count (unweighted) |
| **DFS** | LIFO Stack (`list`) | $O(b^m)$ | $O(b \cdot m)$ | Yes (finite graph, visited set) | No |
| **A\*** | Min-Priority Queue (`heapq`) | $O(b^d)$ worst-case | $O(b^d)$ | Yes | **Yes (cost-optimal)** |

*$b$ = branching factor, $d$ = depth of shallowest goal, $m$ = maximum depth of search tree.*

### Why A* Outperforms BFS on Weighted Graphs
BFS expands uniformly by graph edge count (hop count). If a direct corridor exists between Start and Goal with high distance (e.g., $60\text{ m}$), BFS immediately accepts this 1-hop path.
In contrast, A* evaluates the actual path cost $g(n)$ plus admissible heuristic $h(n)$. It discovers that a 2-hop route through an intermediate corridor ($10\text{ m} + 10\text{ m} = 20\text{ m}$) costs significantly less ($20\text{ m} < 60\text{ m}$), guaranteeing the true lowest-cost route.

---

## 🖼️ UI Walkthrough & Features

1. **Sidebar Navigation**:
   - Dynamic mode switcher (Single Book, Multi-Book TSP, 3-Way Algorithm Comparison).
   - Instant cost toggle between Meters and Seconds.
   - Interactive dropdowns for closed corridor selection, congested aisles, and archive clearance.
2. **Interactive Graph View**:
   - Traversed route in vibrant green.
   - Closed sections marked with crimson fills.
   - Congested aisles highlighted in bright amber.
   - Restricted sections indicated by dashed borders.
3. **Search Frontier Telemetry**:
   - Interactive step slider to replay node-by-node expansions.
   - Live inspection table of both the Open List and Closed List showing $g$, $h$, $f$, and parent lineage.
4. **Side-by-Side Comparison**:
   - Comprehensive performance metrics table comparing BFS, DFS, and A*.

---

## 🎓 Viva / Defense Questions & Answers

### Q1: What makes the heuristic function $h(n)$ used in this agent admissible?
**Answer:** An admissible heuristic never overestimates the true cost to reach the goal ($h(n) \le h^*(n)$). In our library agent, $h(n)$ is the straight-line Euclidean distance calculated from 2D coordinates: $\sqrt{(x_n - x_g)^2 + (y_n - y_g)^2}$. Since the Euclidean line is the absolute minimum distance between two points in geometry, any walkable library aisle or detour must be at least as long as this straight line. Thus, $h(n)$ is strictly admissible and consistent, guaranteeing that A* finds the optimal path.

### Q2: Why can Breadth-First Search (BFS) produce a suboptimal path in this library system?
**Answer:** BFS finds the path with the minimal number of edges (hops) from the start to the goal node. However, library corridors have varying physical lengths (weights) and congestion delays. For example, a direct corridor of 1 hop might be 60 meters, while an alternate path with 2 hops might only be 20 meters ($10\text{m} + 10\text{m}$). BFS will pick the 60m path because it has fewer edges, whereas A* evaluates $g(n)$ and selects the true lowest-cost 20m route.

### Q3: How is the Multi-Book Collection Problem formulated and solved?
**Answer:** The multi-book collection mission is modeled as a Traveling Salesperson Problem (TSP) with fixed endpoints ($\text{Start} \to \text{Shelf}_1 \to \dots \to \text{Shelf}_k \to \text{Checkout}$). First, the agent runs A* pairwise between all required shelf locations to construct a cost matrix. Then, if the unique shelf count is $\le 7$, it evaluates exact permutations to find the mathematically optimal sequence. For larger collections, it uses a Greedy Nearest-Neighbor heuristic followed by 2-Opt local search improvement to uncross routes.

### Q4: How does the agent enforce dynamic real-world constraints like closed corridors and time budgets?
**Answer:** During successor generation, the transition model checks constraints: any node in `closed_sections` or restricted shelves without user clearance is filtered out of the neighbor list, preventing the agent from considering them. In multi-book mode, if the total estimated mission time (transit time + pickup duration) exceeds the user's time limit, the agent iteratively drops the lowest-priority books (Priority 3 first) and replans until the route fits within budget, reporting each skipped item with specific rationale.

### Q5: What is the purpose of the Closed List in A* search, and can a node ever be re-opened?
**Answer:** The Closed List (or explored set) prevents the search from getting stuck in infinite loops and avoids redundant re-expansion of previously explored states. With a consistent (monotone) heuristic like our Euclidean metric, when A* expands a node, the path to that node is guaranteed to be optimal; thus, nodes in the Closed List never need to be reopened. If the heuristic were only admissible but not consistent, a node might need to be reopened if a cheaper $g$-cost path is discovered later.
