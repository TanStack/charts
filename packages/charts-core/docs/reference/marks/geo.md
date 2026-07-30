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
): ChartMark<TDatum, number, number>
```

The required projection factory receives a `GeoProjectionContext` containing
the final `chart` bounds and materialized `data`. Return a D3 `GeoProjection`,
`GeoStreamWrapper`, or `null`.

```ts
geoShape(features, {
  key: (feature) => feature.properties.id,
  projection: ({ chart, data }) =>
    geoEqualEarth().fitExtent(
      [
        [chart.x, chart.y],
        [chart.x + chart.width, chart.y + chart.height],
      ],
      { type: 'FeatureCollection', features: data },
    ),
})
```

### `GeoShapeOptions`

| Option            | Type                                   | Default                 | Meaning                                               |
| ----------------- | -------------------------------------- | ----------------------- | ----------------------------------------------------- |
| `id`              | `string`                               | Layer-derived           | Stable mark ID                                        |
| `className`       | `string`                               | None                    | Class added beside `ts-chart__geo`                    |
| `projection`      | `(GeoProjectionContext) => projection` | Required                | Builds the D3 projection from final plot bounds       |
| `key`             | `Channel<TDatum, ChartKey>`            | Unique `id`, then index | Stable feature identity                               |
| `color`           | `Channel<TDatum, ChartKey?>`           | No group                | Color-scale input and interaction group               |
| `r`               | `number \| Channel<TDatum, number?>`   | `4.5`                   | Point and MultiPoint radius in pixels                 |
| `rScale`          | `(value: number) => number`            | Identity                | Maps a quantitative value to a pixel radius           |
| `fill`            | `VisualChannel<TDatum, string>`        | Resolved color          | Feature fill                                          |
| `fillOpacity`     | `number`                               | SVG default             | Fill opacity                                          |
| `stroke`          | `VisualChannel<TDatum, string>`        | `'none'`                | Boundary stroke                                       |
| `strokeOpacity`   | `number`                               | SVG default             | Boundary opacity                                      |
| `strokeWidth`     | `number`                               | SVG default             | Boundary width                                        |
| `strokeDasharray` | `string`                               | SVG default             | Boundary dash pattern                                 |
| `opacity`         | `number`                               | SVG default             | Whole-feature opacity                                 |
| `anchor`          | `(datum, index, data) => [lon, lat]`   | `geoCentroid()`         | Semantic longitude/latitude for the interaction point |

Each drawable feature becomes one SVG path. `geoPath(projection).centroid()`
sets the point's screen position. `anchor`, or `geoCentroid()` when omitted,
sets its semantic x/y values. Nonfinite centroids do not emit an interaction
point.

For Point and MultiPoint geometry, `r` is passed to D3
`geoPath().pointRadius()` for each datum. Add `rScale` when the channel carries
a magnitude rather than a pixel radius; invalid or negative results are
omitted.

`GeoProjectionContext`, `GeoShapeOptions`, and the `geoShape` implementation
are exported from `@tanstack/charts/geo`. Keep both chart axes `null` and
normally disable guides because the mark does not materialize Cartesian scale
channels. Boundary datasets are deliberately not part of this entry point;
convert application-owned TopoJSON to GeoJSON before passing features to the
mark. See [Maps and Spatial Charts](../../examples/maps-and-spatial.md).
