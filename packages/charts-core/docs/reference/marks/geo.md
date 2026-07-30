---
title: Geo Shape Mark
description: Reference for projecting GeoJSON with an opt-in D3-backed geoShape mark.
---

`geoShape` renders GeoJSON through a projection created for the final
responsive plot bounds. It is available only from the geographic capability
subpath:

```ts
import { geoShape } from '@tanstack/charts/geo'
```

The subpath owns `d3-geo` path generation and centroid calculation. The
application still chooses and configures the D3 projection.

## `geoShape`

```ts
function geoShape<TDatum extends GeoPermissibleObjects>(
  source: Iterable<TDatum>,
  options: GeoShapeOptions<TDatum>,
): ChartMark<TDatum, number, number, never, never>
```

`projection` accepts either a descriptor or the original callback. A descriptor
creates a fittable D3 projection and explicitly fits the mark data, a sphere,
or supplied geometry to the final bounds:

```ts
geoShape(features, {
  projection: {
    type: geoEqualEarth,
    fit: 'data',
    inset: 8,
  },
  color: (feature) => feature.properties.value,
})
```

Use `fit: 'sphere'` when the full world frame must remain stable, or pass a
specific `GeoPermissibleObjects` value when several geo layers must share one
fit. A callback receives `GeoProjectionContext` with the final `chart` bounds
and materialized `data`; return a `GeoProjection`, `GeoStreamWrapper`, or
`null`.

### `GeoShapeOptions`

| Option            | Type                                  | Default                 | Meaning                                               |
| ----------------- | ------------------------------------- | ----------------------- | ----------------------------------------------------- |
| `id`              | `string`                              | Layer-derived           | Stable mark ID                                        |
| `className`       | `string`                              | None                    | Class added beside `ts-chart__geo`                    |
| `projection`      | `GeoProjectionDescriptor \| callback` | Required                | Creates/fits or directly returns a D3 projection      |
| `key`             | `Channel<TDatum, ChartKey>`           | Top/nested `id`, index  | Stable feature identity                               |
| `color`           | `Channel<TDatum, ChartKey?>`          | No value                | Input to the chart color scale                        |
| `r`               | `number \| Channel<TDatum, number?>`  | `4.5`                   | Point and MultiPoint radius in pixels                 |
| `rScale`          | `(value: number) => number`           | Identity                | Maps a quantitative value to a pixel radius           |
| `fill`            | `VisualChannel<TDatum, string>`       | Color for closed shapes | Final fill paint override                             |
| `fillOpacity`     | `number`                              | SVG default             | Fill opacity                                          |
| `stroke`          | `VisualChannel<TDatum, string>`       | Color for linework      | Final stroke paint override                           |
| `strokeOpacity`   | `number`                              | SVG default             | Boundary opacity                                      |
| `strokeWidth`     | `number`                              | SVG default             | Boundary width                                        |
| `strokeDasharray` | `string`                              | SVG default             | Boundary dash pattern                                 |
| `opacity`         | `number`                              | SVG default             | Whole-feature opacity                                 |
| `anchor`          | `(datum, index, data) => [lon, lat]`  | `geoCentroid()`         | Semantic longitude/latitude for the interaction point |

Semantic `color` becomes fill for closed geometry, stroke for linework, and
both for a mixed collection. Explicit `fill` or `stroke` channels override that
mapped paint.

Each drawable feature becomes one SVG path. `geoPath(projection).centroid()`
sets the point's screen position. `anchor`, or `geoCentroid()` when omitted,
sets its semantic x/y values. Nonfinite centroids do not emit an interaction
point.

For Point and MultiPoint geometry, `r` is passed to D3
`geoPath().pointRadius()` for each datum. Add `rScale` when the channel carries
a magnitude rather than a pixel radius; invalid or negative results are
omitted.

`GeoProjectionContext`, `GeoProjectionDescriptor`, `GeoProjectionInput`,
`GeoShapeOptions`, and the `geoShape` implementation are exported from
`@tanstack/charts/geo`. Omit both chart axes; the mark does not materialize
Cartesian scale channels. Boundary datasets are deliberately not part of this
entry point; convert application-owned TopoJSON to GeoJSON before passing
features to the mark. See
[Maps and Spatial Charts](../../examples/maps-and-spatial.md).
