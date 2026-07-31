---
title: Scales and D3
description: Understand the explicit boundary between TanStack Charts and granular D3 scales, transforms, shapes, and interaction algorithms.
---

TanStack Charts uses an explicit algorithm layer:

- **Your application** imports and configures the D3 modules required by a chart.
- **D3** supplies battle-tested scales, array transforms, shape interpolation, time utilities, and spatial algorithms.
- **TanStack compact scales** cover the common numeric and categorical scale subset when bundle size matters more than D3's complete semantics.
- **TanStack Charts** supplies the typed grammar, responsive ranges, guide layout, scene compilation, rendering, reconciliation, and lifecycle.

Both scale implementations use callable, copyable scale objects. There is no
hidden D3 umbrella import.

`@tanstack/charts` declares `d3-array`, `d3-shape`, and `d3-geo` because its
numeric-bin and stack transforms, polar and D3 curve features, and geo features
own those implementations. They are not peers and require no `use`
configuration. Bundlers tree-shake unused algorithms and geometry, and exact
feature subpaths remain available when an application wants a narrower import.

## Direct dependency ownership

If application source imports a `d3-*` module, declare that module and its matching TypeScript package directly:

```sh
pnpm add d3-array d3-scale d3-shape
pnpm add -D @types/d3-array @types/d3-scale @types/d3-shape
```

Omit any module the application does not import. A bar chart that only imports `d3-scale` should not install or bundle shape, force, geo, zoom, or hierarchy code.

This rule also applies when definitions live in framework component source.
The adapter mounts a definition; it does not own the D3 imports used to author
it.

## Compact scales

For numeric linear, band, point, and ordinal mappings, install the optional
compact package:

```sh
pnpm add @tanstack/charts-scales
```

Import one exact family:

```ts
import { scaleLinear } from '@tanstack/charts-scales/linear'
import { scaleBand } from '@tanstack/charts-scales/band'
import { scalePoint } from '@tanstack/charts-scales/point'
import { scaleOrdinal } from '@tanstack/charts-scales/ordinal'
```

There is intentionally no `@tanstack/charts-scales` root export. Each factory
fits the same callable, `domain`, `range`, and `copy` contract consumed by
TanStack Charts.

The compact linear scale is numeric and two-stop. It supports mapping,
`invert`, `clamp`, `nice`, ticks, basic numeric tick formatting, and copying.
The categorical families support D3-compatible domain interning, padding,
alignment, rounding, bandwidth, unknown values, and copying.

Use `d3-scale` for time, UTC, log, power, symlog, radial, sequential,
diverging, quantile, quantize, and threshold scales; piecewise or nonnumeric
interpolation; locale-aware format specifiers; and other full D3 behavior.

## Capability map

Use the official D3 pages as the API reference for each algorithm. TanStack Charts documentation only describes how its output crosses the chart boundary.

