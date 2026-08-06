---
title: Sankey Diagram Mark
description: Reference for responsive flow layout, semantic graph input, immutable node and link rows, ordinary child marks, and the optional Sankey import.
---

`sankeyDiagram` lays out a directed weighted graph in final plot pixels, then
composes ordinary marks over its nodes and links. Source rows stay semantic;
the application does not clone D3 records, resolve mutated endpoints, or
materialize positioned DTOs.

```ts
import { defineChart, link, rect, text } from '@tanstack/charts'
import { sankeyDiagram } from '@tanstack/charts/network/sankey'

const chart = defineChart({
  marks: [
    sankeyDiagram({
      nodes,
      links,
      nodeKey: 'id',
      source: 'source',
      target: 'target',
      value: 'value',
      align: 'left',
      nodeWidth: ({ width }) => Math.max(12, width * 0.025),
      nodePadding: ({ height }) => Math.max(12, height * 0.06),
      inset: 24,
      marks: ({ nodes: layoutNodes, links: layoutLinks }) =>
        [
          link(layoutLinks, {
            x1: 'x1',
            y1: 'y1',
            x2: 'x2',
            y2: 'y2',
            key: 'key',
            strokeWidth: (flow) => Math.max(1, flow.width),
            lineCap: 'butt',
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
            y: 'y',
            text: (node) => node.data.label,
            key: 'key',
          }),
        ] as const,
    }),
  ],
  guides: false,
})
```

The exact `@tanstack/charts/network/sankey` subpath keeps `d3-sankey` and the
resolved flow adapter out of root, universal, force-layout, and ordinary-mark
bundles. The Charts package owns `d3-sankey`; the application needs no direct
dependency unless its own source imports that module.

## Graph input

`nodes` and `links` accept iterables. `nodeKey` identifies each node; `source`
and `target` read those keys from each link; `value` reads its nonnegative
weight.

```ts
sankeyDiagram({
  nodes,
  links,
  nodeKey: 'id',
  source: 'from',
  target: 'to',
  value: 'amount',
  marks,
})
```

Keys must be strings or finite numbers. Graph validation rejects duplicate
node keys, missing endpoints, duplicate authored link keys, and negative or
nonfinite values. A nonempty graph must contain at least one positive link;
zero-valued links may coexist with positive flow. The layout also rejects
cycles.

Use `linkKey` when links can be reordered or when several links share the same
endpoints. Without it, a unique raw `id` field is used when every link has one;
otherwise keys use source, target, and parallel-link occurrence.

Input rows are never mutated. Accessors run when the mark is created; repeated
responsive layout passes use fresh private graph records.

## Options

| Option        | Type                                                | Default       | Meaning                                                      |
| ------------- | --------------------------------------------------- | ------------- | ------------------------------------------------------------ |
| `nodes`       | `Iterable<TNode>`                                   | Required      | Semantic node rows                                           |
| `links`       | `Iterable<TLink>`                                   | Required      | Semantic weighted edges                                      |
| `nodeKey`     | `TransformValue<TNode, ChartKey>`                   | Required      | Node identity                                                |
| `source`      | `TransformValue<TLink, ChartKey>`                   | Required      | Source-node identity                                         |
| `target`      | `TransformValue<TLink, ChartKey>`                   | Required      | Target-node identity                                         |
| `value`       | `TransformValue<TLink, number>`                     | Required      | Nonnegative link weight                                      |
| `linkKey`     | `TransformValue<TLink, ChartKey>`                   | Inferred      | Stable link identity                                         |
| `align`       | `left \| right \| center \| justify`                | `justify`     | Horizontal node-layer alignment                              |
| `nodeSort`    | `SankeyNodeComparator<TNode> \| null`               | D3 order      | Same-column ordering; `null` preserves input order           |
| `linkSort`    | `SankeyLinkComparator<TNode, TLink> \| null`        | D3 order      | Link ordering inside each node; `null` preserves input order |
| `nodeWidth`   | `number \| (chart: ChartBounds) => number`          | `24`          | Positive final-pixel node width                              |
| `nodePadding` | `number \| (chart: ChartBounds) => number`          | `8`           | Nonnegative final-pixel separation within a layer            |
| `inset`       | `number \| SankeyInset \| responsive callback`      | `0`           | Final-pixel inset from the resolved plot bounds              |
| `iterations`  | `number`                                            | `6`           | Nonnegative integer relaxation-pass count                    |
| `marks`       | `(context: SankeyDiagramContext) => nonempty marks` | Required      | Ordinary marks over final-pixel node and link rows           |
| `id`          | `string`                                            | Layer-derived | Stable parent mark identity                                  |
| `motion`      | `ChartMotionDefinition`                             | None          | Parent motion policy merged with each child's motion policy  |

Responsive `nodeWidth`, `nodePadding`, and `inset` callbacks receive the final
`ChartBounds`. Insets may be one number or separate `top`, `right`, `bottom`,
and `left` values. The remaining extent must fit the node width and have a
positive height.

## Child marks

The `marks` callback receives `{ id, chart, nodes, links }`. It must return at
least one ordinary mark. Positional channels in those child marks are already
final pixels, so a Sankey definition needs no x or y scale and normally hides
Cartesian guides.

The callback may run more than once while responsive margins and guides
converge. Keep it synchronous, deterministic, and free of input mutation or
external side effects.

Use the callback for presentation that belongs to the visualization: link
curve and paint, node color, label side and wording, backdrops, or a title.
Those decisions remain visible beside the marks rather than becoming hidden
layout data preparation.

Child scene keys, mark IDs, and interaction points are scoped under the
Sankey mark. Color channels, layout labels, focus states, and child motion
retain their ordinary behavior. A child cannot itself require resolved mark
layout; nested responsive layout passes are rejected.

## Node and link rows

Every `SankeyNode<TNode, TLink>` contains:

- `kind: 'node'`, stable `key`, `index`, `depth`, `height`, and `layer`;
- aggregate `value`;
- final-pixel `x0`, `x1`, `y0`, `y1`, and center `x`, `y`;
- direct raw `data`, `source`, and `sourceIndexes` lineage; and
- immutable `incomingLinks` and `outgoingLinks`.

Every `SankeyLink<TNode, TLink>` contains:

- `kind: 'link'`, stable `key`, raw `data`, `sourceRows`, and
  `sourceIndexes`;
- `sourceKey`, `targetKey`, node indexes, and resolved `sourceNode` and
  `targetNode`;
- semantic `value`; and
- final-pixel `width`, `x1`, `y1`, `x2`, and `y2`.

The output rows and their lineage arrays are immutable. Node and link visual,
sort, tooltip, and motion callbacks can reach the original row through
`data`.

## Types

The exact entry exports `sankeyDiagram`, `SankeyAlignment`, `SankeyInset`,
`SankeyLayoutValue`, `SankeyEndpointContext`, `SankeyNodeContext`,
`SankeyLinkContext`, `SankeyNode`, `SankeyLink`, `SankeyDiagramContext`,
`SankeyNodeComparator`, `SankeyLinkComparator`, and `SankeyDiagramOptions`.

See [Rules, Links, Arrows, Vectors, and Ticks](./rules-links-arrows-vectors-and-ticks.md)
for link curves and paint, and
[Networks and Hierarchies](../../examples/networks-and-hierarchies.md) for the
catalog cases.
