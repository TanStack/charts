---
title: Density Contour Mark
description: Reference for responsive point-density contours, thresholds, grouping, weights, source lineage, and structured multipolygon output.
---

`densityContour` estimates a two-dimensional density field after the chart
resolves its positional scales and inner bounds. Import it from the optional
spatial subpath; it is not included in the root or universal barrel.

```ts
import { densityContour } from '@tanstack/charts/spatial/density'

const mark = densityContour(penguins, {
  x: 'billLength',
  y: 'billDepth',
  bandwidth: 18,
  thresholds: [0.0004, 0.0008, 0.0012, 0.0016, 0.002, 0.0024],
  fill: '#2563eb',
  fillOpacity: 0.16,
  stroke: '#1e3a8a',
})
```

```ts
function densityContour<TDatum>(
  source: Iterable<TDatum>,
  options: DensityContourOptions<TDatum>,
): ChartMark<never, never, never, InferredX, InferredY>
```

The mark contributes x/y and derived color domains but intentionally emits no
`ChartPoint` interaction candidates.

## Options

| Option                                            | Type                                         | Default          | Meaning                                                         |
| ------------------------------------------------- | -------------------------------------------- | ---------------- | --------------------------------------------------------------- |
| `x`                                               | `Channel<TDatum, ChartValue?>`               | Required         | Source horizontal observation                                   |
| `y`                                               | `Channel<TDatum, ChartValue?>`               | Required         | Source vertical observation                                     |
| `z`                                               | `Channel<TDatum, ChartKey?>`                 | `null` group     | Independent density-estimator group                             |
| `weight`                                          | `Channel<TDatum, number?>`                   | `1`              | Observation weight                                              |
| `bandwidth`                                       | `number`                                     | `20`             | Gaussian-kernel bandwidth in final CSS pixels                   |
| `cellSize`                                        | `number`                                     | `4`              | Density-grid cell size in final CSS pixels                      |
| `thresholds`                                      | `number \| Iterable<number>`                 | `20`             | Approximate shared level count or exact density levels          |
| `color`                                           | `Channel<DensityContourDatum, ChartKey?>`    | `group`          | Derived value sent to the color scale; never an estimator group |
| `fill`                                            | `VisualChannel<DensityContourDatum, string>` | Resolved color   | Contour fill                                                    |
| `stroke`                                          | `VisualChannel<DensityContourDatum, string>` | None             | Contour stroke                                                  |
| `fillOpacity`, `strokeOpacity`, and `strokeWidth` | `number`                                     | Renderer default | Contour presentation                                            |
| `strokeDasharray`                                 | `string`                                     | None             | Contour stroke dash pattern                                     |
| `opacity`                                         | `number`                                     | Renderer default | Whole-contour opacity                                           |
| `id`                                              | `string`                                     | Layer-derived    | Stable mark ID                                                  |
| `motion`                                          | `ChartMarkMotionOptions<never>['motion']`    | None             | Contour enter, update, and exit motion                          |

`bandwidth` must be nonnegative and finite. `cellSize` must be at least one;
the D3 estimator rounds it down to a supported power of two. A numeric
threshold count must be a positive integer. Exact thresholds use weighted
observations per CSS pixel squared, the native unit of `d3-contour`.

## Resolved estimation

Complete x/y pairs establish the positional domains. The mark maps them
through the final scales, estimates inside the final plot rectangle, and clips
the output there. Resizing or changing margins can change the contours even
when the semantic domains are fixed. Scale inversion is not required.

An explicit `z` runs one estimator per group. Numeric threshold counts resolve
to one shared set of levels using the maximum across every group, so levels
remain comparable. `color` affects presentation only and never partitions the
estimator.

Missing or unmappable x/y pairs and zero or nonfinite weights contribute
nothing. Finite signed weights are passed to the estimator. Every rendered
`DensityContourDatum<TDatum>` contains:

- `density`, the native threshold value;
- `group`, the explicit `z` value or `null`;
- `source`, the contributing input rows for that estimator group; and
- `sourceIndexes`, their original input indexes.

Presentation accessors receive this derived datum and the complete rendered
contour array.

## Geometry and interaction

Each level is one structured scene area containing all disconnected polygons
and holes. SVG, Canvas, React Native SVG, hit geometry, gradients, and clipping
consume the same rings; the mark does not author SVG path strings or depend on
`d3-geo`.

A contour can have several disconnected regions, and an aggregate centroid
can fall outside all of them. The mark therefore does not manufacture a
centroid focus target or tooltip datum. Layer an interactive source mark when
individual observations should own focus and tooltips.