| Need                                                               | D3 module                                                   | How it enters TanStack Charts                                                                     |
| ------------------------------------------------------------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Quantitative, temporal, categorical, log, radial, and color scales | [`d3-scale`](https://d3js.org/d3-scale)                     | Pass a factory for an inferred domain or an instance for a fixed domain                           |
| Sequential, diverging, and categorical color schemes               | [`d3-scale-chromatic`](https://d3js.org/d3-scale-chromatic) | Pass an interpolator or scheme to a configured D3 color scale                                     |
| Extents, grouping, aggregation, bins, sorting, and statistics      | [`d3-array`](https://d3js.org/d3-array)                     | Convert source data into rows, domains, or thresholds before creating marks                       |
| Stacks, pies, arcs, curves, and shape generators                   | [`d3-shape`](https://d3js.org/d3-shape)                     | Feed pie intervals and curve factories to polar marks, or bridge a Cartesian curve with `d3Curve` |
| Calendar intervals                                                 | [`d3-time`](https://d3js.org/d3-time)                       | Build bins, ticks, rounded selections, and date windows in application code                       |
| Numeric formatting                                                 | [`d3-format`](https://d3js.org/d3-format)                   | Pass a formatter to an axis or tooltip option                                                     |
| Time formatting                                                    | [`d3-time-format`](https://d3js.org/d3-time-format)         | Pass a formatter to an axis or tooltip option                                                     |
| Quadtrees                                                          | [`d3-quadtree`](https://d3js.org/d3-quadtree)               | Implement an optional `ChartSpatialIndexFactory`                                                  |
| Delaunay and Voronoi geometry                                      | [`d3-delaunay`](https://d3js.org/d3-delaunay)               | Implement a spatial index, overlay, or custom mark                                                |
| DOM selection for optional D3 gesture controllers                  | [`d3-selection`](https://d3js.org/d3-selection)             | Attach an application-owned brush or zoom behavior to an overlay                                  |
| Brushes                                                            | [`d3-brush`](https://d3js.org/d3-brush)                     | Own the gesture in application code and map pixels through a copied chart scale                   |
| Pan and zoom                                                       | [`d3-zoom`](https://d3js.org/d3-zoom)                       | Own the gesture, update application state, and rebuild the definition with a configured domain    |
| Hierarchies and layouts                                            | [`d3-hierarchy`](https://d3js.org/d3-hierarchy)             | Convert layout output into ordinary rows or custom scene nodes                                    |
| Force simulation                                                   | [`d3-force`](https://d3js.org/d3-force)                     | Prepare positioned nodes and links before rendering                                               |
| Geographic projections and paths                                   | [`d3-geo`](https://d3js.org/d3-geo)                         | Pass a responsive projection factory to `geoShape`                                                |

## Positional scales follow materialized dimensions

Every materialized positional dimension declares its scale:

```ts
import { scaleLinear, scaleUtc } from 'd3-scale'

const spec = {
  marks,
  x: { scale: scaleUtc, nice: true },
  y: { scale: scaleLinear, nice: true },
}
```

Positionless marks omit both axes:

```ts
import { defineChart, frame } from '@tanstack/charts'

const borderOnlyChart = defineChart({
  marks: [frame()],
})
```

A mark with x values requires an x scale. A mark with y values requires a y
scale. One-dimensional marks omit only the unused axis. The scale factory
chooses the mapping; materialized mark channels supply its domain.

## Factory domains come from marks

Pass the D3 factory itself when the domain should cover the rendered data:

```ts
import { scaleLinear, scaleUtc } from 'd3-scale'

const chart = defineChart({
  marks: [lineY(rows, { x: 'date', y: 'value' })],
  x: { scale: scaleUtc, nice: true },
  y: { scale: scaleLinear, nice: true },
})
```

Continuous factories use the finite extent of their channels. Band and point
factories use distinct values in first-seen order. Bars and areas include zero
when they use an implicit zero baseline. Empty channels retain the factory's
native D3 domain.

Return a scale from a zero-argument factory when it needs configuration before
domain inference:

```ts
const x = {
  scale: () => scaleBand<string>().padding(0.16),
}
```

Use the axis `nice` option because nicening must happen after inference.

## Fixed domains remain application semantics

Pass a scale instance when the domain must not follow the rendered marks:

```ts
const normalizedY = {
  scale: scaleLinear().domain([0, 1]),
}

const windowedX = {
  scale: scaleUtc().domain([windowStart, windowEnd]),
}
```

Be equally deliberate with:

- Whether a log scale is valid for all values
- Whether time is local or UTC
- Which categories exist when some are filtered out
- Whether multiple facets share a domain
- Whether a color domain must remain stable across sessions

## Responsive ranges belong to TanStack Charts

Do not assign pixel ranges to positional scales used by the chart:

```ts
const xScale = scaleUtc
const yScale = scaleLinear
```

For each scene, TanStack Charts:

1. Creates a factory scale or copies a configured instance.
2. Calculates the plot rectangle after guide measurement.
3. Assigns the current responsive pixel range to the copy.
4. Uses the copy for marks, ticks, grids, and interaction points.

The source scale is never mutated. This makes one module-level definition safe across container resizes, server rendering, multiple mounted hosts, and facets.

The `reverse` axis option reverses the responsive range without changing the domain:

```ts
const y = {
  scale: scaleLinear,
  reverse: true,
}
```

## Categorical scales and bandwidth

Pass a D3 band-scale factory for categorical positions:

```ts
import { scaleBand } from 'd3-scale'

const categoryScale = () =>
  scaleBand<string>().paddingInner(0.12).paddingOuter(0.06)
```

TanStack Charts applies the plot range, reads the scale bandwidth, and treats the mapped value as the center of the band for mark and interaction coordinates. Bars use the primary bandwidth by default.

For grouped bars, use `layout: group({ scale })`. The supplied band scale is
copied and its range is assigned within the primary band. Grouping is explicit;
the default length-channel geometry is stacked.

## Color scales

Omitting `color.scale` uses the chart theme’s ordinal palette for categorical group values:

```ts
const chart = defineChart({
  marks: [lineY(rows, { x: 'date', y: 'value', z: 'region' })],
  x: { scale: xScale },
  y: { scale: yScale },
})
```

Use a configured D3 color scale for semantic stability:

```ts
import { scaleOrdinal } from 'd3-scale'

const regionColor = scaleOrdinal(
  ['North', 'South', 'West'],
  ['#2563eb', '#f97316', '#10b981'],
)

const chart = defineChart({
  marks: [lineY(rows, { x: 'date', y: 'value', z: 'region' })],
  x: { scale: xScale },
  y: { scale: yScale },
  color: {
    scale: regionColor,
    legend: colorLegend({ label: 'Region' }),
  },
})
```

The color scale is copied before use. Unlike positional scales, its range is semantic color output and remains the range you configured.

Use a factory when a custom color mapping should infer its domain:

```ts
const color = {
  scale: () => scaleOrdinal<string, string>().range(['#2563eb', '#f97316']),
}
```

## Radius scales

`dot` treats `r` as pixels unless `rScale` is supplied:

```ts
import { scaleSqrt } from 'd3-scale'

dot(rows, {
  x: 'revenue',
  y: 'retention',
  r: 'accounts',
  rScale: {
    scale: () => scaleSqrt().range([3, 24]),
  },
})
```

The radius factory infers `[0, maximum]` from `r`. A configured scale instance
still keeps its explicit domain. D3 owns the radius mapping; the chart owns dot
geometry and rendering.

## Curves

Straight lines and areas do not need `d3-shape`. Opt into a curve only when the design requires it:

```ts
import { curveMonotoneX } from 'd3-shape'
import { d3Curve, lineY } from '@tanstack/charts'

lineY(rows, {
  x: 'date',
  y: 'value',
  curve: d3Curve(curveMonotoneX),
})
```

`d3Curve` adapts a D3 curve factory to the small line-and-area curve contract. Importing it is explicit so a straight chart does not need the shape path.

Horizontal `areaX` marks use the separate `d3AreaXCurve` bridge from `@tanstack/charts/d3/area-x`.

## Transforms produce rows

TanStack Charts includes typed, data-first helpers for common transforms:

```ts
import { binX } from '@tanstack/charts/transform/bin'

const histogram = binX(rows, {
  value: 'value',
  thresholds: 20,
})
```

Pass the result to `rect`, `barY`, `lineY`, `dot`, or a custom mark. The
helpers use the same granular D3 kernels as the chart runtime while retaining
typed source lineage. Domain-specific D3 transforms still work directly; no
adapter or library-owned series shape is required. Keep substantial transforms
beside the definition and memoize them through application reactivity.

The same rule applies to stacks, pies, hierarchies, force layouts, and
server-prepared intervals: preserve the useful output as typed rows, then map
it through mark channels. A responsive geographic projection instead belongs
in `geoShape`'s projection factory because its pixel range depends on the final
plot bounds.

## Pixel-to-value inversion

Brush, cursor, crop, and zoom gestures are application-owned. To invert a scene coordinate:

```ts
const scene = host.getScene()
const interactiveX = sourceXScale
  .copy()
  .range([scene.chart.x, scene.chart.x + scene.chart.width])

const selectedDate = interactiveX.invert(pointerX)
```

For a normal continuous y axis, use the reversed chart range:

```ts
const interactiveY = sourceYScale
  .copy()
  .range([scene.chart.y + scene.chart.height, scene.chart.y])

const selectedValue = interactiveY.invert(pointerY)
```

Apply the application’s precision policy after inversion. For example, round a day-based selection with a D3 time interval or round a currency threshold to the supported increment. Pixels do not imply semantic precision.

When the application owns the gesture, disable the native nearest-point focus strategy if the two interactions would conflict. See [Interactions and Selections](../guides/interactions-and-selections.md).

## Log-scale example

<!-- docs-example: log-scale typecheck -->

```ts
import { scaleLinear, scaleLog } from 'd3-scale'
import { defineChart, dot } from '@tanstack/charts'

interface FlareRow {
  name: string
  size: number | null
}

const flare: readonly FlareRow[] = [
  { name: 'flare.analytics.cluster', size: 3938 },
  { name: 'flare.analytics.graph', size: 10_871 },
  { name: 'flare.analytics.optimization', size: 5731 },
  { name: 'flare.display', size: 12_867 },
  { name: 'flare.query', size: 2779 },
  { name: 'flare.unresolved', size: null },
]

type SizedFlareRow = FlareRow & { size: number }

const rows = flare
  .filter((row): row is SizedFlareRow => row.size !== null)
  .slice(0, 200)

const logChart = defineChart({
  marks: [
    dot(rows, {
      x: 'size',
      y: (row) => row.name.split('.').length - 1,
      key: 'name',
      r: 4,
      fill: '#2563eb',
    }),
  ],
  x: {
    scale: scaleLog().domain([200, 30_000]),
    grid: true,
    axis: { label: 'Class size' },
  },
  y: {
    scale: scaleLinear,
    grid: true,
    axis: { label: 'Hierarchy depth' },
  },
})
```

This source imports `d3-scale` directly, so install `d3-scale` and `@types/d3-scale` as direct dependencies.

<iframe
  src="https://tanstack.com/charts/catalog/embed/53-log-scale-scatter/?theme=system&height=480"
  title="Flare class sizes and hierarchy depth using an explicit D3 logarithmic x scale"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

For chart-side scale, guide, and color types, see [Scales, Guides, and Color Reference](../reference/scales-guides-and-color.md).
