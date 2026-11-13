"""
Unit Tests for Intelligent Library Search and Book Collection Agent.

Verifies:
- BFS, DFS, and A* basic reachability and path reconstruction
- A* finding a cheaper path than BFS on weighted graphs (fewer hops != cheaper)
- Closed sections constraint handling (rerouting around obstacles)
- Restricted shelf permissions
- Admissibility and consistency of the Euclidean heuristic
- Multi-book TSP route optimizer and time-limit pruning
"""

import math
import os
import sys
import unittest
from pathlib import Path

# Add parent directory to path so tests can run from anywhere
CURRENT_DIR = Path(__file__).resolve().parent
PARENT_DIR = CURRENT_DIR.parent
sys.path.insert(0, str(PARENT_DIR))

from graph_model import Book, LibraryGraph, Node
from multi_book import optimize_multi_book_collection, prefilter_books
from search import a_star_search, breadth_first_search, depth_first_search


class TestLibrarySearch(unittest.TestCase):

    def setUp(self):
        json_path = PARENT_DIR / "data" / "library.json"
        self.graph = LibraryGraph.load_from_file(json_path)

    def test_graph_integrity(self):
        """Verify the sample library contains at least 12 nodes, 15 edges, and 15 books."""
        self.assertGreaterEqual(len(self.graph.nodes), 12)
        edge_count = sum(len(neighbors) for neighbors in self.graph.adj.values()) // 2
        self.assertGreaterEqual(edge_count, 15)
        self.assertGreaterEqual(len(self.graph.books), 15)

    def test_bfs_basic_path(self):
        """BFS should find a valid path from Entrance to Computer_Science."""
        res = breadth_first_search(self.graph, "Entrance", "Computer_Science")
        self.assertTrue(res.success)
        self.assertEqual(res.path[0], "Entrance")
        self.assertEqual(res.path[-1], "Computer_Science")
        self.assertGreater(res.nodes_expanded, 0)
        self.assertGreater(res.total_cost, 0.0)

    def test_dfs_basic_path(self):
        """DFS should find a valid path to Computer_Science."""
        res = depth_first_search(self.graph, "Entrance", "Computer_Science")
        self.assertTrue(res.success)
        self.assertEqual(res.path[0], "Entrance")
        self.assertEqual(res.path[-1], "Computer_Science")
        self.assertGreater(res.nodes_expanded, 0)

    def test_astar_finds_optimal_path(self):
        """A* should find a valid cost-optimal path."""
        res = a_star_search(self.graph, "Entrance", "Reference_Collection")
        self.assertTrue(res.success)
        self.assertEqual(res.path[0], "Entrance")
        self.assertEqual(res.path[-1], "Reference_Collection")
        self.assertGreater(res.total_cost, 0)
        self.assertGreater(len(res.step_snapshots), 0)

    def test_astar_cheaper_than_bfs_on_weighted_graph(self):
        """
        Verify case where A* finds a cheaper path than BFS.
        BFS minimizes number of hops (edges), ignoring weights.
        A* minimizes accumulated cost (distance).

        We construct a scenario:
        Start -> Goal directly has 1 hop but weight 60m.
        Start -> Inter -> Goal has 2 hops but weights 10m + 10m = 20m.
        BFS selects the 1-hop path (cost 60m).
        A* selects the 2-hop path (cost 20m).
        """
        weighted_graph = LibraryGraph("Weighted Difference Test")
        weighted_graph.add_node(Node("Start", "Start Area", 0.0, 0.0))
        weighted_graph.add_node(Node("Inter", "Intermediate Station", 10.0, 0.0))
        weighted_graph.add_node(Node("Goal", "Goal Shelf", 20.0, 0.0))

        # Direct edge: 1 hop, high cost
        weighted_graph.add_edge("Start", "Goal", 60.0)
        # Indirect path: 2 hops, low cost
        weighted_graph.add_edge("Start", "Inter", 10.0)
        weighted_graph.add_edge("Inter", "Goal", 10.0)

        bfs_res = breadth_first_search(weighted_graph, "Start", "Goal")
        astar_res = a_star_search(weighted_graph, "Start", "Goal")

        self.assertTrue(bfs_res.success)
        self.assertTrue(astar_res.success)

        # BFS chooses fewer hops (1 hop: Start -> Goal)
        self.assertEqual(len(bfs_res.path) - 1, 1)
        self.assertEqual(bfs_res.path, ["Start", "Goal"])
        self.assertEqual(bfs_res.total_cost, 60.0)

        # A* chooses cheaper cost (2 hops: Start -> Inter -> Goal, cost 20)
        self.assertEqual(astar_res.path, ["Start", "Inter", "Goal"])
        self.assertEqual(astar_res.total_cost, 20.0)

        # A* cost is strictly less than BFS cost!
        self.assertLess(astar_res.total_cost, bfs_res.total_cost)

    def test_closed_section_rerouting_and_unreachable(self):
        """
        Test that closed sections force the search to find an alternate detour,
        or gracefully report no path if completely blocked.
        """
        # Normal path from Entrance to Science_Wing usually traverses Study_Commons
        normal_astar = a_star_search(self.graph, "Entrance", "Science_Wing")
        self.assertTrue(normal_astar.success)
        self.assertIn("Study_Commons", normal_astar.path)

        # Close Study_Commons: agent must reroute through Information_Desk -> Digital_Media_Lab -> Science_Wing
        rerouted_astar = a_star_search(
            self.graph,
            "Entrance",
            "Science_Wing",
            closed_sections={"Study_Commons"},
        )
        self.assertTrue(rerouted_astar.success)
        self.assertNotIn("Study_Commons", rerouted_astar.path)
        self.assertIn("Digital_Media_Lab", rerouted_astar.path)

        # Completely block Science_Wing by closing its remaining corridors (Digital_Media_Lab and Computer_Science)
        blocked_astar = a_star_search(
            self.graph,
            "Entrance",
            "Science_Wing",
            closed_sections={"Study_Commons", "Digital_Media_Lab", "Computer_Science"},
        )
        self.assertFalse(blocked_astar.success)
        self.assertEqual(len(blocked_astar.path), 0)
        self.assertIn("No viable path", blocked_astar.message)

    def test_restricted_shelf_permission(self):
        """Rare_Manuscripts requires has_permission=True."""
        # Without permission: fails
        denied_res = a_star_search(self.graph, "Entrance", "Rare_Manuscripts", has_permission=False)
        self.assertFalse(denied_res.success)
        self.assertIn("requires restricted", denied_res.message)

        # With permission: succeeds
        allowed_res = a_star_search(self.graph, "Entrance", "Rare_Manuscripts", has_permission=True)
        self.assertTrue(allowed_res.success)
        self.assertEqual(allowed_res.path[-1], "Rare_Manuscripts")

    def test_crowded_aisle_penalty(self):
        """Crowded aisles increase cost."""
        u, v = "Entrance", "Information_Desk"
        base_cost, _ = self.graph.calculate_edge_cost(u, v, crowded_aisles=None, cost_mode="distance")
        crowded_cost, is_crowd = self.graph.calculate_edge_cost(
            u, v, crowded_aisles={self.graph.canonical_edge(u, v)}, cost_mode="distance"
        )
        self.assertTrue(is_crowd)
        self.assertAlmostEqual(crowded_cost, base_cost * self.graph.crowd_delay_factor)

    def test_heuristic_admissibility(self):
        """
        Admissibility requirement: h(n, goal) <= h*(n, goal) for all nodes n.
        We verify this across all pairs of nodes using actual shortest path distances.
        """
        node_ids = list(self.graph.nodes.keys())
        for goal in node_ids:
            for start in node_ids:
                if start == goal:
                    continue
                h_val = self.graph.heuristic(start, goal, cost_mode="distance")
                # True optimal path distance without obstacles
                res = a_star_search(self.graph, start, goal, has_permission=True)
                if res.success:
                    true_cost = res.total_cost
                    self.assertLessEqual(
                        h_val,
                        true_cost + 1e-6,
                        f"Heuristic violated admissibility from {start} to {goal}: h={h_val} > h*={true_cost}",
                    )

    def test_multi_book_optimizer_and_time_limit(self):
        """
        Verify multi-book optimization:
        - Filters unavailable books
        - Drops lowest priority books when time limit is tight
        """
        # Select 3 books:
        # BK-101: AI (CS, Priority 1, Available)
        # BK-103: Deep Learning (CS, Priority 2, UNAVAILABLE)
        # BK-107: Topology (Math, Priority 3, Available)
        book_ids = ["BK-101", "BK-103", "BK-107"]

        plan = optimize_multi_book_collection(
            self.graph,
            book_ids=book_ids,
            start_node="Entrance",
            checkout_node="Self_Checkout",
            has_permission=True,
            time_limit_seconds=None,
        )

        self.assertTrue(plan.success)
        # BK-103 should be skipped due to unavailability
        collected_ids = [b.id for b in plan.collected_books]
        self.assertIn("BK-101", collected_ids)
        self.assertIn("BK-107", collected_ids)
        self.assertNotIn("BK-103", collected_ids)

        skipped_reasons = {sb.book.id: sb.reason for sb in plan.skipped_books}
        self.assertIn("BK-103", skipped_reasons)
        self.assertIn("unavailable", skipped_reasons["BK-103"].lower())

        # Now test with very tight time limit: only enough for 1 book
        tight_limit_seconds = 100.0  # Tight budget
        tight_plan = optimize_multi_book_collection(
            self.graph,
            book_ids=["BK-101", "BK-107"],  # Pri 1 vs Pri 3
            start_node="Entrance",
            checkout_node="Self_Checkout",
            time_limit_seconds=tight_limit_seconds,
        )
        self.assertTrue(tight_plan.success)
        # Priority 3 book should be dropped to stay within budget
        tight_collected = [b.id for b in tight_plan.collected_books]
        self.assertIn("BK-101", tight_collected)
        self.assertNotIn("BK-107", tight_collected)


if __name__ == "__main__":
    unittest.main()
