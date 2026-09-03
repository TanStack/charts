---
title: Treemap Mark
description: Reference for responsive hierarchy tiling, flat-row construction, node lineage, color, labels, and the optional treemap import.
---

`treemap` converts flat hierarchy rows into area-proportional leaf rectangles.
It runs after the final plot bounds resolve, so tiling, padding, and labels use
CSS pixels without application-owned coordinates or Cartesian scales.

```ts
import { treemap } from '@tanstack/charts/hierarchy/treemap'

const mark = treemap(rows, {
  path: 'name',
  delimiter: '.',
  value: 'size',
  color: (node) => node.ancestorIds.at(-1) ?? node.id,
  label: 'name',
  inset: 1,
  stroke: '#fff',
})
```

The exact optional subpath keeps hierarchy tiling out of root and ordinary-mark
consumers.

## Hierarchy input

Path input constructs parent-child relationships from a string channel:

```ts
treemap(rows, {
  path: 'name',
  delimiter: '.',
  value: 'size',
})
```

Explicit parent references use `nodeId` because `id` is reserved for the mark:

```ts
treemap(rows, {
  id: 'package-sizes',
  nodeId: 'id',
  parentId: 'parentId',
  value: 'size',
})
```

Path input may omit ancestors. The mark imputes those structural nodes with
`data: null` and empty direct lineage. Duplicate identities, invalid parents,
multiple roots, and cycles throw before rendering. Authored child order is
preserved unless `sort` is supplied.

Path-mode IDs use canonical slash form and `name` is the terminal path segment.
Explicit-parent IDs are opaque, so `name` is the complete authored ID even
when it contains a slash.

## Options

`TreemapPathOptions<TDatum>` and `TreemapParentOptions<TDatum>` form the
`TreemapOptions<TDatum>` union.

| Option                                        | Type                                                    | Default                 | Meaning                                               |
| --------------------------------------------- | ------------------------------------------------------- | ----------------------- | ----------------------------------------------------- |
| `path`                                        | `TransformValue<TDatum, string>`                        | Path mode only          | Full hierarchy path                                   |
| `delimiter`                                   | `string`                                                | `/`                     | One-character path separator                          |
| `nodeId`                                      | `TransformValue<TDatum, string>`                        | Parent mode only        | Explicit node identity                                |
| `parentId`                                    | `TransformValue<TDatum, string?>`                       | Parent mode only        | Explicit parent identity                              |
| `value`                                       | `TransformValue<TDatum, number?>`                       | Required                | Nonnegative contribution summed through the hierarchy |
| `method`                                      | `TreemapMethod \| TreemapTile<TDatum>`                  | `squarify`              | Built-in shorthand or D3-compatible tile callable     |
| `ratio`                                       | `number`                                                | Golden ratio            | Squarify target aspect ratio, at least `1`            |
| `round`                                       | `boolean`                                               | `false`                 | Round final rectangle coordinates to pixels           |
| `paddingInner`                                | `number`                                                | `0`                     | Pixel gap between adjacent children                   |
| `paddingOuter`                                | `number`                                                | `0`                     | Pixel gap between parent edges and children           |
| `sort`                                        | `TreemapNodeComparator<TDatum>`                         | Authored order          | Sibling comparator over immutable node contexts       |
| `id`                                          | `string`                                                | Layer-derived           | Stable mark identity                                  |
| `color`                                       | `Channel<TreemapNode<TDatum>, ChartKey?>`               | No group                | Node value sent to the color scale                    |
| `fill`, `stroke`                              | `VisualChannel<TreemapNode<TDatum>, string>`            | Resolved color / none   | Per-node paint                                        |
| `fillOpacity`, `strokeOpacity`, `strokeWidth` | `number`                                                | Renderer default        | Rectangle presentation                                |
| `inset`, `radius`                             | `number`                                                | `0.75` / none           | Painted rectangle inset and corner radius             |
| `label`                                       | `Channel<TreemapNode<TDatum>, string \| number?>`       | None                    | Centered in-cell label                                |
| `labelFill`                                   | `VisualChannel<TreemapNode<TDatum>, string>`            | Theme foreground        | Label paint                                           |
| `labelFontSize`, `labelFontWeight`            | `number`                                                | `11` / renderer default | Label typography                                      |
| `labelPadding`                                | `number`                                                | `4`                     | Minimum painted pixels around a label                 |
| `states`                                      | `readonly ChartMarkState[]`                             | None                    | Focus-driven rectangle states                         |
| `motion`                                      | `ChartMarkMotionOptions<TreemapNode<TDatum>>['motion']` | None                    | Per-node motion policy                                |

Nullish values contribute zero. Other values must be nonnegative and finite.
`ratio` is valid only with `squarify`. Padding, inset, and label padding are
nonnegative CSS-pixel values.

`method` also accepts a native D3 tiler or a compatible callable:

```ts
import { treemapBinary } from 'd3-hierarchy'

treemap(rows, {
  path: 'name',
  value: 'size',
  method: treemapBinary,
})
```

A callable receives a `HierarchyRectangularNode<TreemapTileDatum<TDatum>>`
from the mark's private hierarchy copy plus the tile bounds. It must assign
child coordinates synchronously using the D3 tile contract. The datum wrapper
contains hierarchy identity, the nullable raw row, and its source index. Do
not retain or mutate the authored row. Configure callable-specific behavior in
the callable itself; `ratio` remains exclusive to the `squarify` shorthand.

## Responsive layout

Treemap row grouping depends on the final plot aspect ratio. The mark sizes the
selected tiler to the resolved inner width and height on every layout pass;
resizing may therefore change rectangle adjacency as well as dimensions.
Coordinates use the screen convention where y increases downward and never
enter a Cartesian scale.

Each pass lays out a private hierarchy copy. Value and path accessors are not
rerun, input rows are not mutated, and repeated compilation at one size is
deterministic. Stateful `resquarify` is intentionally not a method.

## Nodes, labels, and interaction

Only positive-area leaves render. Every rectangle and interaction point carries
one `TreemapNode<TDatum>` with:

- stable `id`, `parentId`, and root-to-parent `ancestorIds`;
- `name`, `depth`, `height`, and `internal` / `external` metadata;
- aggregate `value`;
- the authored `data` row, or `null` for an imputed node; and
- direct `source` and `sourceIndexes` lineage.

Color, paint, state, and label channels receive these nodes. A label is emitted
only when its measured bounds plus `labelPadding` fit inside the painted cell.
This uses the chart host's text measurer when available and the deterministic
scene estimator otherwise.

## Types

The exact entry exports `treemap`, `TreemapMethod`, `TreemapTileDatum`,
`TreemapTile`, `TreemapNode`, `TreemapNodeComparator`, `TreemapPathOptions`,
`TreemapParentOptions`, and `TreemapOptions`.
