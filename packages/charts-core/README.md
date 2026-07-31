# TanStack Charts

A chart grammar for TypeScript and JavaScript. Marks consume your data
directly, channels describe visual encodings, and the engine compiles them into
a renderer-neutral keyed scene. D3 supplies battle-tested algorithms; TanStack
supplies the grammar, scene compiler, responsive range adapter, rendering, and
lifecycle.

TanStack Charts is an independent implementation for typed application
infrastructure. Project lineage is recorded in the repository
[`ACKNOWLEDGEMENTS.md`](https://github.com/TanStack/charts/blob/main/ACKNOWLEDGEMENTS.md).

Install TanStack Charts with the granular D3 modules your chart imports as
direct application dependencies. Strict package managers do not expose
TanStack Charts' transitive dependencies for application imports:

```sh
pnpm add @tanstack/charts d3-scale d3-shape
pnpm add -D @types/d3-scale @types/d3-shape
```

Omit any D3 module and matching type package that your chart does not use.

<!-- docs-example: core-readme-definition typecheck -->

```ts
import { scaleLinear, scaleOrdinal, scaleUtc } from 'd3-scale'
import { curveMonotoneX } from 'd3-shape'
import { colorLegend, d3Curve, defineChart, lineY } from '@tanstack/charts'
import { tooltip } from '@tanstack/charts/tooltip'

interface DownloadRow {
  id: string
  date: Date
  downloads: number
  package: string
}

const data: readonly DownloadRow[] = [
  {
    id: 'query-jan',
    date: new Date('2026-01-01T00:00:00Z'),
    downloads: 1_200_000,
    package: 'Query',
  },
  {
    id: 'query-feb',
    date: new Date('2026-02-01T00:00:00Z'),
    downloads: 1_480_000,
    package: 'Query',
  },
  {
    id: 'router-jan',
    date: new Date('2026-01-01T00:00:00Z'),
    downloads: 420_000,
    package: 'Router',
  },
]

const downloads = defineChart({
  marks: [
    lineY(data, {
      x: 'date',
      y: 'downloads',
      z: 'package',
      curve: d3Curve(curveMonotoneX),
    }),
  ],
  x: { scale: scaleUtc, nice: true },
  y: {
    scale: scaleLinear,
    nice: true,
    grid: true,
    axis: { label: 'Weekly downloads' },
  },
  color: {
    scale: () =>
      scaleOrdinal<string, string>().range(['#0ea5e9', '#f97316', '#10b981']),
    legend: colorLegend({ label: 'Package' }),
  },
  animate: true,
  tooltip,
})
```

Use the vanilla host directly:

```ts
import { mountChart } from '@tanstack/charts/dom'

const options = {
  definition: downloads,
  height: 320,
  ariaLabel: 'Weekly package downloads',
}

const host = mountChart(element, options)
host.update({ ...options, height: 360 })
host.destroy()
```

Use the same host options with the opt-in Canvas surface:

```ts
import { mountCanvasChart } from '@tanstack/charts/canvas'

const host = mountCanvasChart(element, options)
```

`@tanstack/charts/renderer` exposes the renderer-neutral host, and
`@tanstack/charts/svg/renderer` exposes the default SVG surface. Canvas,
renderer-neutral, and SVG implementations remain separate bundle boundaries.

Or use a thin framework adapter:

```tsx
import { Chart } from '@tanstack/react-charts'

;<Chart
  definition={downloads}
  height={320}
  ariaLabel="Weekly package downloads"
/>
```

## Type inference

Mark data drives the public types. Field channels include only compatible datum
keys, built-in marks with unambiguous positional semantics constrain their D3
scales and axis formatters, and interaction callbacks retain the original
datum type. `ChartPoint.xValue` and `yValue` retain the inferred channel types,
including `Date`; conditional definitions expose honest unions for normal
TypeScript narrowing. Rectangles infer scale types from their interval
endpoints independently from their interaction anchors, and cells retain their
categorical point values. Facets and custom marks remain unchecked only where
their positional semantics are intentionally opaque. Definitions capture
application values directly, and their identity is the host update boundary.

Normal authoring needs no cast, mark-array annotation, or adapter generic. If
TypeScript rejects a chart, correct the data type, channel, scale, or
definition. Custom marks introduce their datum and optional positional types at
the public `createMark<Datum, X, Y>()` boundary. When a custom mark's
interaction values intentionally differ from its materialized scale values,
use `createMarkWithScaleValues` from
`@tanstack/charts/mark/scale-values`; the exceptional subpath stays out of
ordinary bundles.

## Included grammar

- Marks: `lineY`, `areaX`, `areaY`, `barX`, `barY`, `dot`, `rect`, `cell`,
  `ruleX`, `ruleY`, `text`, `arrow`, `frame`, `hexagon`, `link`, `tickX`,
  `tickY`, `vector`, and responsive `facet` composition
- Scales: D3 factories with inferred domains or configured D3 instances with
  application-owned domains, copied through responsive range adapters
- Guides: responsive axes, grids, labels, categorical legends, and gradient
  legends
- Data preparation: direct `d3-array` and `d3-shape` output, server-prepared
  intervals, and application-derived rows flow into ordinary marks
- Runtime: object and responsive definitions, definition-identity updates,
  responsive measurement, keyed
  reconciliation, interruptible animation, pointer and keyboard focus, point
  activation, native tooltips, SSR, and hydration
- Renderers: static SVG, a vanilla DOM host, optional Canvas, and custom
  renderer hosts
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
import { scaleBand, scaleLinear } from 'd3-scale'
import { barX, defineChart } from '@tanstack/charts'

const rankingRows = [
  { package: 'Query', downloads: 1_480_000 },
  { package: 'Router', downloads: 420_000 },
  { package: 'Table', downloads: 360_000 },
]

const chart = defineChart({
  marks: [barX(rankingRows, { x: 'downloads', y: 'package' })],
  x: {
    scale: scaleLinear,
    nice: true,
    axis: { label: 'Weekly downloads' },
  },
  y: {
    scale: () => scaleBand<string>().padding(0.1),
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

Static scenes use deterministic text estimates. The DOM host and browser
framework adapters measure the painted glyph bounds with the inherited
container font and relayout after web fonts load. Advanced renderers can
supply `measureText` on the host, adapter, runtime, or `createChartScene`
layout options. Its returned `x` and `y` are the painted box offsets relative
to the requested anchor and baseline.

Definitions accept D3 factories for inferred domains and configured instances
for application-owned domains. `createChartScene` rejects missing positional
scales. TanStack copies each scale, applies the responsive pixel range, and
centers D3 band output without mutating the source. Named D3 imports keep each
capability tree-shakeable:

```ts
import { createChartScene, defineChart, lineY } from '@tanstack/charts'
import { scaleLinear } from 'd3-scale'

const values = [32, 48, 41, 57]
const definition = defineChart({
  marks: [lineY(values)],
  x: { scale: scaleLinear().domain([0, values.length - 1]) },
  y: { scale: scaleLinear().domain([0, 100]) },
})

const scene = createChartScene(definition, { width: 640, height: 320 })
```

## Documentation for humans and agents

Start with [`llms.txt`](./llms.txt), [Overview](./docs/overview.md), or the
[Quick Start](./docs/quick-start.md). The installed package includes the same
canonical documentation published on the TanStack website:

- [Compare Libraries](./docs/comparison.md)
- [Grammar of Graphics](./docs/concepts/grammar-of-graphics.md)
- [Scales and D3](./docs/concepts/scales-and-d3.md)
- [Guides](./docs/guides/choosing-a-chart.md)
- [Example Gallery](./docs/examples/index.md)
- [API Reference](./docs/reference/index.md)
- [AI Authoring](./docs/guides/ai-authoring.md)

## Lineage and license

See the repository
[`ACKNOWLEDGEMENTS.md`](https://github.com/TanStack/charts/blob/main/ACKNOWLEDGEMENTS.md)
for the full credit. TanStack Charts is licensed under [MIT](./LICENSE).
