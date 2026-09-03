---
title: Contour Mark
description: Reference for regular scalar-grid contours, thresholds, orientation, source lineage, and structured multipolygon output.
---

`contour` generates level sets from a regular scalar grid. Import it from the
optional spatial subpath; it is not included in the root or universal barrel.

```ts
import { contour } from '@tanstack/charts/spatial/contour'

const mark = contour(wind, {
  width: 64,
  height: 60,
  value: (row) => Math.hypot(row.u, row.v),
  thresholds: [2, 4, 6, 8, 10],
  stroke: '#fff',
  strokeWidth: 0.75,
})
```

```ts
function contour<TDatum>(
  source: Iterable<TDatum>,
  options: ContourOptions<TDatum>,
): ChartMark<never, never, never>
```

The mark contributes derived color values but no positional domains or
`ChartPoint` interaction candidates.

## Options

| Option                                            | Type                                          | Default          | Meaning                                        |
| ------------------------------------------------- | --------------------------------------------- | ---------------- | ---------------------------------------------- |
| `width`                                           | `number`                                      | Required         | Number of columns in the row-major grid        |
| `height`                                          | `number`                                      | Required         | Number of rows in the row-major grid           |
| `value`                                           | `Channel<TDatum, number?>`                    | Numeric identity | Scalar grid value                              |
| `thresholds`                                      | `number \| Iterable<number>`                  | Sturges          | Approximate level count or exact scalar levels |
| `smooth`                                          | `boolean`                                     | `true`           | Interpolate marching-squares crossings         |
| `color`                                           | `Channel<ContourDatum<TDatum>, ChartKey?>`    | Level value      | Derived value sent to the color scale          |
| `fill`                                            | `VisualChannel<ContourDatum<TDatum>, string>` | Resolved color   | Contour fill                                   |
| `stroke`                                          | `VisualChannel<ContourDatum<TDatum>, string>` | None             | Contour stroke                                 |
| `fillOpacity`, `strokeOpacity`, and `strokeWidth` | `number`                                      | Renderer default | Contour presentation                           |
| `strokeDasharray`                                 | `string`                                      | None             | Contour stroke dash pattern                    |
| `opacity`                                         | `number`                                      | Renderer default | Whole-contour opacity                          |
| `id`                                              | `string`                                      | Layer-derived    | Stable mark ID                                 |
| `motion`                                          | `ChartMarkMotionOptions<never>['motion']`     | None             | Contour enter, update, and exit motion         |

`width` and `height` must be positive integers, and the source length must be
exactly `width * height`. A numeric threshold count must be a positive integer.
Exact thresholds are copied and sorted without mutating the input iterable.

## Grid and lifecycle

Source values use row-major order. The first `width` values form Cartesian row
zero at the bottom of the plot; subsequent rows move upward. Null and nonfinite
values remain missing cells in their original grid positions instead of
shifting later samples.

Marching-squares topology depends only on the source grid, thresholds, and
`smooth`, so the mark generates it eagerly when the definition is built.
Ordinary rendering maps the resulting grid coordinates linearly into the final
plot rectangle and clips them there. Resizing changes that projection without
re-estimating topology or requiring positional scales.

Every rendered `ContourDatum<TDatum>` contains:

- `value`, the scalar threshold;
- `source`, the finite source rows; and
- `sourceIndexes`, their original input indexes.

Presentation accessors receive this derived datum and the complete rendered
contour array.

## Geometry and interaction

Each level is one structured scene area containing all disconnected polygons
and holes. SVG, Canvas, React Native SVG, hit geometry, gradients, and clipping
consume the same rings; the mark does not author SVG path strings or depend on
`d3-geo`.

A level can contain several disconnected regions, and an aggregate centroid
can fall outside all of them. The mark therefore does not manufacture a focus
target or tooltip datum. Layer an interactive source mark only when the grid
samples themselves should own focus and tooltips.
