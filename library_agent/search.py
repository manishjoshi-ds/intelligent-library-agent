"""
Search Algorithms for Intelligent Library Search and Book Collection Agent.

Implements BFS, DFS, and A* from scratch without third-party graph search libraries.
Includes full step-by-step telemetry: open list, closed list snapshots,
nodes expanded, and cost tracking.
"""

from __future__ import annotations

import collections
import heapq
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Tuple

from graph_model import ActionTransition, LibraryGraph


@dataclass
class SearchNodeInfo:
    """Represents a node state inside the search frontier or closed list."""
    node: str
    g: float
    h: float
    f: float
    parent: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "node": self.node,
            "g": round(self.g, 2),
            "h": round(self.h, 2),
            "f": round(self.f, 2),
            "parent": self.parent or "-",
        }


@dataclass
class SearchStepSnapshot:
    """Snapshot of search state at a specific iteration step for UI inspection."""
    step_number: int
    current_node: str
    open_list: List[SearchNodeInfo]
    closed_list: List[SearchNodeInfo]
    action_note: str


@dataclass
class SearchResult:
    """Comprehensive result of a search execution."""
    algorithm: str
    success: bool
    path: List[str]
    total_cost: float
    path_length_edges: int
    nodes_expanded: int
    step_snapshots: List[SearchStepSnapshot]
    message: str
    cost_mode: str = "distance"  # "distance" (meters) or "time" (seconds)


def reconstruct_path(parent_map: Dict[str, Optional[str]], goal_node: str) -> List[str]:
    """Backtracks parent pointers from goal to start to produce the final path."""
    path = []
    curr: Optional[str] = goal_node
    while curr is not None:
        path.append(curr)
        curr = parent_map.get(curr)
    path.reverse()
    return path


def calculate_path_cost(
    graph: LibraryGraph,
    path: List[str],
    crowded_aisles: Optional[Set[Tuple[str, str]]] = None,
    cost_mode: str = "distance",
) -> float:
    """Computes total traversal cost along a specific path."""
    if len(path) <= 1:
        return 0.0
    total = 0.0
    for u, v in zip(path[:-1], path[1:]):
        cost, _ = graph.calculate_edge_cost(u, v, crowded_aisles, cost_mode)
        total += cost
    return total


