---
title: Networks and Hierarchies
description: Choose tidy trees, spatial adjacency graphs, and force-directed networks for connected or nested data.
---

Network and hierarchy charts show relationships rather than values on two
independent quantitative axes. Their node positions usually come from an
application-owned layout algorithm, then flow into ordinary links, dots, and
text marks.

Use these views only when topology is the question. Dense networks quickly
become less legible than a matrix, grouped summary, or searchable table.

## Choose the topology

| Reader question                                                | Start with                             |
| -------------------------------------------------------------- | -------------------------------------- |
| What is the parent-child structure and depth?                  | Tidy hierarchy tree                    |
| Which positioned observations are spatial neighbors?           | Delaunay adjacency network             |
| Which dependency clusters emerge without fixed positions?      | Force-directed network                 |
| How does quantity split and recombine?                         | Basic Sankey                           |
| How does value move through staged subtotals?                  | Sankey flow diagram                    |
| How large are branches within a strict hierarchy?              | Packed or rectangular hierarchy        |
| Must many entities be compared by attributes, not connections? | A table, facets, or quantitative chart |

Layout, traversal, grouping, and collision handling belong to data
preparation. [Scales and D3](../concepts/scales-and-d3.md) routes those
algorithms to the official D3 documentation while TanStack Charts renders the
typed result.

## Start with a basic Sankey

The smallest useful Sankey shows a single input splitting into two paths and
recombining into one output. Link width is the only quantitative encoding in
this example; nodes and links use the chart theme, and every node gets one
short name.

<iframe
  src="https://tanstack.com/charts/catalog/embed/111-basic-sankey/?theme=system&height=480"
  title="Basic Sankey diagram built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

Use this version as the starting point when the structure matters more than
styling. Its four explicit links start with a 60/40 split. **Update data**
varies that split while preserving a total flow of 10 through both paths.

## Customize a Sankey

A Sankey diagram makes conservation and decomposition visible at the same
time: link width carries quantity, while each node marks a meaningful subtotal
or outcome. This Apple FY22 income statement follows product and service
revenue through gross profit, operating costs, operating profit, and net
profit.

<iframe
  src="https://tanstack.com/charts/catalog/embed/111-sankey-flow/?theme=system&height=500"
  title="Apple FY22 income statement Sankey diagram built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="500"
  style="width:100%;height:500px;border:0;"
></iframe>

The example runs the official `d3-sankey` layout in responsive data
preparation, converts its output to positioned rows, and renders those rows
with the native `link`, `rect`, and `text` marks. The application owns direct
`d3-sankey` and `@types/d3-sankey` dependencies; Charts does not add them to
unrelated consumers. Keep the source data explicit and verify that every
intermediate subtotal has equal incoming and outgoing value. Use direct labels
and tone as well as color so profit and cost paths remain identifiable.

## Show a strict hierarchy

A tidy tree assigns one position per node and one link per parent-child
relationship. Direct labels make a small hierarchy readable without requiring
hover.

<iframe
  src="https://tanstack.com/charts/catalog/embed/36-hierarchy-tree/?theme=system&height=480"
  title="Directly labeled tidy Flare toolkit hierarchy built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

Validate the hierarchy before layout:

- Every non-root node has one valid parent.
- IDs are unique and stable.
- Cycles are rejected.
- Child order is intentional.
- Collapsed branches remain represented in application state.

The layout output can retain each original record while adding x, y, depth, and
parent coordinates. Render links first, then nodes and labels. See
[Rules, Links, Arrows, Vectors, and Ticks](../reference/marks/rules-links-arrows-vectors-and-ticks.md)
and [Dot and Hexagon Marks](../reference/marks/dot-and-hexagon.md).

## Reveal spatial adjacency

A Delaunay network connects points that are neighbors in a triangulation. It
answers local spatial adjacency; it does not imply a business or causal
relationship unless the data model defines one.

<iframe
  src="https://tanstack.com/charts/catalog/embed/37-delaunay-network/?theme=system&height=480"
  title="Delaunay spatial adjacency network built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

Deduplicate undirected edges during preparation and retain the source node IDs
on each edge. If the point positions change with responsive scale ranges,
recompute pixel-space adjacency from the final plot geometry rather than
reusing stale edges.

When Delaunay is used only for nearest-point lookup, keep the triangulation in
a `ChartSpatialIndexFactory` instead of painting its edges. See
[Tooltips and Focus](../guides/tooltips-and-focus.md).

## Explore an unconstrained character network

A force-directed layout can reveal clusters and bridges when positions are not
already meaningful. It also introduces motion, stochastic initialization, and
collision policy that can make comparison unstable.

<iframe
  src="https://tanstack.com/charts/catalog/embed/40-force-directed-network/?theme=system&height=480"
  title="Force-directed Les Misérables character network built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

Run the simulation outside the renderer and feed settled coordinates to the
chart. For repeatable output, use deterministic initialization and a defined
stopping rule. Preserve node keys so data updates reconcile existing geometry
instead of replacing the complete network.

If drag-to-reposition is part of the product, store the resulting positions in
application state and provide a keyboard-accessible alternative or detail
control. The chart scene should remain a projection of that controlled state.

## Labels, direction, and weight

- Use arrowheads only for genuinely directed edges.
- Encode link weight sparingly; wide overlapping links can hide nodes.
- Label selected or important nodes instead of every node in a dense graph.
- Use color for stable semantic groups, not whichever cluster happens to be
  near another after a simulation.
- Provide a searchable list or details panel for nodes that cannot be labeled
  directly.

Custom link paths or non-cartesian layouts may need a public custom mark. Start
with built-in links, dots, and text, then use
[Custom Marks and Renderers](../guides/custom-marks-and-renderers.md) only for
geometry that composition cannot express.

## Production checks

- Confirm that links represent a documented relationship.
- Bound node and edge counts or aggregate the graph before rendering.
- Keep node and edge IDs stable across revisions.
- Make layout initialization and ordering deterministic when comparison
  matters.
- Test disconnected nodes, cycles, missing parents, duplicate edges, and empty
  graphs.
- Do not rely on color or pointer hover as the only identification path.
- Preserve keyboard focus and selection after layout updates.
- Measure dense cases with [Large Data](../guides/large-data.md).
