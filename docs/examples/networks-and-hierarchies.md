---
title: Networks and Hierarchies
description: Choose tidy trees, Sankey flows, spatial adjacency graphs, and force-directed networks for connected or nested data.
---

Network and hierarchy charts show relationships rather than values on two
independent quantitative axes. Node-link layouts can produce semantic
coordinates for ordinary marks. Area layouts such as treemaps and radial
partitions such as sunbursts, and weighted flows such as Sankey diagrams,
instead depend on final layout bounds and render through responsive composite
marks.

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
| How large are branches within a strict hierarchy?              | Treemap                                |
| How does branch value divide across hierarchy depth?           | Sunburst                               |
| Must many entities be compared by attributes, not connections? | A table, facets, or quantitative chart |

Layout, traversal, grouping, and collision handling belong to eager data
preparation unless they depend on final chart bounds. TanStack Charts provides
optional static tree and force transforms plus final-layout spatial, hierarchy,
and Sankey marks. [Scales and D3](../concepts/scales-and-d3.md) documents that
boundary.

## Start with a basic Sankey

The smallest useful Sankey shows a single input splitting into two paths and
recombining into one output. Link width is the only quantitative encoding in
this example; nodes and links use the chart theme, and every node gets one
short name.

Use this version as the starting point when the structure matters more than
styling. Its four explicit links preserve a total flow of 10 through a 60/40
split.

The definition supplies semantic rows and composes ordinary marks after the
responsive layout resolves:

```ts group=basic-sankey env=charts file=/src/chart.ts entry
import { defineChart, link, rect, text } from '@tanstack/charts'
import { sankeyDiagram } from '@tanstack/charts/network/sankey'
import { links, nodes } from './data'

export default defineChart({
  marks: [
    sankeyDiagram({
      nodes,
      links,
      nodeKey: 'id',
      source: 'source',
      target: 'target',
      value: 'value',
      align: 'left',
      nodePadding: 28,
      inset: { left: 16, right: 16, top: 24, bottom: 12 },
      marks: ({ nodes: layoutNodes, links: layoutLinks }) =>
        [
          link(layoutLinks, {
            x1: 'x1',
            y1: 'y1',
            x2: 'x2',
            y2: 'y2',
            key: 'key',
            strokeWidth: (flow) => flow.width,
          }),
          rect(layoutNodes, {
            x1: 'x0',
            x2: 'x1',
            y1: 'y0',
            y2: 'y1',
            key: 'key',
            inset: 0,
          }),
          text(layoutNodes, {
            x: 'x',
            y: (node) => node.y0 - 8,
            text: (node) => node.data.label,
            key: 'key',
            fill: 'currentColor',
            fontSize: 12,
            fontWeight: 650,
          }),
        ] as const,
    }),
  ],
  guides: false,
  margin: 0,
})
```

```ts group=basic-sankey file=/src/data.ts collapsed
export const nodes = [
  { id: 'input', label: 'Input' },
  { id: 'path-a', label: 'Path A' },
  { id: 'path-b', label: 'Path B' },
  { id: 'output', label: 'Output' },
]

export const links = [
  { source: 'input', target: 'path-a', value: 6 },
  { source: 'input', target: 'path-b', value: 4 },
  { source: 'path-a', target: 'output', value: 6 },
  { source: 'path-b', target: 'output', value: 4 },
]
```