def breadth_first_search(
    graph: LibraryGraph,
    start_node: str,
    goal_node: str,
    closed_sections: Optional[Set[str]] = None,
    crowded_aisles: Optional[Set[Tuple[str, str]]] = None,
    has_permission: bool = False,
    cost_mode: str = "distance",
    max_steps: int = 1000,
) -> SearchResult:
    """
    Breadth-First Search (BFS) explores shallowest unexpanded nodes first (FIFO).
    Guarantees shortest path in terms of number of edges/hops, but does not
    consider edge weights or distances.
    """
    closed_set = closed_sections or set()

    # Pre-condition validation
    if start_node in closed_set:
        return SearchResult("BFS", False, [], 0.0, 0, 0, [], f"Start node '{start_node}' is closed.", cost_mode)
    if goal_node in closed_set:
        return SearchResult("BFS", False, [], 0.0, 0, 0, [], f"Goal shelf '{goal_node}' is currently closed.", cost_mode)
    if graph.get_node(goal_node).restricted and not has_permission:
        return SearchResult("BFS", False, [], 0.0, 0, 0, [], f"Goal shelf '{goal_node}' requires restricted permission.", cost_mode)

    if start_node == goal_node:
        init_info = SearchNodeInfo(node=start_node, g=0.0, h=0.0, f=0.0, parent=None)
        snap = SearchStepSnapshot(1, start_node, [init_info], [init_info], "Start is already the goal.")
        return SearchResult("BFS", True, [start_node], 0.0, 0, 1, [snap], "Start and goal are identical.", cost_mode)

    # Queue contains: (node_id, current_g_cost)
    queue: collections.deque[Tuple[str, float]] = collections.deque([(start_node, 0.0)])
    parent_map: Dict[str, Optional[str]] = {start_node: None}
    g_costs: Dict[str, float] = {start_node: 0.0}
    visited: Set[str] = {start_node}
    closed_dict: Dict[str, SearchNodeInfo] = {}
    snapshots: List[SearchStepSnapshot] = []

    step = 0
    nodes_expanded = 0

    while queue and step < max_steps:
        step += 1
        curr, curr_g = queue.popleft()
        nodes_expanded += 1

        curr_h = graph.heuristic(curr, goal_node, cost_mode)
        closed_dict[curr] = SearchNodeInfo(curr, curr_g, curr_h, curr_g + curr_h, parent_map.get(curr))

        # Check goal
        if curr == goal_node:
            path = reconstruct_path(parent_map, goal_node)
            final_cost = calculate_path_cost(graph, path, crowded_aisles, cost_mode)
            snap = SearchStepSnapshot(
                step_number=step,
                current_node=curr,
                open_list=[
                    SearchNodeInfo(n, g, graph.heuristic(n, goal_node, cost_mode), g + graph.heuristic(n, goal_node, cost_mode), parent_map.get(n))
                    for n, g in queue
                ],
                closed_list=list(closed_dict.values()),
                action_note=f"Goal reached at {curr}!",
            )
            snapshots.append(snap)
            return SearchResult(
                algorithm="BFS",
                success=True,
                path=path,
                total_cost=final_cost,
                path_length_edges=len(path) - 1,
                nodes_expanded=nodes_expanded,
                step_snapshots=snapshots,
                message=f"BFS found path to {goal_node} in {len(path)-1} hops ({final_cost:.2f} {cost_mode}).",
                cost_mode=cost_mode,
            )

        # Expand neighbors
        successors = graph.get_successors(curr, closed_sections, crowded_aisles, has_permission, cost_mode)
        for succ in successors:
            nbr = succ.next_node
            if nbr not in visited:
                visited.add(nbr)
                nbr_g = curr_g + succ.cost
                g_costs[nbr] = nbr_g
                parent_map[nbr] = curr
                queue.append((nbr, nbr_g))

        # Record step snapshot
        open_items = [
            SearchNodeInfo(n, g, graph.heuristic(n, goal_node, cost_mode), g + graph.heuristic(n, goal_node, cost_mode), parent_map.get(n))
            for n, g in queue
        ]
        snapshots.append(
            SearchStepSnapshot(
                step_number=step,
                current_node=curr,
                open_list=open_items,
                closed_list=list(closed_dict.values()),
                action_note=f"Expanded {curr}, added {len(successors)} candidates to FIFO queue.",
            )
        )

    return SearchResult(
        algorithm="BFS",
        success=False,
        path=[],
        total_cost=0.0,
        path_length_edges=0,
        nodes_expanded=nodes_expanded,
        step_snapshots=snapshots,
        message=f"No viable path from '{start_node}' to '{goal_node}' under current constraints.",
        cost_mode=cost_mode,
    )


