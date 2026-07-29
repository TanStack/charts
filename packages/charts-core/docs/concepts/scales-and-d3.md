---
title: Scales and D3
description: Understand the explicit boundary between TanStack Charts and granular D3 scales, transforms, shapes, and interaction algorithms.
---

TanStack Charts uses D3 as an explicit algorithm layer:

- **Your application** imports and configures the D3 modules required by a chart.
- **D3** supplies battle-tested scales, array transforms, shape interpolation, time utilities, and spatial algorithms.
- **TanStack Charts** supplies the typed grammar, responsive ranges, guide layout, scene compilation, rendering, reconciliation, and lifecycle.

There is no second scale or transform language to learn. There is also no hidden D3 umbrella import.

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

## Capability map

Use the official D3 pages as the API reference for each algorithm. TanStack Charts documentation only describes how its output crosses the chart boundary.

| Need                                                               | D3 module                                                   | How it enters TanStack Charts                                                                     |
| ------------------------------------------------------------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Quantitative, temporal, categorical, log, radial, and color scales | [`d3-scale`](https://d3js.org/d3-scale)                     | Pass the configured scale to an axis, polar coordinate, `color.scale`, `rScale`, or custom mark   |
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
| Pan and zoom                                                       | [`d3-zoom`](https://d3js.org/d3-zoom)                       | Own the gesture and update chart input or a configured scale domain                               |
| Hierarchies and layouts                                            | [`d3-hierarchy`](https://d3js.org/d3-hierarchy)             | Convert layout output into ordinary rows or custom scene nodes                                    |
| Force simulation                                                   | [`d3-force`](https://d3js.org/d3-force)                     | Prepare positioned nodes and links before rendering                                               |
| Geographic projections and paths                                   | [`d3-geo`](https://d3js.org/d3-geo)                         | Pass a responsive projection factory to `geoShape`                                                |

## Positional scales are required

Every `ChartSpec` declares `x` and `y`:

```ts
import { scaleLinear, scaleUtc } from 'd3-scale'

const xScale = scaleUtc().domain([firstDate, lastDate]).nice()
const yScale = scaleLinear().domain([0, maximum]).nice()

const spec = {
  marks,
  x: { scale: xScale },
  y: { scale: yScale },
}
```

Use `null` only when no mark materializes that dimension:

```ts
import { defineChart, frame } from '@tanstack/charts'

const borderOnlyChart = defineChart({
  marks: [frame()],
  x: null,
  y: null,
})
```

A mark with x values needs an x scale. A mark with y values needs a y scale. Missing positional scales are authoring errors instead of invitations for the runtime to guess a semantic domain.

## Domains are application semantics

Set complete domains before passing scales to the chart:

```ts
import { extent, max } from 'd3-array'
import { scaleLinear, scaleUtc } from 'd3-scale'

const [firstDate, lastDate] = extent(rows, (row) => row.date)
const dateDomain: [Date, Date] =
  firstDate && lastDate
    ? [firstDate, lastDate]
    : [new Date(0), new Date(86_400_000)]
const valueMaximum = max(rows, (row) => row.value) ?? 0

const xScale = scaleUtc().domain(dateDomain).nice()
const yScale = scaleLinear().domain([0, valueMaximum]).nice()
```

The fallback is part of application semantics. A revenue chart might use `[0, 1]` for an empty state, while a normalized ratio chart might always use `[0, 1]`. TanStack Charts cannot infer which policy is truthful.

Be equally deliberate with:

- Whether zero belongs in a quantitative domain
- Whether a log scale is valid for all values
- Whether time is local or UTC
- Which categories exist when some are filtered out
- Whether multiple facets share a domain
- Whether a color domain must remain stable across sessions

## Responsive ranges belong to TanStack Charts

Do not assign pixel ranges to positional scales used by the chart:

```ts
const xScale = scaleUtc().domain(dateDomain)
const yScale = scaleLinear().domain(valueDomain)
```

For each scene, TanStack Charts:

1. Copies the configured scale.
2. Calculates the plot rectangle after guide measurement.
3. Assigns the current responsive pixel range to the copy.
4. Uses the copy for marks, ticks, grids, and interaction points.

The source scale is never mutated. This makes one module-level definition safe across container resizes, server rendering, multiple mounted hosts, and facets.

The `reverse` axis option reverses the responsive range without changing the domain:

```ts
const y = {
  scale: scaleLinear().domain([0, maximum]),
  reverse: true,
}
```

## Categorical scales and bandwidth

Pass a configured D3 band scale for categorical positions:

```ts
import { scaleBand } from 'd3-scale'

const categoryScale = scaleBand<string>()
  .domain(rows.map((row) => row.category))
  .paddingInner(0.12)
  .paddingOuter(0.06)
```

TanStack Charts applies the plot range, reads the scale bandwidth, and treats the mapped value as the center of the band for mark and interaction coordinates. Bars use the primary bandwidth by default.

For grouped bars, pass a second band scale as the mark’s `groupScale`. Its range is assigned within the primary band. Grouping is explicit because `z` alone cannot decide whether a chart should overlap, stack, dodge, or only color its rows.

## Color scales

Omitting `color.scale` uses the chart theme’s ordinal palette for categorical group values:

```ts
const chart = defineChart({
  marks: [lineY(rows, { x: 'date', y: 'value', z: 'region' })],
  x: { scale: xScale },
  y: { scale: yScale },
})
```

Use a configured D3 color scale for semantic stability or a continuous encoding:

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

## Radius scales

`dot` treats `r` as pixels unless `rScale` is supplied:

```ts
import { scaleSqrt } from 'd3-scale'

const radius = scaleSqrt().domain([0, accountMaximum]).range([3, 24])

dot(rows, {
  x: 'revenue',
  y: 'retention',
  r: 'accounts',
  rScale: radius,
})
```

TanStack Charts calls the function you supply. D3 owns the radius mapping; the chart owns dot geometry and rendering.

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

D3 transforms do not need a TanStack wrapper:

```ts
import { bin, max } from 'd3-array'

const upper = max(values) ?? 1
const histogram = bin()
  .domain([0, upper])
  .thresholds(20)(values)
  .map((items, index) => ({
    id: index,
    x1: items.x0 ?? 0,
    x2: items.x1 ?? upper,
    count: items.length,
    items,
  }))
```

Pass `histogram` to `rect`, `barY`, `lineY`, `dot`, or a custom mark according to the desired geometry. In a dynamic definition, put substantial synchronous transformation in `prepare` and define `prepareEqual` around the inputs that affect it.

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

interface Measurement {
  id: string
  input: number
  output: number
}

const rows: readonly Measurement[] = [
  { id: 'a', input: 1, output: 12 },
  { id: 'b', input: 10, output: 31 },
  { id: 'c', input: 100, output: 49 },
  { id: 'd', input: 1_000, output: 72 },
  { id: 'e', input: 10_000, output: 88 },
]

const logChart = defineChart({
  marks: [
    dot(rows, {
      x: 'input',
      y: 'output',
      key: 'id',
      r: 4,
      fill: '#2563eb',
    }),
  ],
  x: {
    scale: scaleLog().domain([1, 10_000]),
    label: 'Input',
    grid: true,
  },
  y: {
    scale: scaleLinear().domain([0, 100]),
    label: 'Output',
    grid: true,
  },
})
```

This source imports `d3-scale` directly, so install `d3-scale` and `@types/d3-scale` as direct dependencies.

<iframe
  src="https://tanstack.com/charts/catalog/embed/53-log-scale-scatter/?theme=system&height=400"
  title="Scatterplot using an explicit D3 logarithmic x scale"
  loading="lazy"
  width="100%"
  height="400"
  style="width:100%;height:400px;border:0;"
></iframe>

For chart-side scale, guide, and color types, see [Scales, Guides, and Color Reference](../reference/scales-guides-and-color.md).
