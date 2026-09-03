---
title: Voronoi Mark
description: Reference for responsive final-screen Voronoi cells, grouping, stable coincident ownership, presentation, and interaction separation.
---

`voronoi` partitions the final plot into the cells nearest to each unique
scaled x/y position. It emits renderer-neutral polygons clipped to the final
plot bounds. Import it from the optional spatial subpath; it is not included in
the root or universal barrel.

```ts
import { dot } from '@tanstack/charts'
import { voronoi } from '@tanstack/charts/spatial/voronoi'

const marks = [
  voronoi(cars, {
    x: 'weight',
    y: 'economy',
    key: 'id',
    color: 'cylinders',
    fillOpacity: 0.14,
    stroke: '#fff',
    strokeWidth: 1,
  }),
  dot(cars, {
    x: 'weight',
    y: 'economy',
    key: 'id',
    color: 'cylinders',
  }),
]
```

```ts
function voronoi<TDatum>(
  source: Iterable<TDatum>,
  options: VoronoiOptions<TDatum>,
): ChartMark<never, never, never, InferredX, InferredY>
```

The mark contributes x/y and color domains but intentionally emits no
`ChartPoint` interaction candidates.

## Options

| Option                                            | Type                                      | Default          | Meaning                                               |
| ------------------------------------------------- | ----------------------------------------- | ---------------- | ----------------------------------------------------- |
| `x`                                               | `Channel<TDatum, ChartValue?>`            | Required         | Source horizontal position                            |
| `y`                                               | `Channel<TDatum, ChartValue?>`            | Required         | Source vertical position                              |
| `z`                                               | `Channel<TDatum, ChartKey?>`              | One tessellation | Independent full-plot topology group                  |
| `key`                                             | `Channel<TDatum, ChartKey>`               | Inferred         | Stable source identity and coincident-cell ownership  |
| `color`                                           | `Channel<TDatum, ChartKey?>`              | No value         | Value sent to the color scale; never a topology group |
| `fill`                                            | `VisualChannel<TDatum, string>`           | Resolved color   | Cell fill                                             |
| `stroke`                                          | `VisualChannel<TDatum, string>`           | None             | Cell stroke                                           |
| `fillOpacity`, `strokeOpacity`, and `strokeWidth` | `number`                                  | Renderer default | Cell presentation                                     |
| `strokeDasharray`                                 | `string`                                  | None             | Cell stroke dash pattern                              |
| `opacity`                                         | `number`                                  | Renderer default | Whole-cell opacity                                    |
| `id`                                              | `string`                                  | Layer-derived    | Stable mark ID                                        |
| `motion`                                          | `ChartMarkMotionOptions<never>['motion']` | None             | Cell enter, update, and exit motion                   |

`fill` and `stroke` accessors receive the original source row, source index,
and complete source array.

## Final-screen topology

Complete x/y pairs establish the positional domains. After scales and inner
bounds resolve, the mark projects both axes, computes the Voronoi diagram in
screen space, and clips every cell to the plot rectangle. Resizing can change
cell geometry even when source values and domains are unchanged.

Inversion is not required, so continuous, temporal, and categorical
positional scales are supported. Missing, nonfinite, or unmappable pairs are
omitted without allowing one coordinate to expand the other coordinate's
domain. Zero valid positions produce no cells; one unique position fills the
plot; two positions split it; and collinear positions remain valid.

The generated polygons are ordinary scene areas, not SVG path strings, so the
same definition works with SVG, Canvas, and static rendering.

## Groups and identity

An explicit `z` creates an independent full-plot tessellation for every group.
Those diagrams overlap. Omit `z` when all observations should share one
partition; use `color` alone to paint categories without changing topology.

Supply `key` when source order can change. Exact coincident positions produce
one cell within each `z` group, with ownership chosen from a canonical ordering
of stable keys. This makes coincident ownership and cell keys deterministic
across reorderings. Distinct projected positions remain distinct even when
they are much closer than one pixel because nearby sites can still divide a
large visible region. The mark fails instead of merging sites if separate cell
boundaries cannot be represented by finite screen coordinates. Without an
explicit key, the mark tries a unique top-level or nested `id`, then falls back
to source index.

## Visible cells versus focus

Voronoi polygons are a visible encoding layer, not an interaction index. They
are hidden from accessibility navigation and add no pointer or keyboard focus
candidates. Layer `dot` or another interactive mark over the cells when the
source observations should drive nearest-point focus and tooltips. Both layers
can share x, y, color, and key channels without application-owned scale
projection or tooltip state.

If no cells should be painted and only lookup performance matters, provide a
`ChartSpatialIndexFactory` instead of adding a `voronoi` mark. See
[Tooltips and Focus](../../guides/tooltips-and-focus.md).
