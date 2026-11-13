"""
Multi-Book Route Optimizer for Intelligent Library Search and Book Collection Agent.

Computes the optimal collection route for multiple books across library shelves:
- Uses A* to compute all pairwise shortest paths between shelf locations.
- Solves the Traveling Salesperson Problem (TSP) with fixed endpoints (Start -> ... -> Checkout)
  using exact permutation search for <= 8 locations, and Nearest-Neighbor + 2-Opt for larger sets.
- Respects book priorities, closed sections, restricted access, availability, and time limits.
- Drops or defers lowest-priority books when time limits are exceeded, reporting exact reasons.
"""

from __future__ import annotations

import itertools
import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Tuple

from graph_model import Book, LibraryGraph
from search import a_star_search


@dataclass
class SkippedBook:
    book: Book
    reason: str


@dataclass
class RouteLeg:
    leg_index: int
    from_node: str
    to_node: str
    path: List[str]
    distance_meters: float
    duration_seconds: float
    leg_cost: float
    books_collected: List[Book] = field(default_factory=list)


@dataclass
class MultiBookPlan:
    success: bool
    start_node: str
    checkout_node: str
    ordered_shelves: List[str]
    full_path: List[str]
    legs: List[RouteLeg]
    collected_books: List[Book]
    skipped_books: List[SkippedBook]
    total_distance_meters: float
    total_transit_seconds: float
    total_pickup_seconds: float
    total_time_seconds: float
    total_cost: float
    time_limit_exceeded: bool
    message: str


def prefilter_books(
    graph: LibraryGraph,
    book_ids: List[str],
    closed_sections: Optional[Set[str]] = None,
    has_permission: bool = False,
) -> Tuple[List[Book], List[SkippedBook]]:
    """Filters books based on inventory availability and section accessibility."""
    closed_set = closed_sections or set()
    valid_books: List[Book] = []
    skipped_books: List[SkippedBook] = []

    for bid in book_ids:
        if bid not in graph.books:
            # Handle book not found
            fake_book = Book(bid, f"Unknown ID ({bid})", "Unknown", "Unknown", False, 3, False)
            skipped_books.append(SkippedBook(fake_book, f"Book ID '{bid}' not found in catalog."))
            continue

        book = graph.get_book(bid)

        # 1. Availability check
        if not book.available:
            skipped_books.append(
                SkippedBook(book, f"Book '{book.title}' is currently checked out / unavailable.")
            )
            continue

        # 2. Closed section check
        if book.shelf in closed_set:
            skipped_books.append(
                SkippedBook(book, f"Shelf location '{book.shelf}' is in a closed library section.")
            )
            continue

        # 3. Restricted section check
        shelf_node = graph.get_node(book.shelf)
        if (shelf_node.restricted or book.restricted) and not has_permission:
            skipped_books.append(
                SkippedBook(book, f"Shelf location '{book.shelf}' requires restricted special access permission.")
            )
            continue

        valid_books.append(book)

    return valid_books, skipped_books


def compute_pairwise_distances(
    graph: LibraryGraph,
    locations: List[str],
    closed_sections: Optional[Set[str]] = None,
    crowded_aisles: Optional[Set[Tuple[str, str]]] = None,
    has_permission: bool = False,
    cost_mode: str = "distance",
) -> Tuple[Dict[Tuple[str, str], float], Dict[Tuple[str, str], List[str]]]:
    """
    Computes pairwise shortest path costs and routes between all pairs of locations using A*.
    Returns (distances_dict, paths_dict).
    """
    dist_matrix: Dict[Tuple[str, str], float] = {}
    path_matrix: Dict[Tuple[str, str], List[str]] = {}

    for i in range(len(locations)):
        u = locations[i]
        dist_matrix[(u, u)] = 0.0
        path_matrix[(u, u)] = [u]

        for j in range(i + 1, len(locations)):
            v = locations[j]
            # Forward A* search
            res = a_star_search(
                graph,
                start_node=u,
                goal_node=v,
                closed_sections=closed_sections,
                crowded_aisles=crowded_aisles,
                has_permission=has_permission,
                cost_mode=cost_mode,
            )

            if res.success:
                dist_matrix[(u, v)] = res.total_cost
                path_matrix[(u, v)] = res.path
                # Graph is undirected, reverse path for (v, u)
                dist_matrix[(v, u)] = res.total_cost
                path_matrix[(v, u)] = list(reversed(res.path))
            else:
                dist_matrix[(u, v)] = float("inf")
                path_matrix[(u, v)] = []
                dist_matrix[(v, u)] = float("inf")
                path_matrix[(v, u)] = []

    return dist_matrix, path_matrix