def depth_first_search(
    graph: LibraryGraph,
    start_node: str,
    goal_node: str,
    closed_sections: Optional[Set[str]] = None,
    crowded_aisles: Optional[Set[Tuple[str, str]]] = None,
    has_permission: bool = False,
    cost_mode: str = "distance",
    max_steps: int = 1000,
) -> SearchResult:
    """
    Depth-First Search (DFS) explores deepest unexpanded nodes first (LIFO stack).
    Not guaranteed to find optimal paths or minimum hops.
    """
    closed_set = closed_sections or set()

    if start_node in closed_set:
        return SearchResult("DFS", False, [], 0.0, 0, 0, [], f"Start node '{start_node}' is closed.", cost_mode)
    if goal_node in closed_set:
        return SearchResult("DFS", False, [], 0.0, 0, 0, [], f"Goal shelf '{goal_node}' is currently closed.", cost_mode)
    if graph.get_node(goal_node).restricted and not has_permission:
        return SearchResult("DFS", False, [], 0.0, 0, 0, [], f"Goal shelf '{goal_node}' requires restricted permission.", cost_mode)

    if start_node == goal_node:
        init_info = SearchNodeInfo(node=start_node, g=0.0, h=0.0, f=0.0, parent=None)
        snap = SearchStepSnapshot(1, start_node, [init_info], [init_info], "Start is already the goal.")
        return SearchResult("DFS", True, [start_node], 0.0, 0, 1, [snap], "Start and goal are identical.", cost_mode)

    stack: List[Tuple[str, float]] = [(start_node, 0.0)]
    parent_map: Dict[str, Optional[str]] = {start_node: None}
    visited: Set[str] = set()
    closed_dict: Dict[str, SearchNodeInfo] = {}
    snapshots: List[SearchStepSnapshot] = []

    step = 0
    nodes_expanded = 0

    while stack and step < max_steps:
        step += 1
        curr, curr_g = stack.pop()

        if curr in visited:
            continue
        visited.add(curr)
        nodes_expanded += 1

        curr_h = graph.heuristic(curr, goal_node, cost_mode)
        closed_dict[curr] = SearchNodeInfo(curr, curr_g, curr_h, curr_g + curr_h, parent_map.get(curr))

        # Check goal
        if curr == goal_node:
            path = reconstruct_path(parent_map, goal_node)
            final_cost = calculate_path_cost(graph, path, crowded_aisles, cost_mode)
            snap = SearchStepSnapshot(
                step_number=step,
                current_node=curr,
                open_list=[
                    SearchNodeInfo(n, g, graph.heuristic(n, goal_node, cost_mode), g + graph.heuristic(n, goal_node, cost_mode), parent_map.get(n))
                    for n, g in reversed(stack)
                ],
                closed_list=list(closed_dict.values()),
                action_note=f"Goal reached at {curr} via DFS deep branch!",
            )
            snapshots.append(snap)
            return SearchResult(
                algorithm="DFS",
                success=True,
                path=path,
                total_cost=final_cost,
                path_length_edges=len(path) - 1,
                nodes_expanded=nodes_expanded,
                step_snapshots=snapshots,
                message=f"DFS found path to {goal_node} in {len(path)-1} hops ({final_cost:.2f} {cost_mode}).",
                cost_mode=cost_mode,
            )

        # Successors pushed to stack in reverse order so first alphabetical neighbor is popped first
        successors = graph.get_successors(curr, closed_sections, crowded_aisles, has_permission, cost_mode)
        for succ in reversed(successors):
            nbr = succ.next_node
            if nbr not in visited:
                nbr_g = curr_g + succ.cost
                parent_map[nbr] = curr
                stack.append((nbr, nbr_g))

        open_items = [
            SearchNodeInfo(n, g, graph.heuristic(n, goal_node, cost_mode), g + graph.heuristic(n, goal_node, cost_mode), parent_map.get(n))
            for n, g in reversed(stack)
        ]
        snapshots.append(
            SearchStepSnapshot(
                step_number=step,
                current_node=curr,
                open_list=open_items,
                closed_list=list(closed_dict.values()),
                action_note=f"Popped {curr} from LIFO stack, pushed unvisited neighbors.",
            )
        )

    return SearchResult(
        algorithm="DFS",
        success=False,
        path=[],
        total_cost=0.0,
        path_length_edges=0,
        nodes_expanded=nodes_expanded,
        step_snapshots=snapshots,
        message=f"DFS exhausted search space without finding '{goal_node}'.",
        cost_mode=cost_mode,
    )


