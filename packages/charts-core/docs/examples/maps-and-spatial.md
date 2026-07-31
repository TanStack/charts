---
title: Maps and Spatial Charts
description: Build choropleths, bubble maps, globes, routes, and vector fields for geographic or projected spatial questions.
---

Spatial charts encode values in a coordinate system whose geometry already has
meaning. A geographic map uses a projection and feature boundaries. A vector
field uses position, direction, and magnitude. Neither should be treated as an
ordinary categorical chart with decorative shapes.

## Choose the spatial encoding

| Reader question                                           | Start with                              |
| --------------------------------------------------------- | --------------------------------------- |
| How does an aggregate differ across named regions?        | Choropleth                              |
| Where did individual events occur?                        | Projected point layer                   |
| How do direction and magnitude vary over a sampled plane? | Vector field                            |
| How does a path move through space?                       | Projected line with directional context |
| Must small regions be compared precisely by value?        | Sorted bars or a table beside the map   |

The application chooses the projection and spatial sampling policy. The
opt-in `@tanstack/charts/geo` entry uses `d3-geo` to turn GeoJSON into shared
scene paths and interaction points. See
[Scales and D3](../concepts/scales-and-d3.md).

## Compare regional aggregates

A choropleth joins one value to each named geographic feature and maps that
value through a color scale.

<iframe
  src="https://tanstack.com/charts/catalog/embed/102-world-choropleth/?theme=system&height=480"
  title="World learning-poverty choropleth over Natural Earth land"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

<iframe
  src="https://tanstack.com/charts/catalog/embed/108-country-choropleth/?theme=system&height=480"
  title="World population-density choropleth for 95 matched countries"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

<iframe
  src="https://tanstack.com/charts/catalog/embed/109-us-state-choropleth/?theme=system&height=480"
  title="Albers USA choropleth of 3,141 county unemployment rates"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

The join is part of data preparation. Match features through stable IDs, report
unmatched records, and distinguish missing values from zero. Keep the color
domain and legend explicit so one filtered region cannot silently rescale the
meaning of every other fill.

Area draws attention. A large region can appear important even when its value
is ordinary. Pair the map with a sorted table or bars when precise ranking is
part of the task.

[Legends and Color](../guides/legends-and-color.md) covers sequential,
diverging, and threshold choices.

## Prepare atlas boundaries

TanStack accepts GeoJSON and does not bundle a political boundary dataset.
Convert an application-owned TopoJSON atlas once, validate its feature count
and IDs, then keep that geometry stable while values change.

<!-- docs-example: geo-atlas-ingest typecheck -->

```ts
import { feature } from 'topojson-client'
import worldAtlas from 'world-atlas/countries-110m.json'
import type {
  GeometryCollection,
  Objects,
  Topology,
} from 'topojson-specification'

interface AtlasProperties {
  name: string
}

type WorldObjects = Objects<AtlasProperties> & {
  countries: GeometryCollection<AtlasProperties>
}

const topology = worldAtlas as unknown as Topology<WorldObjects>
const countries = feature<AtlasProperties>(topology, topology.objects.countries)
```

`world-atlas` redistributes Natural Earth boundaries; `us-atlas` provides
Census-derived state geometry. `topojson-client.feature` performs the standard
conversion to GeoJSON consumed by `geoShape`. These remain application
dependencies, so neither their data nor the converter enters ordinary
Cartesian or geo-only consumer bundles.

## Project GeoJSON responsively

Give `geoShape` a projection factory and an explicit fit target. This
self-contained example uses a small planar floor plan. The mark fits the
projection to the final plot bounds again whenever the chart resizes.

<!-- docs-example: geo-shape-responsive typecheck -->

```ts
import { defineChart } from '@tanstack/charts'
import { geoShape } from '@tanstack/charts/geo'
import { geoIdentity } from 'd3-geo'

interface FloorPlanFeature {
  type: 'Feature'
  properties: { id: number }
  geometry: {
    type: 'Polygon'
    coordinates: [number, number][][]
  }
}

interface FloorPlan {
  type: 'FeatureCollection'
  features: FloorPlanFeature[]
}

const westportHouse: FloorPlan = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { id: 1 },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [48, 0],
            [48, 28],
            [0, 28],
            [0, 0],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { id: 2 },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [52, 0],
            [84, 0],
            [84, 28],
            [52, 28],
            [52, 0],
          ],
        ],
      },
    },
  ],
}

const map = defineChart({
  marks: [
    geoShape(westportHouse.features, {
      key: (feature) => feature.properties.id,
      projection: {
        type: geoIdentity,
        fit: westportHouse,
      },
      fill: 'none',
      stroke: '#2563eb',
      strokeWidth: 1,
    }),
  ],
})
```

