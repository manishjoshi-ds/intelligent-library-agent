"""
Streamlit Web Interface for Intelligent Library Search and Book Collection Agent.

Visualizes graph topology, dynamic obstacles, algorithm search frontiers,
and multi-book route optimization.
"""

from __future__ import annotations

import math
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

import matplotlib.patches as mpatches
import matplotlib.pyplot as plt
import networkx as nx
import pandas as pd
import streamlit as st

from graph_model import Book, LibraryGraph
from multi_book import optimize_multi_book_collection
from search import a_star_search, breadth_first_search, compare_algorithms, depth_first_search


# Set page config
st.set_page_config(
    page_title="Intelligent Library Search Agent",
    page_icon="📚",
    layout="wide",
    initial_sidebar_state="expanded",
)


@st.cache_resource
def load_graph() -> LibraryGraph:
    data_path = Path(__file__).parent / "data" / "library.json"
    return LibraryGraph.load_from_file(data_path)


def draw_library_graph(
    graph: LibraryGraph,
    path: Optional[List[str]] = None,
    closed_sections: Optional[Set[str]] = None,
    crowded_aisles: Optional[Set[Tuple[str, str]]] = None,
    current_step_node: Optional[str] = None,
    open_nodes: Optional[Set[str]] = None,
    closed_nodes: Optional[Set[str]] = None,
    highlight_books_nodes: Optional[Dict[str, List[str]]] = None,
) -> plt.Figure:
    """
    Renders an aesthetically styled matplotlib canvas of the library graph:
    - Path highlighted in emerald green
    - Closed sections filled with crimson red
    - Crowded corridors colored in vibrant amber/orange
    - Restricted shelves designated with distinct dashed borders
    - Search frontier nodes indicated with rings
    """
    closed_set = closed_sections or set()
    crowded_set = crowded_aisles or set()
    path_nodes = set(path or [])
    path_edges = set()
    if path and len(path) > 1:
        for u, v in zip(path[:-1], path[1:]):
            path_edges.add(graph.canonical_edge(u, v))

    G = nx.Graph()
    pos = {}
    for nid, node in graph.nodes.items():
        G.add_node(nid, label=node.name, restricted=node.restricted)
        pos[nid] = (node.x, node.y)

    for u in graph.adj:
        for v, d in graph.adj[u].items():
            if u < v:
                G.add_edge(u, v, weight=d)

    fig, ax = plt.subplots(figsize=(12, 7.5), facecolor="#0F172A")
    ax.set_facecolor("#0F172A")

    # Draw standard edges
    normal_edges = []
    crowded_drawn = []
    path_drawn = []

    for u, v in G.edges():
        canon = graph.canonical_edge(u, v)
        if canon in path_edges:
            path_drawn.append((u, v))
        elif canon in crowded_set or (u, v) in crowded_set or (v, u) in crowded_set:
            crowded_drawn.append((u, v))
        else:
            normal_edges.append((u, v))

    # Base corridors
    nx.draw_networkx_edges(
        G, pos, edgelist=normal_edges, ax=ax, edge_color="#334155", width=2.0, alpha=0.75
    )

    # Crowded corridors (Orange/Amber)
    if crowded_drawn:
        nx.draw_networkx_edges(
            G, pos, edgelist=crowded_drawn, ax=ax, edge_color="#F59E0B", width=4.5, style="solid", alpha=0.9
        )

    # Traversed path corridors (Emerald Green)
    if path_drawn:
        nx.draw_networkx_edges(
            G, pos, edgelist=path_drawn, ax=ax, edge_color="#10B981", width=5.0, alpha=0.95
        )

    # Node coloring rules
    node_colors = []
    node_border_colors = []
    node_styles = []

    for nid in G.nodes():
        node = graph.get_node(nid)
        if nid in closed_set:
            node_colors.append("#EF4444")  # Crimson Red for closed
            node_border_colors.append("#7F1D1D")
            node_styles.append("solid")
        elif nid == current_step_node:
            node_colors.append("#38BDF8")  # Cyan for active node in step scrubber
            node_border_colors.append("#FFFFFF")
            node_styles.append("solid")
        elif path and nid == path[0]:
            node_colors.append("#3B82F6")  # Blue for start
            node_border_colors.append("#FFFFFF")
            node_styles.append("solid")
        elif path and nid == path[-1]:
            node_colors.append("#10B981")  # Emerald for goal / checkout
            node_border_colors.append("#FFFFFF")
            node_styles.append("solid")
        elif nid in path_nodes:
            node_colors.append("#059669")  # Waypoint green
            node_border_colors.append("#A7F3D0")
            node_styles.append("solid")
        elif open_nodes and nid in open_nodes:
            node_colors.append("#6366F1")  # Indigo for open list
            node_border_colors.append("#C7D2FE")
            node_styles.append("solid")
        elif closed_nodes and nid in closed_nodes:
            node_colors.append("#64748B")  # Slate for closed list
            node_border_colors.append("#94A3B8")
            node_styles.append("solid")
        elif node.restricted:
            node_colors.append("#8B5CF6")  # Purple for restricted
            node_border_colors.append("#DDD6FE")
            node_styles.append("dashed")
        else:
            node_colors.append("#1E293B")  # Dark slate base
            node_border_colors.append("#64748B")
            node_styles.append("solid")

    # Draw nodes with border styling
    for i, nid in enumerate(G.nodes()):
        node = graph.get_node(nid)
        style = "dashed" if node.restricted else "solid"
        ax.scatter(
            pos[nid][0],
            pos[nid][1],
            s=650,
            c=node_colors[i],
            edgecolors=node_border_colors[i],
            linewidths=2.5 if node.restricted else 1.8,
            linestyle="--" if node.restricted else "-",
            zorder=4,
        )

    # Edge labels (distances in meters)
    edge_labels = {(u, v): f"{d['weight']:.0f}m" for u, v, d in G.edges(data=True)}
    nx.draw_networkx_edge_labels(
        G, pos, edge_labels=edge_labels, ax=ax, font_size=8, font_color="#94A3B8", font_family="sans-serif", bbox=dict(boxstyle="round,pad=0.2", facecolor="#1E293B", edgecolor="#334155", alpha=0.85)
    )

    # Node text labels
    labels = {}
    for nid, node in graph.nodes.items():
        short_name = node.name.split("&")[0].strip()
        if len(short_name) > 14:
            short_name = short_name[:12] + ".."
        labels[nid] = short_name

    nx.draw_networkx_labels(
        G, pos, labels=labels, ax=ax, font_size=8.5, font_color="#F8FAFC", font_weight="bold", font_family="sans-serif"
    )

    # Legend elements
    legend_elements = [
        mpatches.Patch(color="#10B981", label="Optimal Route Path"),
        mpatches.Patch(color="#EF4444", label="Closed Section"),
        mpatches.Patch(color="#F59E0B", label="Crowded Aisle (x2.5 penalty)"),
        mpatches.Patch(facecolor="#8B5CF6", edgecolor="#DDD6FE", linestyle="--", label="Restricted Shelf (Auth req.)"),
    ]
    ax.legend(
        handles=legend_elements,
        loc="upper left",
        facecolor="#1E293B",
        edgecolor="#334155",
        labelcolor="#E2E8F0",
        fontsize=8.5,
    )

    ax.axis("off")
    fig.tight_layout()
    return fig