[Open the interactive basic Sankey catalog example](https://tanstack.com/charts/catalog/111-basic-sankey/).

## Customize a Sankey

A Sankey diagram makes conservation and decomposition visible at the same
time: link width carries quantity, while each node marks a meaningful subtotal
or outcome. This Apple FY22 income statement follows product and service
revenue through gross profit, operating costs, operating profit, and net
profit.

<!-- ::chart-example id=111-sankey-flow height=500 -->

`sankeyDiagram` owns the responsive flow layout, D3 mutation isolation,
endpoint resolution, proportional widths, identity, and source lineage. Its
`marks` callback keeps the income statement's authored order, compact wording,
label side, two-line values, backdrops, title, and semantic colors beside the
native `link`, `rect`, and `text` definitions. The application does not import
`d3-sankey`; the exact Charts subpath keeps it out of unrelated consumers.

Keep every intermediate subtotal balanced. Use direct labels and tone as well
as color so profit and cost paths remain identifiable. See the
[Sankey diagram reference](../reference/marks/sankey.md) for responsive layout
options and immutable node/link fields.

## Show a strict hierarchy

A tidy tree assigns one position per node and one link per parent-child
relationship. Direct labels make a small hierarchy readable without requiring
hover.

Use the exact optional transform for a static tidy tree:

```ts group=hierarchy-tree env=charts file=/src/chart.ts entry
import { defineChart, dot, link, text } from '@tanstack/charts'
import { treeLayout } from '@tanstack/charts/hierarchy/tree'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { rows } from './data'

const hierarchy = treeLayout(rows, {
  path: 'name',
  delimiter: '.',
})

export default defineChart({
  marks: [
    link(hierarchy.links, {
      x1: 'x1',
      y1: 'y1',
      x2: 'x2',
      y2: 'y2',
      key: 'id',
      stroke: '#94a3b8',
      strokeWidth: 1.5,
    }),
    dot(hierarchy.nodes, {
      x: 'x',
      y: 'y',
      key: 'id',
      fill: '#2563eb',
      r: 4,
    }),
    text(hierarchy.nodes, {
      x: 'x',
      y: 'y',
      text: 'name',
      key: 'id',
      fill: '#2563eb',
      anchor: (node) => (node.internal ? 'end' : 'start'),
      dx: (node) => (node.internal ? -7 : 7),
    }),
  ],
  x: { scale: scaleLinear },
  y: { scale: scaleLinear },
  guides: false,
  margin: { top: 24, right: 110, bottom: 24, left: 64 },
})
```

```ts group=hierarchy-tree file=/src/data.ts collapsed
export const rows = [
  { name: 'Product' },
  { name: 'Product.Analytics' },
  { name: 'Product.Analytics.Reports' },
  { name: 'Product.Analytics.Dashboards' },
  { name: 'Product.Platform' },
  { name: 'Product.Platform.API' },
  { name: 'Product.Platform.Workers' },
]
```

[Open the larger Flare hierarchy catalog example](https://tanstack.com/charts/catalog/36-hierarchy-tree/).

Use `id` and `parentId` instead of `path` for explicit parent-reference rows.
Path input may omit ancestors; the result includes those structural nodes with
`data: null` and empty source lineage. Explicit rows retain their original
record and index, and each link carries the target node's lineage.

`treeLayout` rejects duplicate IDs, invalid parents, multiple roots, and
cycles. Keep source order intentional because it controls child order when
`sort` is omitted. Collapsed branches remain application state; select the
visible rows before running the transform.

The default `left` orientation anchors the root at the left and grows toward
the right. `right`, `top`, and `bottom` use the same stable tidy layout, and
`nodeSize` controls semantic breadth and depth spacing. Normal scales own the
responsive mapping; resizing does not require a new hierarchy layout. Use
`sort` only when child order should differ from source order. Render links
first, then nodes and labels. See
[Rules, Links, Arrows, Vectors, and Ticks](../reference/marks/rules-links-arrows-vectors-and-ticks.md)
and [Dot and Hexagon Marks](../reference/marks/dot-and-hexagon.md).

## Compare hierarchy area

A treemap encodes each leaf's contribution as area while keeping leaves inside
their parent branch. Use it when branch size matters more than exact depth or
link tracing.

<!-- ::chart-example id=74-recharts-treemap height=480 -->

The exact optional mark accepts the same flat path or parent-reference input as
the tidy-tree transform, but it owns final-pixel rectangles and labels:

```ts
import { defineChart } from '@tanstack/charts'
import { treemap } from '@tanstack/charts/hierarchy/treemap'

const chart = defineChart({
  marks: [
    treemap(rows, {
      path: 'name',
      delimiter: '.',
      value: 'size',
      ratio: 4 / 3,
      round: true,
      color: (node) => node.ancestorIds.at(-1) ?? node.id,
      label: 'name',
      inset: 1,
      stroke: '#fff',
    }),
  ],
  guides: false,
  margin: 0,
})
```

No x or y scale is configured. Squarification uses the final inner aspect ratio,
so resizing may change which rectangles share an edge. Pixel padding and the
screen convention where y increases downward remain inside the mark.

The default child order is the authored hierarchy order. Use `sort` only when
sibling order is a deliberate encoding. In-cell labels are centered and hidden
when measured text plus `labelPadding` does not fit. Color, label, state, and
paint channels receive stable `TreemapNode` values with hierarchy metadata,
aggregate value, the source row, and its original index. See the
[Treemap Mark reference](../reference/marks/treemap.md).

## Partition hierarchy depth

A sunburst uses angle for aggregate branch value and radius for hierarchy
depth. It preserves more depth structure than a treemap, but arc length is
harder to compare precisely than aligned area or position.

Use the exact optional [`sunburst` mark](../reference/marks/sunburst.md) inside
`polar`. It accepts the same path or explicit parent-reference hierarchy input
as the other hierarchy entries, aggregates values, and allocates its sectors
after the final polar radius resolves. Use `branchId` for inherited branch
color and direct `SunburstNode` lineage for tooltips and state callbacks.

## Reveal spatial adjacency

A Delaunay network connects points that are neighbors in a triangulation. It
answers local spatial adjacency; it does not imply a business or causal
relationship unless the data model defines one.

<!-- ::chart-example id=37-delaunay-network height=480 -->

The optional [`delaunayLink` mark](../reference/marks/delaunay.md) accepts the
source points directly. It projects both configured axes after final layout,
triangulates each `z` group in screen space, and retains both endpoint records
on every native link. Supply a stable point `key`; edge identity is derived
from the endpoint keys.

When Delaunay is used only for nearest-point lookup, keep the triangulation in
a `ChartSpatialIndexFactory` instead of painting its edges. See
[Tooltips and Focus](../guides/tooltips-and-focus.md).

## Explore an unconstrained character network

A force-directed layout can reveal clusters and bridges when positions are not
already meaningful. It also introduces motion, stochastic initialization, and
collision policy that can make comparison unstable.

<!-- ::chart-example id=40-force-directed-network height=480 -->

Use the exact optional transform for a settled static network:

```ts
import { defineChart, dot, link, text } from '@tanstack/charts'
import { forceLayout } from '@tanstack/charts/network/force'
import { scaleLinear } from 'd3-scale'

const graph = forceLayout(nodes, links, {
  nodeKey: 'id',
  source: 'source',
  target: 'target',
  iterations: 300,
  forces: [
    { type: 'link', distance: 42 },
    { type: 'manyBody', strength: -120 },
    { type: 'center' },
    { type: 'collide', radius: 9 },
  ],
})

const chart = defineChart({
  marks: [
    link(graph.links, {
      x1: 'x1',
      y1: 'y1',
      x2: 'x2',
      y2: 'y2',
      key: ({ source, target }) => `${source}->${target}`,
    }),
    dot(graph.nodes, { x: 'x', y: 'y', color: 'group', key: 'id' }),
    text(graph.nodes, { x: 'x', y: 'y', text: 'id', key: 'id' }),
  ],
  x: { scale: scaleLinear().domain(graph.xDomain) },
  y: { scale: scaleLinear().domain(graph.yDomain) },
})
```

`forceLayout` clones both inputs, applies the explicit forces in authored
order, runs a fixed number of synchronous ticks, resolves link endpoints, and
returns padded domains. It is chart-size independent: resizing remaps the
settled coordinates and does not require another simulation. Keep node and
link order stable when comparisons must repeat exactly, and memoize the
transform when unchanged data would otherwise rebuild it.

`forceLayout` is not a live simulation controller. If drag-to-reposition is
part of the product, run the live controller outside the chart, store its
positions in application state, and provide a keyboard-accessible alternative
or detail control. The chart scene remains a projection of that controlled
state.

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
