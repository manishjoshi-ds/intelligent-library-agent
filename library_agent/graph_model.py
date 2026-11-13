"""
Graph Model for Intelligent Library Search and Book Collection Agent.

Defines the library topology, books, states, action transition model,
and heuristic calculations.
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple


@dataclass(frozen=True)
class Node:
    """Represents a section, aisle, or shelf in the library."""
    id: str
    name: str
    x: float
    y: float
    restricted: bool = False
    description: str = ""

    def euclidean_distance_to(self, other: Node) -> float:
        """Computes 2D Euclidean distance in meters to another node."""
        return math.hypot(self.x - other.x, self.y - other.y)


@dataclass
class Edge:
    """Represents a walkable corridor or aisle connecting two nodes."""
    source: str
    target: str
    distance: float  # in meters

    def connected_nodes(self) -> Tuple[str, str]:
        return tuple(sorted((self.source, self.target)))  # type: ignore


@dataclass
class Book:
    """Represents a cataloged library item."""
    id: str
    title: str
    author: str
    shelf: str
    available: bool = True
    priority: int = 2  # 1 = High, 2 = Medium, 3 = Low
    restricted: bool = False

    def priority_label(self) -> str:
        return {1: "High", 2: "Medium", 3: "Low"}.get(self.priority, "Standard")


@dataclass(frozen=True)
class AgentState:
    """
    State representation for the search agent.
    For single-goal search: (current_location,).
    For multi-book collection: (current_location, frozenset(collected_book_ids)).
    """
    current_location: str
    collected_books: frozenset[str] = field(default_factory=frozenset)

    def is_book_collected(self, book_id: str) -> bool:
        return book_id in self.collected_books

    def with_book(self, book_id: str) -> AgentState:
        new_collected = set(self.collected_books)
        new_collected.add(book_id)
        return AgentState(current_location=self.current_location, collected_books=frozenset(new_collected))

    def at_location(self, new_location: str) -> AgentState:
        return AgentState(current_location=new_location, collected_books=self.collected_books)


@dataclass
class ActionTransition:
    """Result of taking an action from a node to a neighbor."""
    next_node: str
    distance: float
    cost: float  # distance in meters OR seconds in time mode
    is_crowded: bool
    description: str


class LibraryGraph:
    """
    Represents the library environment as an undirected weighted graph
    with spatial coordinates, catalog of books, and dynamic constraints.
    """

    def __init__(
        self,
        name: str = "Central Library",
        default_start: str = "Entrance",
        default_checkout: str = "Self_Checkout",
        walking_speed_mps: float = 1.2,
        pickup_time_seconds: float = 45.0,
        crowd_delay_factor: float = 2.5,
    ):
        self.name = name
        self.default_start = default_start
        self.default_checkout = default_checkout
        self.walking_speed_mps = walking_speed_mps  # meters / sec (~4.3 km/h)
        self.pickup_time_seconds = pickup_time_seconds  # per book collection
        self.crowd_delay_factor = crowd_delay_factor  # multiplier for crowded aisles

        self.nodes: Dict[str, Node] = {}
        self.books: Dict[str, Book] = {}
        self.adj: Dict[str, Dict[str, float]] = {}  # u -> {v: base_distance}

    def add_node(self, node: Node) -> None:
        self.nodes[node.id] = node
        if node.id not in self.adj:
            self.adj[node.id] = {}

    def add_edge(self, u: str, v: str, distance: float) -> None:
        if u not in self.nodes or v not in self.nodes:
            raise ValueError(f"Cannot add edge between nonexistent nodes: {u} <-> {v}")
        self.adj[u][v] = distance
        self.adj[v][u] = distance

    def add_book(self, book: Book) -> None:
        self.books[book.id] = book

    def get_node(self, node_id: str) -> Node:
        if node_id not in self.nodes:
            raise KeyError(f"Node '{node_id}' not found in library.")
        return self.nodes[node_id]

    def get_book(self, book_id: str) -> Book:
        if book_id not in self.books:
            raise KeyError(f"Book '{book_id}' not found in library.")
        return self.books[book_id]

    @staticmethod
    def canonical_edge(u: str, v: str) -> Tuple[str, str]:
        """Returns standard tuple (min(u,v), max(u,v)) for undirected edge lookup."""
        return (u, v) if u < v else (v, u)

    def is_edge_crowded(self, u: str, v: str, crowded_aisles: Optional[Set[Tuple[str, str]]]) -> bool:
        if not crowded_aisles:
            return False
        canon = self.canonical_edge(u, v)
        return canon in crowded_aisles or (u, v) in crowded_aisles or (v, u) in crowded_aisles

    def calculate_edge_cost(
        self,
        u: str,
        v: str,
        crowded_aisles: Optional[Set[Tuple[str, str]]] = None,
        cost_mode: str = "distance",  # "distance" or "time"
    ) -> Tuple[float, bool]:
        """
        Calculates edge traversal cost based on chosen mode:
        - "distance": base distance * crowd_multiplier (if crowded)
        - "time": (base distance / walking_speed_mps) * crowd_multiplier (if crowded)
        Returns: (cost, is_crowded)
        """
        base_dist = self.adj[u][v]
        crowded = self.is_edge_crowded(u, v, crowded_aisles)
        multiplier = self.crowd_delay_factor if crowded else 1.0

        if cost_mode == "time":
            time_sec = (base_dist / self.walking_speed_mps) * multiplier
            return time_sec, crowded
        else:
            dist_cost = base_dist * multiplier
            return dist_cost, crowded

    def get_successors(
        self,
        current_node_id: str,
        closed_sections: Optional[Set[str]] = None,
        crowded_aisles: Optional[Set[Tuple[str, str]]] = None,
        has_permission: bool = False,
        cost_mode: str = "distance",
    ) -> List[ActionTransition]:
        """
        Generates valid adjacent actions from current_node_id under constraints.
        Filters out:
        - Closed sections
        - Restricted shelves when has_permission is False
        """
        closed_set = closed_sections or set()
        neighbors = self.adj.get(current_node_id, {})
        successors: List[ActionTransition] = []

        # Sort neighbor keys for deterministic tie-breaking in search
        for neighbor_id in sorted(neighbors.keys()):
            # 1. Closed sections constraint
            if neighbor_id in closed_set:
                continue

            neighbor_node = self.nodes[neighbor_id]

            # 2. Restricted shelf constraint
            if neighbor_node.restricted and not has_permission:
                continue

            cost, is_crowded = self.calculate_edge_cost(
                current_node_id, neighbor_id, crowded_aisles=crowded_aisles, cost_mode=cost_mode
            )
            base_dist = neighbors[neighbor_id]

            desc = f"Walk to {neighbor_node.name} ({base_dist:.1f}m)"
            if is_crowded:
                desc += " [Crowded delay applied]"

            successors.append(
                ActionTransition(
                    next_node=neighbor_id,
                    distance=base_dist,
                    cost=cost,
                    is_crowded=is_crowded,
                    description=desc,
                )
            )

        return successors

    def heuristic(self, node_id: str, goal_node_id: str, cost_mode: str = "distance") -> float:
        """
        Calculates the admissible heuristic h(n) from node_id to goal_node_id.
        - Distance mode: Straight-line Euclidean distance in meters.
          Admissible because Euclidean distance is the minimum possible physical distance
          between any two coordinates (triangle inequality: h(n) <= h*(n)).
        - Time mode: Euclidean distance / walking_speed_mps.
          Admissible because walking at max clear speed along a straight line is the absolute
          theoretical lower bound on transit time (no delays or obstacles).
        """
        if node_id == goal_node_id:
            return 0.0

        n1 = self.nodes[node_id]
        n2 = self.nodes[goal_node_id]
        euclid = n1.euclidean_distance_to(n2)

        if cost_mode == "time":
            return euclid / self.walking_speed_mps
        return euclid

    def to_dict(self) -> dict:
        """Serializes library graph to JSON-compatible dictionary."""
        return {
            "name": self.name,
            "default_start": self.default_start,
            "default_checkout": self.default_checkout,
            "settings": {
                "walking_speed_mps": self.walking_speed_mps,
                "pickup_time_seconds": self.pickup_time_seconds,
                "crowd_delay_factor": self.crowd_delay_factor,
            },
            "nodes": {
                nid: {
                    "id": node.id,
                    "name": node.name,
                    "x": node.x,
                    "y": node.y,
                    "restricted": node.restricted,
                    "description": node.description,
                }
                for nid, node in self.nodes.items()
            },
            "edges": [
                {"source": u, "target": v, "distance": dist}
                for u in self.adj
                for v, dist in self.adj[u].items()
                if u < v
            ],
            "books": [
                {
                    "id": b.id,
                    "title": b.title,
                    "author": b.author,
                    "shelf": b.shelf,
                    "available": b.available,
                    "priority": b.priority,
                    "restricted": b.restricted,
                }
                for b in self.books.values()
            ],
        }

    @classmethod
    def from_dict(cls, data: dict) -> LibraryGraph:
        """Constructs a LibraryGraph instance from a data dictionary."""
        settings = data.get("settings", {})
        lib = cls(
            name=data.get("name", "Library"),
            default_start=data.get("default_start", "Entrance"),
            default_checkout=data.get("default_checkout", "Self_Checkout"),
            walking_speed_mps=settings.get("walking_speed_mps", 1.2),
            pickup_time_seconds=settings.get("pickup_time_seconds", 45.0),
            crowd_delay_factor=settings.get("crowd_delay_factor", 2.5),
        )

        for nid, ndata in data.get("nodes", {}).items():
            lib.add_node(
                Node(
                    id=ndata["id"],
                    name=ndata["name"],
                    x=float(ndata["x"]),
                    y=float(ndata["y"]),
                    restricted=bool(ndata.get("restricted", False)),
                    description=ndata.get("description", ""),
                )
            )

        for edata in data.get("edges", []):
            lib.add_edge(edata["source"], edata["target"], float(edata["distance"]))

        for bdata in data.get("books", []):
            lib.add_book(
                Book(
                    id=bdata["id"],
                    title=bdata["title"],
                    author=bdata.get("author", "Unknown"),
                    shelf=bdata["shelf"],
                    available=bool(bdata.get("available", True)),
                    priority=int(bdata.get("priority", 2)),
                    restricted=bool(bdata.get("restricted", False)),
                )
            )

        return lib

    @classmethod
    def load_from_file(cls, filepath: str | Path) -> LibraryGraph:
        """Loads and initializes graph from a JSON file."""
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        return cls.from_dict(data)