def main():
    graph = load_graph()

    st.title("📚 Intelligent Library Search & Book Collection Agent")
    st.markdown(
        """
        AI agent demonstrating classical search algorithms (**BFS**, **DFS**, **A\***)
        and **Multi-Book TSP Route Optimization** across a university library environment.
        """
    )

    # Sidebar controls
    st.sidebar.header("🛠️ Agent Configuration")

    mode = st.sidebar.radio(
        "Operation Mode",
        ["Single Book Search", "Multi-Book Route Optimizer", "Algorithm Comparison (BFS vs DFS vs A*)"],
    )

    cost_mode = st.sidebar.selectbox(
        "Cost Calculation Metric",
        options=["distance", "time"],
        format_func=lambda x: "Walking Distance (meters)" if x == "distance" else "Estimated Collection Time (seconds)",
    )

    all_node_ids = list(graph.nodes.keys())
    start_node = st.sidebar.selectbox("Start Location", options=all_node_ids, index=all_node_ids.index(graph.default_start))

    st.sidebar.markdown("---")
    st.sidebar.subheader("🚧 Dynamic Environment Constraints")

    # Closed sections
    closed_sections_sel = st.sidebar.multiselect(
        "Closed Sections (Inaccessible Nodes)",
        options=[nid for nid in all_node_ids if nid != start_node],
        default=[],
        help="Sections blocked due to maintenance, events, or cleaning.",
    )
    closed_set = set(closed_sections_sel)

    # Crowded aisles
    edge_tuples = []
    edge_names = []
    for u in graph.adj:
        for v in graph.adj[u]:
            if u < v:
                edge_tuples.append((u, v))
                edge_names.append(f"{u} ↔ {v}")

    crowded_sel = st.sidebar.multiselect(
        "Crowded Aisles (Delay Multiplier)",
        options=edge_names,
        default=[],
        help="Congested corridors apply a 2.5x distance/time delay penalty.",
    )
    crowded_set = set()
    for name in crowded_sel:
        parts = [p.strip() for p in name.split("↔")]
        crowded_set.add(graph.canonical_edge(parts[0], parts[1]))

    # Permission for restricted shelves
    has_permission = st.sidebar.checkbox(
        "Special Archive Access Permission",
        value=False,
        help="Check if user has clearance to enter Special Collections & Rare Manuscripts.",
    )

    # Catalog book items
    book_options = {
        f"[{b.id}] {b.title} ({b.shelf}) - Pri: {b.priority_label()} {'[UNAVAILABLE]' if not b.available else ''} {'[RESTRICTED]' if b.restricted else ''}": b.id
        for b in graph.books.values()
    }

    # MODE 1: Single Book Search
    if mode == "Single Book Search":
        st.subheader("🎯 Single Book Target Search")

        col1, col2 = st.columns([1, 1])
        with col1:
            algorithm = st.selectbox("Search Algorithm", ["A*", "BFS", "DFS"])
        with col2:
            selected_book_label = st.selectbox("Target Book", list(book_options.keys()))
            selected_book_id = book_options[selected_book_label]
            target_book = graph.get_book(selected_book_id)

        target_shelf = target_book.shelf

        # Run selected search
        if algorithm == "A*":
            res = a_star_search(graph, start_node, target_shelf, closed_set, crowded_set, has_permission, cost_mode)
        elif algorithm == "BFS":
            res = breadth_first_search(graph, start_node, target_shelf, closed_set, crowded_set, has_permission, cost_mode)
        else:
            res = depth_first_search(graph, start_node, target_shelf, closed_set, crowded_set, has_permission, cost_mode)

        # Inventory check note
        if not target_book.available:
            st.warning(f"⚠️ Notice: Book '{target_book.title}' is cataloged as currently unavailable/borrowed.")

        # Display result summary
        if res.success:
            st.success(f"✅ {res.message}")
            c1, c2, c3, c4 = st.columns(4)
            c1.metric("Total Path Cost", f"{res.total_cost:.1f} {'m' if cost_mode == 'distance' else 's'}")
            c2.metric("Path Length (Edges)", f"{res.path_length_edges} hops")
            c3.metric("Nodes Expanded", f"{res.nodes_expanded}")
            c4.metric("Algorithm", algorithm)

            # Route visualizer
            st.markdown("#### 🗺️ Final Navigation Route")
            st.info(" ➔ ".join(res.path))

            # Step Scrubber for Open/Closed lists
            st.markdown("---")
            st.markdown("### 🔍 Step-by-Step Search Frontier Telemetry")
            if res.step_snapshots:
                step_idx = st.slider(
                    "Search Iteration Step",
                    min_value=1,
                    max_value=len(res.step_snapshots),
                    value=len(res.step_snapshots),
                )
                curr_snap = res.step_snapshots[step_idx - 1]
                st.caption(f"**Step {curr_snap.step_number}:** {curr_snap.action_note}")

                open_n = {item.node for item in curr_snap.open_list}
                closed_n = {item.node for item in curr_snap.closed_list}

                # Graph rendered with current step highlighted
                fig = draw_library_graph(
                    graph,
                    path=res.path,
                    closed_sections=closed_set,
                    crowded_aisles=crowded_set,
                    current_step_node=curr_snap.current_node,
                    open_nodes=open_n,
                    closed_nodes=closed_n,
                )
                st.pyplot(fig)

                # Tables
                tcol1, tcol2 = st.columns(2)
                with tcol1:
                    st.markdown(f"**Open List (Frontier) - Size: {len(curr_snap.open_list)}**")
                    if curr_snap.open_list:
                        df_open = pd.DataFrame([n.to_dict() for n in curr_snap.open_list])
                        st.dataframe(df_open, use_container_width=True)
                    else:
                        st.write("Frontier is empty.")

                with tcol2:
                    st.markdown(f"**Closed List (Explored) - Size: {len(curr_snap.closed_list)}**")
                    if curr_snap.closed_list:
                        df_closed = pd.DataFrame([n.to_dict() for n in curr_snap.closed_list])
                        st.dataframe(df_closed, use_container_width=True)
                    else:
                        st.write("Closed list is empty.")
        else:
            st.error(f"❌ {res.message}")
            fig = draw_library_graph(
                graph,
                path=[],
                closed_sections=closed_set,
                crowded_aisles=crowded_set,
            )
            st.pyplot(fig)

    # MODE 2: Multi-Book Route Optimizer
    elif mode == "Multi-Book Route Optimizer":
        st.subheader("🛒 Multi-Book Collection & Route Optimizer (TSP)")

        col1, col2 = st.columns([2, 1])
        with col1:
            selected_labels = st.multiselect(
                "Select Books to Collect",
                options=list(book_options.keys()),
                default=[
                    list(book_options.keys())[0],  # AI Modern Approach
                    list(book_options.keys())[3],  # Feynman Physics
                    list(book_options.keys())[5],  # Linear Algebra
                ],
            )
            selected_bids = [book_options[lbl] for lbl in selected_labels]

        with col2:
            time_budget = st.number_input(
                "Time Budget Limit (seconds, 0 for unlimited)", min_value=0, max_value=3600, value=0, step=30
            )
            time_limit = float(time_budget) if time_budget > 0 else None
            checkout_node = st.selectbox(
                "Final Checkout Node", all_node_ids, index=all_node_ids.index(graph.default_checkout)
            )

        if not selected_bids:
            st.warning("Please select at least one book from the catalog.")
            return

        plan = optimize_multi_book_collection(
            graph=graph,
            book_ids=selected_bids,
            start_node=start_node,
            checkout_node=checkout_node,
            closed_sections=closed_set,
            crowded_aisles=crowded_set,
            has_permission=has_permission,
            cost_mode=cost_mode,
            time_limit_seconds=time_limit,
        )

        if plan.success:
            st.success(f"✅ {plan.message}")

            m1, m2, m3, m4 = st.columns(4)
            m1.metric("Total Walking Distance", f"{plan.total_distance_meters:.1f} m")
            m2.metric("Total Transit Time", f"{plan.total_transit_seconds:.0f} s")
            m3.metric("Pickup Time", f"{plan.total_pickup_seconds:.0f} s")
            m4.metric("Estimated Mission Time", f"{plan.total_time_seconds:.0f} s (~{plan.total_time_seconds/60:.1f} min)")

            fig = draw_library_graph(
                graph,
                path=plan.full_path,
                closed_sections=closed_set,
                crowded_aisles=crowded_set,
            )
            st.pyplot(fig)

            # Collection Schedule Breakdown
            st.markdown("### 📋 Turn-by-Turn Collection Legs")
            leg_rows = []
            for leg in plan.legs:
                collected_titles = ", ".join([b.title for b in leg.books_collected]) or "Transit to next section"
                leg_rows.append(
                    {
                        "Leg": f"Leg {leg.leg_index}",
                        "From": leg.from_node,
                        "To": leg.to_node,
                        "Sub-Path": " ➔ ".join(leg.path),
                        "Distance": f"{leg.distance_meters:.1f} m",
                        "Leg Time": f"{leg.duration_seconds:.0f} s",
                        "Books Collected at Stop": collected_titles,
                    }
                )
            st.table(pd.DataFrame(leg_rows))

            # Skipped books notification
            if plan.skipped_books:
                st.markdown("### ⚠️ Excluded / Skipped Books")
                skip_rows = [
                    {
                        "Book ID": sb.book.id,
                        "Title": sb.book.title,
                        "Shelf": sb.book.shelf,
                        "Priority": sb.book.priority_label(),
                        "Reason For Skip": sb.reason,
                    }
                    for sb in plan.skipped_books
                ]
                st.dataframe(pd.DataFrame(skip_rows), use_container_width=True)
        else:
            st.error(f"❌ {plan.message}")
            if plan.skipped_books:
                st.markdown("### ⚠️ Skipped Books Report")
                skip_rows = [
                    {
                        "Book ID": sb.book.id,
                        "Title": sb.book.title,
                        "Shelf": sb.book.shelf,
                        "Priority": sb.book.priority_label(),
                        "Reason For Skip": sb.reason,
                    }
                    for sb in plan.skipped_books
                ]
                st.dataframe(pd.DataFrame(skip_rows), use_container_width=True)

    # MODE 3: Algorithm Comparison
    else:
        st.subheader("⚖️ Algorithm Side-by-Side Comparison (BFS vs DFS vs A*)")

        target_shelf_comp = st.selectbox(
            "Select Goal Shelf for Comparison",
            options=[nid for nid in all_node_ids if nid != start_node],
            index=all_node_ids.index("Computer_Science") if "Computer_Science" in all_node_ids else 0,
        )

        results = compare_algorithms(
            graph,
            start_node=start_node,
            goal_node=target_shelf_comp,
            closed_sections=closed_set,
            crowded_aisles=crowded_set,
            has_permission=has_permission,
            cost_mode=cost_mode,
        )

        comp_data = []
        for name, res in results.items():
            comp_data.append(
                {
                    "Algorithm": name,
                    "Success": "Yes" if res.success else "No",
                    "Path Length (Edges)": res.path_length_edges if res.success else "-",
                    f"Cost ({'meters' if cost_mode == 'distance' else 'seconds'})": f"{res.total_cost:.2f}" if res.success else "-",
                    "Nodes Expanded": res.nodes_expanded,
                    "Optimal?": "YES (Guaranteed)" if name == "A*" else ("Fewest hops only" if name == "BFS" else "No"),
                    "Path Found": " ➔ ".join(res.path) if res.success else "No path",
                }
            )

        st.dataframe(pd.DataFrame(comp_data), use_container_width=True)

        st.markdown(
            """
            #### 💡 Key Algorithmic Insights:
            - **A\*** is cost-optimal: it considers cumulative distance ($g$) and Euclidean distance ($h$), finding the shortest physical path.
            - **BFS** explores by shallowest level first: it guarantees the minimal number of hops/edges, but can be suboptimal on weighted graphs.
            - **DFS** dives deep along branch edges: fast in deep trees but often yields long, zig-zag paths with high costs.
            """
        )

        # Plot all paths
        fig, axes = plt.subplots(1, 3, figsize=(18, 5.5), facecolor="#0F172A")
        for ax, (algo_name, res) in zip(axes, results.items()):
            ax.set_facecolor("#0F172A")
            ax.set_title(f"{algo_name} Path (Cost: {res.total_cost:.1f}, Exp: {res.nodes_expanded})", color="#F8FAFC", fontsize=11, fontweight="bold")
            # Draw sub-graph
            G_sub = nx.Graph()
            pos_sub = {nid: (n.x, n.y) for nid, n in graph.nodes.items()}
            for nid, node in graph.nodes.items():
                G_sub.add_node(nid)
            for u in graph.adj:
                for v in graph.adj[u]:
                    if u < v:
                        G_sub.add_edge(u, v)

            nx.draw_networkx_edges(G_sub, pos_sub, ax=ax, edge_color="#334155", width=1.5, alpha=0.6)
            if res.success and len(res.path) > 1:
                p_edges = list(zip(res.path[:-1], res.path[1:]))
                nx.draw_networkx_edges(G_sub, pos_sub, edgelist=p_edges, ax=ax, edge_color="#10B981" if algo_name == "A*" else "#38BDF8", width=3.5)

            for nid in G_sub.nodes():
                color = "#10B981" if nid == target_shelf_comp else ("#3B82F6" if nid == start_node else "#1E293B")
                ax.scatter(pos_sub[nid][0], pos_sub[nid][1], s=350, c=color, edgecolors="#64748B", linewidths=1.2, zorder=3)

            labels = {nid: nid[:4] for nid in G_sub.nodes()}
            nx.draw_networkx_labels(G_sub, pos_sub, labels=labels, ax=ax, font_size=7, font_color="#F8FAFC")
            ax.axis("off")

        fig.tight_layout()
        st.pyplot(fig)


if __name__ == "__main__":
    main()