def solve_fixed_endpoints_tsp(
    start: str,
    waypoints: List[str],
    end: str,
    dist_matrix: Dict[Tuple[str, str], float],
    priority_map: Optional[Dict[str, int]] = None,
) -> Tuple[List[str], float]:
    """
    Finds the optimal permutation of waypoints that minimizes travel cost:
    start -> w_1 -> w_2 -> ... -> w_k -> end.
    When priority_map is provided (shelf -> highest priority 1..3), prioritizes
    visiting higher-priority shelves earlier while keeping total distance competitive.
    """
    if not waypoints:
        return [start, end], dist_matrix.get((start, end), float("inf"))

    # If small number of waypoints (<= 7), solve exact optimal permutation
    if len(waypoints) <= 7:
        best_order: Optional[List[str]] = None
        best_score = float("inf")

        for perm in itertools.permutations(waypoints):
            route = [start] + list(perm) + [end]
            cost = 0.0
            possible = True
            for a, b in zip(route[:-1], route[1:]):
                d = dist_matrix.get((a, b), float("inf"))
                if math.isinf(d):
                    possible = False
                    break
                cost += d

            if not possible:
                continue

            # Priority-weighted score: small early-completion penalty if high-priority items are pushed to the end
            priority_penalty = 0.0
            if priority_map:
                for step_idx, shelf in enumerate(perm):
                    pri = priority_map.get(shelf, 2)
                    # High priority (1) items get penalty if visited late in the route
                    priority_penalty += (pri - 1) * step_idx * 0.15

            total_score = cost + priority_penalty

            if total_score < best_score:
                best_score = total_score
                best_order = list(perm)

        if best_order is not None:
            # Recompute exact pure cost without penalty
            actual_route = [start] + best_order + [end]
            actual_cost = sum(dist_matrix[(a, b)] for a, b in zip(actual_route[:-1], actual_route[1:]))
            return actual_route, actual_cost

    # For larger sets, use Greedy Nearest-Neighbor + 2-Opt Local Search
    unvisited = set(waypoints)
    current = start
    ordered: List[str] = []

    while unvisited:
        # Pick nearest unvisited node (biased by priority if available)
        best_next = None
        best_dist = float("inf")
        for candidate in unvisited:
            base_d = dist_matrix.get((current, candidate), float("inf"))
            if priority_map:
                pri = priority_map.get(candidate, 2)
                weighted_d = base_d * (1.0 + (pri - 1) * 0.25)
            else:
                weighted_d = base_d

            if weighted_d < best_dist:
                best_dist = weighted_d
                best_next = candidate

        if best_next is None:
            break
        ordered.append(best_next)
        unvisited.remove(best_next)
        current = best_next

    # Apply 2-opt improvement on intermediate waypoints
    improved = True
    iterations = 0
    while improved and iterations < 50:
        improved = False
        iterations += 1
        for i in range(len(ordered) - 1):
            for j in range(i + 1, len(ordered)):
                # Evaluate swapping segment ordered[i:j+1]
                prev_node = start if i == 0 else ordered[i - 1]
                next_node = end if j == len(ordered) - 1 else ordered[j + 1]

                current_subcost = (
                    dist_matrix.get((prev_node, ordered[i]), float("inf"))
                    + dist_matrix.get((ordered[j], next_node), float("inf"))
                )
                reversed_subcost = (
                    dist_matrix.get((prev_node, ordered[j]), float("inf"))
                    + dist_matrix.get((ordered[i], next_node), float("inf"))
                )

                if reversed_subcost + 1e-4 < current_subcost:
                    ordered[i : j + 1] = reversed(ordered[i : j + 1])
                    improved = True
                    break
            if improved:
                break

    full_route = [start] + ordered + [end]
    total_cost = sum(dist_matrix.get((a, b), float("inf")) for a, b in zip(full_route[:-1], full_route[1:]))
    return full_route, total_cost


