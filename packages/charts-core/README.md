# TanStack Charts

Tiny chart grammar for TypeScript and JavaScript. Marks consume your data
directly, channels describe visual encodings, and the engine compiles them into
a renderer-neutral keyed scene. D3 supplies battle-tested algorithms; TanStack
supplies the grammar, scene compiler, responsive range adapter, rendering, and
lifecycle.

```ts
import { extent, max } from 'd3-array'
import { scaleLinear, scaleOrdinal, scaleUtc } from 'd3-scale'
import { curveMonotoneX } from 'd3-shape'
import { colorLegend, d3Curve, defineChart, lineY } from '@tanstack/charts'

const [firstDate, lastDate] = extent(data, (row) => row.date)
const dateDomain: [Date, Date] =
  firstDate && lastDate
    ? [firstDate, lastDate]
    : [new Date(0), new Date(86_400_000)]
const downloadMax = max(data, (row) => row.downloads) ?? 0
const packages = [...new Set(data.map((row) => row.package))]

const downloads = defineChart({
  marks: [
    lineY(data, {
      x: 'date',
      y: 'downloads',
      z: 'package',
      key: 'id',
      curve: d3Curve(curveMonotoneX),
    }),
  ],
  x: { scale: scaleUtc().domain(dateDomain).nice() },
  y: {
    scale: scaleLinear().domain([0, downloadMax]).nice(),
    label: 'Weekly downloads',
    grid: true,
  },
  color: {
    scale: scaleOrdinal(packages, ['#0ea5e9', '#f97316', '#10b981']),
    legend: colorLegend({ label: 'Package' }),
  },
})
```

Use the vanilla host directly:

```ts
import { mountChart } from '@tanstack/charts/dom'

const host = mountChart(element, {
  definition: downloads,
  height: 320,
  ariaLabel: 'Weekly package downloads',
  tooltip: true,
  animate: true,
})

host.update({/* the same options with new input */})
host.destroy()
```

Or use a thin framework adapter:

```tsx
import { Chart } from '@tanstack/react-charts'

;<Chart
  definition={downloads}
  height={320}
  ariaLabel="Weekly package downloads"
  tooltip
/>
```

## Type inference

Mark data drives the public types. Field channels include only compatible datum
keys, built-in positional channels constrain their D3 scales and axis
formatters, and interaction callbacks retain the original datum type. A
dynamic `defineChart<Input>()` also makes `input` required with that exact shape
in the vanilla, React, and Octane hosts.

Normal authoring needs no cast, mark-array annotation, or adapter generic. If
TypeScript rejects a chart, correct the data type, channel, scale, or
definition. Custom marks introduce their datum and optional positional types at
the public `createMark<Datum, X, Y>()` boundary.

## Included grammar

- Marks: `lineY`, `areaX`, `areaY`, `barX`, `barY`, `dot`, `rect`, `cell`, `ruleX`,
  `ruleY`, `text`, and responsive `facet` composition
- Scales: required raw D3 positional scales through the responsive range
  adapter; raw D3 color and radius scales are consumed directly
- Guides: responsive axes, grids, labels, categorical legends, and gradient
  legends
- Data preparation: direct `d3-array` and `d3-shape` output, server-prepared
  intervals, and application-derived rows flow into ordinary marks
- Runtime: stable dynamic definitions, separate preparation caching,
  responsive measurement, keyed reconciliation, interruptible animation,
  pointer and keyboard focus, point activation, native tooltips, SSR, and
  hydration
- Renderers: static SVG and a vanilla DOM host
- Optional export: standalone SVG and browser raster export from
  `@tanstack/charts/export`
- Optional dense interaction: an application-supplied
  `ChartSpatialIndexFactory` backed by D3 quadtree, Delaunay, or another index
- Optional grouped pointer focus from `@tanstack/charts/focus`
- Optional native-focus suppression for application-owned gestures from
  `@tanstack/charts/focus/disabled`
- Optional gradients and clipping from `@tanstack/charts/svg/resources`

Every built-in mark, renderer, and chart-owned optional capability has a
subpath export. D3 algorithms stay visibly imported from their granular
`d3-*` packages. Importing `@tanstack/charts/line` cannot pull in bars, DOM
interaction, React, or export. Set `guides: false` and `margin: 0` for
sparklines.

## Automatic guide margins

Omit `margin` for the normal responsive path. Each scene solves the minimum
space needed for formatted ticks, rotated bounds, first and last tick
overhang, and axis titles. The solve may resolve guide scales more than once,
but marks render once against the final plot rectangle.

```ts
const chart = defineChart({
  marks: [barX(rows, { x: 'downloads', y: 'package' })],
  x: {
    scale: scaleLinear().domain([0, maximum]).nice(),
    label: 'Weekly downloads',
  },
  y: {
    scale: scaleBand()
      .domain(rows.map((row) => row.package))
      .padding(0.1),
  },
})
```

- Omitted sides are automatic.
- `margin: { left: 80 }` locks only the left side.
- `margin: 0` locks every side to zero.
- `scene.margin` and `scene.chart` expose the resolved geometry for aligned
  application UI.
- Tick collision policy is separate. Set `ticks` or `tickRotate` when labels
  should be thinned or rotated; margins guarantee containment, not legibility
  between overlapping labels.

Static scenes use deterministic text estimates. The DOM host, React, and
Octane measure the painted glyph bounds with the inherited container font and
relayout after web fonts load. Advanced renderers can supply `measureText` on
the host, adapter, runtime, or `createChartScene` layout options. Its returned
`x` and `y` are the painted box offsets relative to the requested anchor and
baseline.

Definitions accept configured D3 scales directly, and `createChartScene`
rejects missing positional scales. TanStack copies each caller scale, applies
the responsive pixel range, and centers D3 band output. The supplied scale owns
its domain, mapping, ticks, and formatting and is never mutated. Named D3
imports keep each capability tree-shakeable:

```ts
import { createChartScene } from '@tanstack/charts'
import { scaleLinear } from 'd3-scale'

const definition = defineChart({
  marks: [lineY(values)],
  x: { scale: scaleLinear().domain([0, values.length - 1]) },
  y: { scale: scaleLinear().domain([0, 100]) },
})

const scene = createChartScene(definition, size)
```

## Documentation for humans and agents

Start with [`llms.txt`](./llms.txt) or
[`docs/AI-GUIDE.md`](./docs/AI-GUIDE.md). The documentation is organized by
task rather than as a duplicate API catalog:

- [`docs/recipes.md`](./docs/recipes.md)
- [`docs/dynamic-charts.md`](./docs/dynamic-charts.md)
- [`docs/responsive-theme-accessibility.md`](./docs/responsive-theme-accessibility.md)
- [`docs/custom-marks.md`](./docs/custom-marks.md)
- [`docs/bundle-and-performance.md`](./docs/bundle-and-performance.md)
- [`docs/observable-plot-migration.md`](./docs/observable-plot-migration.md)
- [`docs/tanstack-stats-migration.md`](./docs/tanstack-stats-migration.md)

Observable Plot is the conceptual reference for marks, channels, and layered
composition. TanStack Charts is not API-compatible with every Observable Plot
feature. The migration guide identifies the supported grammar subset and links
to the relevant Observable documentation when its concepts are useful.