`geoShape` uses `geoPath` for each feature and D3 centroids for focus. The
floor plan's source `properties.id` supplies stable identity. Supply `anchor`
only when a geographic feature needs a different semantic longitude/latitude
than its spherical centroid. The complete option contract is in
[Geo Shape Mark](../reference/marks/geo.md).

<iframe
  src="https://tanstack.com/charts/catalog/embed/40-geojson-map/?theme=system&height=480"
  title="Westport House floor plan from 121 published GeoJSON polygons"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

## Project points by magnitude

Point and MultiPoint features use D3 `geoPath().pointRadius()`. The `r`
channel can carry pixels directly; `rScale` maps a quantitative value first.

<iframe
  src="https://tanstack.com/charts/catalog/embed/103-bubble-map/?theme=system&height=480"
  title="World population bubbles for 95 atlas-matched countries"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

## Change the projection

The same GeoJSON can use any D3 projection factory. Sphere and graticule
geometry are ordinary `geoShape` layers.

<iframe
  src="https://tanstack.com/charts/catalog/embed/104-orthographic-globe/?theme=system&height=480"
  title="Orthographic globe with sphere and graticule layers"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

<iframe
  src="https://tanstack.com/charts/catalog/embed/110-projection-gallery/?theme=system&height=520"
  title="Two-by-two gallery comparing four standard world projections"
  loading="lazy"
  width="100%"
  height="520"
  style="width:100%;height:520px;border:0;"
></iframe>

## Layer routes over geography

Polygon, LineString, and Point features can share one responsive projection.

<iframe
  src="https://tanstack.com/charts/catalog/embed/105-route-map/?theme=system&height=480"
  title="Recorded HMS Beagle voyage projected over 50m world land"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

## Show direction and magnitude

A vector field places an arrow at each sampled position. Direction uses angle;
magnitude can use length, color, or both.

<iframe
  src="https://tanstack.com/charts/catalog/embed/42-vector-field/?theme=system&height=480"
  title="Surface-wind vectors derived from longitude, latitude, u, and v"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

Choose a sampling density that remains legible at the smallest container. More
arrows can obscure the flow instead of adding evidence. When pixel length
encodes magnitude, define a bounded scale and disclose whether vectors were
normalized.

Vector channel and anchor options are listed in
[Rules, Links, Arrows, Vectors, and Ticks](../reference/marks/rules-links-arrows-vectors-and-ticks.md).

## Projection and responsive layout

A projection turns geographic coordinates into planar geometry. Fit it to the
resolved plot bounds, not the viewport, and recompute when the chart container
changes. Preserve source longitude and latitude alongside projected
coordinates for tooltips and selection.

When a custom spatial shape must render beside `geoShape`:

- Keep path generation deterministic and DOM-free.
- Emit stable scene keys for each feature.
- Clip only when geometry should not extend beyond the plot.
- Emit interaction points or application overlays only where they carry honest
  semantic anchors.
- Keep projection and geo dependencies behind the spatial chart import.

See [Custom Marks and Renderers](../guides/custom-marks-and-renderers.md) and
[Responsive Charts](../guides/responsive-charts.md).

## Color, boundaries, and missing data

- Use a sequential scale for ordered magnitude with one direction.
- Use a diverging scale only around a meaningful center.
- Use threshold colors when bins have defined policy meaning.
- Keep boundary strokes visible in light and dark themes without overpowering
  fill.
- Give missing, suppressed, and out-of-domain features distinct treatment.
- Avoid a categorical palette for high-cardinality numeric values.

A legend is required whenever fill or vector color carries quantitative
meaning.

## Accessibility and interaction

A map should not be the only route to critical regional values. Provide a table
or list with the same feature names, values, units, and current selection.

For interactive maps:

- Focus and selection should resolve stable feature IDs.
- Zoom and pan state belongs to the application.
- Reset, keyboard, and touch paths should reach equivalent extents.
- Wheel capture should not trap page scrolling unexpectedly.
- Tooltips should name the region or sample, value, and unit.

[Interactions and Selections](../guides/interactions-and-selections.md) defines
the controlled gesture loop.

## Production checks

- Validate feature joins and report unmatched IDs.
- State projection, aggregation unit, date range, and denominator.
- Keep color domains comparable across views and revisions.
- Test antimeridian, empty, missing, and extremely small features where
  applicable.
- Bound projected point and vector counts.
- Verify labels and legends at narrow widths.
- Provide a non-spatial exact-value path through
  [Accessibility](../guides/accessibility.md).