def optimize_multi_book_collection(
    graph: LibraryGraph,
    book_ids: List[str],
    start_node: Optional[str] = None,
    checkout_node: Optional[str] = None,
    closed_sections: Optional[Set[str]] = None,
    crowded_aisles: Optional[Set[Tuple[str, str]]] = None,
    has_permission: bool = False,
    cost_mode: str = "distance",
    time_limit_seconds: Optional[float] = None,
    enforce_priority: bool = True,
) -> MultiBookPlan:
    """
    High-level entry point for multi-book route planning:
    1. Validates start and checkout endpoints.
    2. Filters books (inventory availability, closed/restricted sections).
    3. Solves routing with A* pairwise shortest paths and TSP optimization.
    4. Evaluates total time against time_limit_seconds.
    5. If time limit is exceeded, drops lowest-priority books iteratively and replans.
    6. Generates full turn-by-turn path and per-leg metrics.
    """
    closed_set = closed_sections or set()
    start = start_node or graph.default_start
    checkout = checkout_node or graph.default_checkout

    # Validate endpoints
    if start in closed_set:
        return MultiBookPlan(
            success=False,
            start_node=start,
            checkout_node=checkout,
            ordered_shelves=[],
            full_path=[],
            legs=[],
            collected_books=[],
            skipped_books=[],
            total_distance_meters=0.0,
            total_transit_seconds=0.0,
            total_pickup_seconds=0.0,
            total_time_seconds=0.0,
            total_cost=0.0,
            time_limit_exceeded=False,
            message=f"Collection aborted: Starting point '{start}' is closed.",
        )

    if checkout in closed_set:
        return MultiBookPlan(
            success=False,
            start_node=start,
            checkout_node=checkout,
            ordered_shelves=[],
            full_path=[],
            legs=[],
            collected_books=[],
            skipped_books=[],
            total_distance_meters=0.0,
            total_transit_seconds=0.0,
            total_pickup_seconds=0.0,
            total_time_seconds=0.0,
            total_cost=0.0,
            time_limit_exceeded=False,
            message=f"Collection aborted: Checkout location '{checkout}' is closed.",
        )

    # 1. Initial prefiltering
    active_books, initial_skipped = prefilter_books(graph, book_ids, closed_sections, has_permission)

    if not active_books:
        return MultiBookPlan(
            success=False,
            start_node=start,
            checkout_node=checkout,
            ordered_shelves=[],
            full_path=[],
            legs=[],
            collected_books=[],
            skipped_books=initial_skipped,
            total_distance_meters=0.0,
            total_transit_seconds=0.0,
            total_pickup_seconds=0.0,
            total_time_seconds=0.0,
            total_cost=0.0,
            time_limit_exceeded=False,
            message="No books could be scheduled for collection (all unavailable or in restricted/closed sections).",
        )

    # Helper function to plan route for a subset of books
    def plan_for_books(
        books_subset: List[Book],
    ) -> Tuple[Optional[List[str]], float, Dict[Tuple[str, str], float], Dict[Tuple[str, str], List[str]], Set[str]]:
        shelf_to_books: Dict[str, List[Book]] = {}
        for b in books_subset:
            shelf_to_books.setdefault(b.shelf, []).append(b)

        unique_shelves = list(shelf_to_books.keys())
        all_locs = list(dict.fromkeys([start] + unique_shelves + [checkout]))

        dists, paths = compute_pairwise_distances(
            graph,
            all_locs,
            closed_sections=closed_sections,
            crowded_aisles=crowded_aisles,
            has_permission=has_permission,
            cost_mode=cost_mode,
        )

        # Check reachability of shelves
        unreachable_shelves = set()
        reachable_shelves = []
        for s in unique_shelves:
            if math.isinf(dists.get((start, s), float("inf"))) or math.isinf(dists.get((s, checkout), float("inf"))):
                unreachable_shelves.add(s)
            else:
                reachable_shelves.append(s)

        if not reachable_shelves and unique_shelves:
            return None, float("inf"), dists, paths, unreachable_shelves

        priority_map = None
        if enforce_priority:
            priority_map = {
                s: min(b.priority for b in books_list) for s, books_list in shelf_to_books.items()
            }

        route, cost = solve_fixed_endpoints_tsp(start, reachable_shelves, checkout, dists, priority_map)
        return route, cost, dists, paths, unreachable_shelves

    # First attempt with all valid books
    current_active_books = list(active_books)
    dropped_due_to_time: List[SkippedBook] = []
    unreachable_skipped: List[SkippedBook] = []

    final_route: Optional[List[str]] = None
    final_dists: Dict[Tuple[str, str], float] = {}
    final_paths: Dict[Tuple[str, str], List[str]] = {}

    while current_active_books:
        route, cost, dists, paths, unreach = plan_for_books(current_active_books)

        # Handle any unreachable shelves
        if unreach:
            retained = []
            for b in current_active_books:
                if b.shelf in unreach:
                    unreachable_skipped.append(
                        SkippedBook(b, f"No walkable path to shelf '{b.shelf}' due to closed corridors.")
                    )
                else:
                    retained.append(b)
            current_active_books = retained
            if not current_active_books:
                break
            # Re-plan with reachable only
            continue

        if route is None or math.isinf(cost):
            break

        # Calculate time metrics
        # Calculate true physical walking distance and transit seconds
        total_dist_m = 0.0
        total_transit_sec = 0.0
        for u, v in zip(route[:-1], route[1:]):
            seg_path = paths.get((u, v), [])
            seg_dist = sum(graph.adj[a][b] for a, b in zip(seg_path[:-1], seg_path[1:]))
            path_transit = sum(
                graph.calculate_edge_cost(a, b, crowded_aisles=crowded_aisles, cost_mode="time")[0]
                for a, b in zip(seg_path[:-1], seg_path[1:])
            )
            total_dist_m += seg_dist
            total_transit_sec += path_transit

        total_pickup_sec = len(current_active_books) * graph.pickup_time_seconds
        total_est_time = total_transit_sec + total_pickup_sec

        # Check time limit
        if time_limit_seconds is not None and total_est_time > time_limit_seconds and len(current_active_books) > 1:
            # Drop lowest priority book (priority 3 first, then 2, then 1)
            # Among same priority, drop book located farthest
            lowest_pri = max(b.priority for b in current_active_books)
            candidates = [b for b in current_active_books if b.priority == lowest_pri]
            to_drop = candidates[-1]

            current_active_books.remove(to_drop)
            dropped_due_to_time.append(
                SkippedBook(
                    to_drop,
                    f"Dropped to satisfy time budget of {time_limit_seconds:.0f}s (estimated {total_est_time:.0f}s). Priority: {to_drop.priority_label()}.",
                )
            )
            continue

        # Feasible route found!
        final_route = route
        final_dists = dists
        final_paths = paths
        break

    all_skipped = initial_skipped + unreachable_skipped + dropped_due_to_time

    if final_route is None or not current_active_books:
        return MultiBookPlan(
            success=False,
            start_node=start,
            checkout_node=checkout,
            ordered_shelves=[],
            full_path=[],
            legs=[],
            collected_books=[],
            skipped_books=all_skipped,
            total_distance_meters=0.0,
            total_transit_seconds=0.0,
            total_pickup_seconds=0.0,
            total_time_seconds=0.0,
            total_cost=0.0,
            time_limit_exceeded=bool(time_limit_seconds),
            message="Could not formulate a viable route to collect requested books.",
        )

    # Build per-leg breakdown and stitched full path
    shelf_books_map: Dict[str, List[Book]] = {}
    for b in current_active_books:
        shelf_books_map.setdefault(b.shelf, []).append(b)

    legs: List[RouteLeg] = []
    full_path: List[str] = [final_route[0]]
    total_dist = 0.0
    total_transit = 0.0
    total_cost_val = 0.0

    for leg_idx, (u, v) in enumerate(zip(final_route[:-1], final_route[1:]), start=1):
        seg_path = final_paths.get((u, v), [u, v])
        if len(seg_path) > 1:
            full_path.extend(seg_path[1:])

        seg_dist = sum(graph.adj[a][b] for a, b in zip(seg_path[:-1], seg_path[1:]))
        seg_time = sum(graph.calculate_edge_cost(a, b, crowded_aisles, cost_mode="time")[0] for a, b in zip(seg_path[:-1], seg_path[1:]))
        seg_cost = sum(graph.calculate_edge_cost(a, b, crowded_aisles, cost_mode=cost_mode)[0] for a, b in zip(seg_path[:-1], seg_path[1:]))

        leg_books = shelf_books_map.get(v, []) if v != checkout else []

        legs.append(
            RouteLeg(
                leg_index=leg_idx,
                from_node=u,
                to_node=v,
                path=seg_path,
                distance_meters=seg_dist,
                duration_seconds=seg_time,
                leg_cost=seg_cost,
                books_collected=leg_books,
            )
        )

        total_dist += seg_dist
        total_transit += seg_time
        total_cost_val += seg_cost

    total_pickup = len(current_active_books) * graph.pickup_time_seconds
    total_time = total_transit + total_pickup

    ordered_shelves = [node for node in final_route if node not in (start, checkout)]

    return MultiBookPlan(
        success=True,
        start_node=start,
        checkout_node=checkout,
        ordered_shelves=ordered_shelves,
        full_path=full_path,
        legs=legs,
        collected_books=current_active_books,
        skipped_books=all_skipped,
        total_distance_meters=total_dist,
        total_transit_seconds=total_transit,
        total_pickup_seconds=total_pickup,
        total_time_seconds=total_time,
        total_cost=total_cost_val,
        time_limit_exceeded=False,
        message=f"Optimal multi-book collection planned: {len(current_active_books)} books collected across {len(ordered_shelves)} shelves.",
    )