def a_star_search(
    graph: LibraryGraph,
    start_node: str,
    goal_node: str,
    closed_sections: Optional[Set[str]] = None,
    crowded_aisles: Optional[Set[Tuple[str, str]]] = None,
    has_permission: bool = False,
    cost_mode: str = "distance",
    max_steps: int = 1500,
) -> SearchResult:
    """
    A* Search uses f(n) = g(n) + h(n), where:
    - g(n) is the accumulated path cost from the start node (meters or seconds).
    - h(n) is an admissible Euclidean heuristic to the goal.
    With an admissible and consistent heuristic, A* guarantees cost-optimal routes.
    """
    closed_set = closed_sections or set()

    if start_node in closed_set:
        return SearchResult("A*", False, [], 0.0, 0, 0, [], f"Start node '{start_node}' is closed.", cost_mode)
    if goal_node in closed_set:
        return SearchResult("A*", False, [], 0.0, 0, 0, [], f"Goal shelf '{goal_node}' is currently closed.", cost_mode)
    if graph.get_node(goal_node).restricted and not has_permission:
        return SearchResult("A*", False, [], 0.0, 0, 0, [], f"Goal shelf '{goal_node}' requires restricted permission.", cost_mode)

    if start_node == goal_node:
        init_info = SearchNodeInfo(node=start_node, g=0.0, h=0.0, f=0.0, parent=None)
        snap = SearchStepSnapshot(1, start_node, [init_info], [init_info], "Start is already the goal.")
        return SearchResult("A*", True, [start_node], 0.0, 0, 1, [snap], "Start and goal are identical.", cost_mode)

    # Priority queue holds entries: (f_score, tie_breaker_counter, node_id)
    counter = 0
    start_h = graph.heuristic(start_node, goal_node, cost_mode)
    open_heap: List[Tuple[float, int, str]] = [(start_h, counter, start_node)]

    g_score: Dict[str, float] = {start_node: 0.0}
    f_score: Dict[str, float] = {start_node: start_h}
    parent_map: Dict[str, Optional[str]] = {start_node: None}

    closed_dict: Dict[str, SearchNodeInfo] = {}
    snapshots: List[SearchStepSnapshot] = []

    step = 0
    nodes_expanded = 0

    while open_heap and step < max_steps:
        step += 1
        curr_f, _, curr = heapq.heappop(open_heap)

        # Skip stale heap entries if we already closed this node with lower/equal g
        if curr in closed_dict:
            continue

        curr_g = g_score[curr]
        curr_h = graph.heuristic(curr, goal_node, cost_mode)
        closed_dict[curr] = SearchNodeInfo(curr, curr_g, curr_h, curr_f, parent_map.get(curr))
        nodes_expanded += 1

        # Goal test upon popping from priority queue
        if curr == goal_node:
            path = reconstruct_path(parent_map, goal_node)
            final_cost = g_score[goal_node]
            snap = SearchStepSnapshot(
                step_number=step,
                current_node=curr,
                open_list=[
                    SearchNodeInfo(nid, g_score.get(nid, 0.0), graph.heuristic(nid, goal_node, cost_mode), f, parent_map.get(nid))
                    for f, _, nid in sorted(open_heap)
                    if nid not in closed_dict
                ],
                closed_list=list(closed_dict.values()),
                action_note=f"Goal {curr} popped with optimal f={final_cost:.2f}!",
            )
            snapshots.append(snap)
            return SearchResult(
                algorithm="A*",
                success=True,
                path=path,
                total_cost=final_cost,
                path_length_edges=len(path) - 1,
                nodes_expanded=nodes_expanded,
                step_snapshots=snapshots,
                message=f"A* found optimal path to {goal_node} with cost {final_cost:.2f} ({len(path)-1} hops).",
                cost_mode=cost_mode,
            )

        # Expand valid successors
        successors = graph.get_successors(curr, closed_sections, crowded_aisles, has_permission, cost_mode)
        for succ in successors:
            nbr = succ.next_node
            tentative_g = curr_g + succ.cost

            if nbr in closed_dict and tentative_g >= g_score.get(nbr, float("inf")):
                continue

            if tentative_g < g_score.get(nbr, float("inf")):
                parent_map[nbr] = curr
                g_score[nbr] = tentative_g
                nbr_h = graph.heuristic(nbr, goal_node, cost_mode)
                tentative_f = tentative_g + nbr_h
                f_score[nbr] = tentative_f

                counter += 1
                heapq.heappush(open_heap, (tentative_f, counter, nbr))

        # Snapshot open list sorted by f-score
        # Clean up open list representation for UI
        active_open_info: List[SearchNodeInfo] = []
        seen_in_open: Set[str] = set()
        for f, _, nid in sorted(open_heap):
            if nid not in closed_dict and nid not in seen_in_open:
                seen_in_open.add(nid)
                active_open_info.append(
                    SearchNodeInfo(
                        node=nid,
                        g=g_score.get(nid, 0.0),
                        h=graph.heuristic(nid, goal_node, cost_mode),
                        f=f_score.get(nid, f),
                        parent=parent_map.get(nid),
                    )
                )

        snapshots.append(
            SearchStepSnapshot(
                step_number=step,
                current_node=curr,
                open_list=active_open_info,
                closed_list=list(closed_dict.values()),
                action_note=f"Expanded {curr} (g={curr_g:.1f}, h={curr_h:.1f}, f={curr_f:.1f}), evaluated {len(successors)} neighbors.",
            )
        )

    return SearchResult(
        algorithm="A*",
        success=False,
        path=[],
        total_cost=0.0,
        path_length_edges=0,
        nodes_expanded=nodes_expanded,
        step_snapshots=snapshots,
        message=f"No viable path found from '{start_node}' to '{goal_node}' under current constraints.",
        cost_mode=cost_mode,
    )


def compare_algorithms(
    graph: LibraryGraph,
    start_node: str,
    goal_node: str,
    closed_sections: Optional[Set[str]] = None,
    crowded_aisles: Optional[Set[Tuple[str, str]]] = None,
    has_permission: bool = False,
    cost_mode: str = "distance",
) -> Dict[str, SearchResult]:
    """
    Executes BFS, DFS, and A* on the identical scenario for side-by-side performance comparison.
    """
    bfs_res = breadth_first_search(graph, start_node, goal_node, closed_sections, crowded_aisles, has_permission, cost_mode)
    dfs_res = depth_first_search(graph, start_node, goal_node, closed_sections, crowded_aisles, has_permission, cost_mode)
    astar_res = a_star_search(graph, start_node, goal_node, closed_sections, crowded_aisles, has_permission, cost_mode)

    return {
        "BFS": bfs_res,
        "DFS": dfs_res,
        "A*": astar_res,
    }
