# TanStack Charts

A chart grammar for TypeScript and JavaScript. Marks consume your data
directly, channels describe visual encodings, and the engine compiles them into
a renderer-neutral keyed scene. TanStack's compact scales cover common numeric
and categorical mappings. Granular D3 modules remain available for temporal,
nonlinear, piecewise, spatial, and other specialized algorithms.

TanStack Charts is an independent implementation for typed application
infrastructure. Project lineage is recorded in the repository
[`ACKNOWLEDGEMENTS.md`](https://github.com/TanStack/charts/blob/main/ACKNOWLEDGEMENTS.md).

Install the grammar and compact scales for the common path:

```sh
pnpm add @tanstack/charts @tanstack/charts-scales
```

The scale package has no root export. Import only the required `/linear`,
`/band`, `/point`, or `/ordinal` entry.

<!-- docs-example: core-readme-definition typecheck -->

```ts
import { colorLegend, defineChart, lineY } from '@tanstack/charts'
import { scaleLinear } from '@tanstack/charts-scales/linear'
import { scaleOrdinal } from '@tanstack/charts-scales/ordinal'
import { scalePoint } from '@tanstack/charts-scales/point'
import { tooltip } from '@tanstack/charts/tooltip'

interface DownloadRow {
  id: string
  month: string
  downloads: number
  package: string
}

const data: readonly DownloadRow[] = [
  {
    id: 'query-jan',
    month: 'Jan',
    downloads: 1_200_000,
    package: 'Query',
  },
  {
    id: 'query-feb',
    month: 'Feb',
    downloads: 1_480_000,
    package: 'Query',
  },
  {
    id: 'router-jan',
    month: 'Jan',
    downloads: 420_000,
    package: 'Router',
  },
  {
    id: 'router-feb',
    month: 'Feb',
    downloads: 510_000,
    package: 'Router',
  },
]

const downloads = defineChart({
  marks: [
    lineY(data, {
      x: 'month',
      y: 'downloads',
      z: 'package',
    }),
  ],
  x: { scale: () => scalePoint<string>().padding(0.4) },
  y: {
    scale: scaleLinear,
    nice: true,
    grid: true,
    axis: { label: 'Monthly downloads' },
  },
  color: {
    scale: () =>
      scaleOrdinal<string, string>().range(['#0ea5e9', '#f97316', '#10b981']),
    legend: colorLegend({ label: 'Package' }),
  },
  svgAnimation: true,
  tooltip,
})
```

Factories ask Charts to infer domains from materialized mark channels. Pass a
configured compact instance when a semantic domain must remain fixed. Charts
copies either form and owns its responsive positional range.

## Add D3 for advanced scale semantics

Upgrade one scale at a time. A continuous calendar axis needs D3, while its
numeric axis can stay compact:

```sh
pnpm add d3-scale
pnpm add -D @types/d3-scale
```

```ts
import { defineChart, lineY } from '@tanstack/charts'
import { scaleLinear } from '@tanstack/charts-scales/linear'
import { scaleUtc } from 'd3-scale'

const history = [
  { date: new Date('2026-01-01T00:00:00Z'), downloads: 1_200_000 },
  { date: new Date('2026-02-01T00:00:00Z'), downloads: 1_480_000 },
]

const historicalDownloads = defineChart({
  marks: [lineY(history, { x: 'date', y: 'downloads' })],
  x: { scale: scaleUtc, nice: true },
  y: { scale: scaleLinear, nice: true },
})
```

Use D3 for time and UTC, log, power, symlog, radial, sequential, diverging,
quantile, quantize, threshold, piecewise, or nonnumeric interpolation. Declare
only the granular D3 modules and matching type packages imported by application
source.

Use the vanilla host directly:

```ts
import { mountChart } from '@tanstack/charts/dom'

const options = {
  definition: downloads,
  height: 320,
  ariaLabel: 'Monthly package downloads',
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
  ariaLabel="Monthly package downloads"
/>
```

## Type inference

Mark data drives the public types. Field channels include only compatible datum
keys, built-in marks with unambiguous positional semantics constrain their
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
- Scales: compact factories with inferred domains or configured instances with
  application-owned domains, plus direct D3 scales for advanced semantics
- Guides: responsive axes, grids, labels, categorical legends, and gradient
  legends
- Data preparation: TanStack transforms, direct granular D3 output,
  server-prepared intervals, and application-derived rows flow into ordinary
  marks
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
subpath export. Compact scale families and D3 algorithms stay visibly imported
from exact package entries. Importing `@tanstack/charts/line` cannot pull in bars, DOM
interaction, React, or export. Set `guides: false` and `margin: 0` for
sparklines.

## Automatic guide margins

Omit `margin` for the normal responsive path. Each scene solves the minimum
space needed for formatted ticks, rotated bounds, first and last tick
overhang, and axis titles. The solve may resolve guide scales more than once,
but marks render once against the final plot rectangle.

```ts
import { barX, defineChart } from '@tanstack/charts'
import { scaleBand } from '@tanstack/charts-scales/band'
import { scaleLinear } from '@tanstack/charts-scales/linear'

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
layout options. The synchronous callback receives resolved family, style,
stretch, spacing, direction, locale, and font scale. Its returned `x` and `y`
are the painted box offsets relative to the requested anchor and baseline.
Hosts own font readiness and render again when metrics change.

Definitions accept scale factories for inferred domains and configured
instances for application-owned domains. `createChartScene` rejects missing
positional scales. TanStack copies each scale, applies the responsive pixel
range, and centers band output without mutating the source:

```ts
import { createChartScene, defineChart, lineY } from '@tanstack/charts'
import { scaleLinear } from '@tanstack/charts-scales/linear'

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
- [Scales](./docs/concepts/scales-and-d3.md)
- [Guides](./docs/guides/choosing-a-chart.md)
- [Example Gallery](./docs/examples/index.md)
- [API Reference](./docs/reference/index.md)
- [AI Authoring](./docs/guides/ai-authoring.md)

## Lineage and license

See the repository
[`ACKNOWLEDGEMENTS.md`](https://github.com/TanStack/charts/blob/main/ACKNOWLEDGEMENTS.md)
for the full credit. TanStack Charts is licensed under [MIT](./LICENSE).
