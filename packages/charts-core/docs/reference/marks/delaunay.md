---
title: Delaunay Link Mark
description: Reference for responsive Delaunay adjacency links, source grouping, endpoint lineage, stable keys, and the optional spatial import.
---

`delaunayLink` connects observations that are neighbors in a Delaunay
triangulation of their final scaled screen positions. Import it from the
optional spatial subpath; it is not included in the root or universal barrel.

```ts
import { delaunayLink } from '@tanstack/charts/spatial/delaunay'

delaunayLink(cars, {
  x: 'weight',
  y: 'economy',
  key: 'id',
  stroke: '#94a3b8',
  strokeOpacity: 0.75,
  strokeWidth: 1,
})
```

```ts
function delaunayLink<TDatum, TOptions extends DelaunayLinkOptions<TDatum>>(
  source: Iterable<TDatum>,
  options: TOptions,
): ChartMark<DelaunayLinkDatum<TDatum>>
```

The public type surface includes `DelaunayLinkOptions` and
`DelaunayLinkDatum`.

## Options

| Option                                    | Type                                       | Default        | Meaning                                 |
| ----------------------------------------- | ------------------------------------------ | -------------- | --------------------------------------- |
| `x`                                       | `Channel<TDatum, ChartValue?>`             | Required       | Source horizontal position              |
| `y`                                       | `Channel<TDatum, ChartValue?>`             | Required       | Source vertical position                |
| `z`                                       | `Channel<TDatum, ChartKey?>`               | One group      | Independently triangulated source group |
| `key`                                     | `Channel<TDatum, ChartKey>`                | Inferred       | Stable point identity used in edge keys |
| `id`                                      | `string`                                   | Layer-derived  | Stable mark ID                          |
| `color`                                   | `Channel<DelaunayLinkDatum, ChartKey?>`    | Edge group     | Edge value sent to the color scale      |
| `stroke`                                  | `VisualChannel<DelaunayLinkDatum, string>` | Resolved color | Final stroke                            |
| `strokeOpacity` and `strokeWidth`         | `VisualChannel<DelaunayLinkDatum, number>` | Link defaults  | Edge presentation                       |
| `strokeDasharray`, `lineCap`, and `curve` | Native `link` presentation                 | Link defaults  | Segment presentation                    |
| `motion`                                  | `ChartMotionDefinition<DelaunayLinkDatum>` | Chart policy   | Edge enter, update, and exit motion     |

`z` is evaluated on source rows before layout. Rows with the same non-null
group are triangulated together; links never cross groups. Presentation
accessors are evaluated on the derived edge datum, so they can inspect both
endpoints explicitly:

```ts
delaunayLink(rows, {
  x: 'x',
  y: 'y',
  stroke: ({ source, target }) =>
    source.category === target.category ? '#2563eb' : '#94a3b8',
})
```

## Final-screen topology

Initial complete x/y pairs establish the positional domains. After scales and
inner bounds resolve, the mark projects both axes and triangulates those pixel
positions. It then renders semantic endpoints through the native `link` mark.

This ordering matters because anisotropic x/y ranges can change which diagonal
is Delaunay. Resizing may therefore change adjacency even when the source rows
and domains are unchanged. Repeated compilation at the same dimensions is
deterministic. Inversion is not required, so continuous, temporal, and
categorical positional scales are supported.

## Edge lineage and identity

Each `DelaunayLinkDatum<TDatum, TXValue, TYValue>` contains:

- `source` and `target`, retaining both original row objects;
- `sourceIndex` and `targetIndex`, retaining their original input indexes;
- `sourceKey` and `targetKey`;
- semantic `x1`, `y1`, `x2`, and `y2` endpoints;
- `group`; and
- a canonical `edgeKey` derived from the endpoint keys.

Supply `key` when source order can change. Point keys also provide deterministic
tie-breaking for cocircular and coincident positions. Endpoint order and edge
keys remain stable across responsive topology updates. The interaction point is
the native link midpoint and retains the complete edge datum for tooltips and
motion.

Missing or invalid x/y pairs are omitted without expanding either positional
domain. Coincident points do not produce zero-length edges. Zero or one unique
position produces no links, two positions produce one link, and collinear
positions connect consecutive neighbors.

## Visible links versus nearest-point lookup

Use `delaunayLink` when adjacency is part of the visible encoding. If Delaunay
is used only to accelerate focus lookup, supply a `ChartSpatialIndexFactory`
instead; an invisible link layer should not change focus candidates or bundle
cost.
