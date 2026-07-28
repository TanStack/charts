# Recipes

All examples use `@tanstack/charts`. React renders the definition with
`@tanstack/react-charts`; Octane uses `@tanstack/octane-charts`.

## Grouped time-series line

```ts
import { extent, max } from 'd3-array'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { curveMonotoneX } from 'd3-shape'
import { colorLegend, d3Curve, defineChart, lineY } from '@tanstack/charts'

const [firstDate, lastDate] = extent(rows, (row) => row.date)
const dateDomain: [Date, Date] =
  firstDate && lastDate
    ? [firstDate, lastDate]
    : [new Date(0), new Date(86_400_000)]
const downloadMax = max(rows, (row) => row.downloads) ?? 0

const chart = defineChart({
  marks: [
    lineY(rows, {
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
  color: { legend: colorLegend({ label: 'Package' }) },
})
```

One flat array and one `z` channel produce the groups. Do not filter the data
into one array per package.

## Area plus line and baseline

```ts
import { extent } from 'd3-array'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { curveMonotoneX } from 'd3-shape'
import { areaY, d3Curve, defineChart, lineY, ruleY } from '@tanstack/charts'

const [firstDate, lastDate] = extent(rows, (row) => row.date)
const dateDomain: [Date, Date] =
  firstDate && lastDate
    ? [firstDate, lastDate]
    : [new Date(0), new Date(86_400_000)]
const [valueMin = 0, valueMax = 1] = extent([
  0,
  ...rows.map((row) => row.value),
])

const chart = defineChart({
  marks: [
    areaY(rows, {
      x: 'date',
      y: 'value',
      fill: 'var(--ts-chart-1)',
      fillOpacity: 0.16,
    }),
    ruleY([0], { strokeOpacity: 0.25 }),
    lineY(rows, {
      x: 'date',
      y: 'value',
      key: 'id',
      curve: d3Curve(curveMonotoneX),
    }),
  ],
  x: { scale: scaleUtc().domain(dateDomain).nice() },
  y: { scale: scaleLinear().domain([valueMin, valueMax]).nice() },
})
```

Layer order is declaration order.

## Sparkline

```ts
import { extent } from 'd3-array'
import { scaleLinear } from 'd3-scale'
import { defineChart, lineY } from '@tanstack/charts'

const [valueMin = 0, valueMax = 1] = extent(values)
const sparkline = defineChart({
  guides: false,
  margin: 0,
  marks: [lineY(values)],
  x: { scale: scaleLinear().domain([0, Math.max(1, values.length - 1)]) },
  y: { scale: scaleLinear().domain([valueMin, valueMax]) },
})
```

Guide suppression removes axes, grids, labels, and their default margins. The
same scene, SSR, responsive, and interaction contracts still apply.

## Dynamic ranking

```ts
import { max } from 'd3-array'
import { scaleBand, scaleLinear } from 'd3-scale'
import { barX, defineChart } from '@tanstack/charts'

interface Input {
  rows: readonly { id: string; name: string; value: number }[]
}

const ranking = defineChart<Input>()({
  prepare: (input) => [...input.rows].sort((a, b) => b.value - a.value),
  prepareEqual: (a, b) => a.rows === b.rows,
  chart: ({ prepared, width }) => ({
    marks: [
      barX(prepared, {
        x: 'value',
        y: 'name',
        key: 'id',
        radius: 4,
      }),
    ],
    x: {
      scale: scaleLinear()
        .domain([0, max(prepared, (row) => row.value) ?? 0])
        .nice(),
      grid: true,
      ticks: width < 420 ? 4 : 7,
    },
    y: {
      scale: scaleBand()
        .domain(prepared.map((row) => row.name))
        .padding(0.22),
    },
  }),
})
```

```tsx
<Chart
  definition={ranking}
  input={{ rows }}
  height={360}
  ariaLabel="Current product ranking"
  animate={{ duration: 320, easing: 'ease-in-out' }}
  tooltip
/>
```

The stable `key` lets bars retain DOM identity while position and size
interpolate.

## Scatterplot with a log scale

```ts
import { scaleLog, scaleRadial } from 'd3-scale'

const x = scaleLog().domain([1, 1_000_000])
const y = scaleLog().domain([1, 100_000])
const radius = scaleRadial().domain([0, 50_000]).range([3, 18])

const chart = defineChart({
  marks: [
    dot(rows, {
      x: 'users',
      y: 'revenue',
      z: 'segment',
      r: 'accounts',
      rScale: radius,
      key: 'id',
    }),
  ],
  x: { scale: x, label: 'Users', grid: true },
  y: { scale: y, label: 'Revenue', grid: true },
})
```

Log domains must be strictly positive. Use D3's `scaleSymlog` when values may
be zero or negative. Radius channels contain pixel radii unless `rScale`
supplies a D3 scale. `scaleRadial` makes circle area linear in the domain;
`range([3, 18])` intentionally keeps a zero value visible, while
`range([0, 18])` maps zero to zero area.

## Histogram

```ts
import { bin, max } from 'd3-array'
import { scaleLinear } from 'd3-scale'
import { defineChart, rect } from '@tanstack/charts'

const bins = bin<Row, number>()
  .value((row) => row.latency)
  .thresholds(20)(rows)
const latencyDomain: [number, number] = [bins[0]?.x0 ?? 0, bins.at(-1)?.x1 ?? 1]
const countMax = max(bins, (entries) => entries.length) ?? 0

const chart = defineChart({
  marks: [
    rect(bins, {
      x: (entries) => ((entries.x0 ?? 0) + (entries.x1 ?? 0)) / 2,
      x1: (entries) => entries.x0,
      x2: (entries) => entries.x1,
      y1: () => 0,
      y2: (entries) => entries.length,
      key: (entries) => entries.x0 ?? 0,
      inset: 1,
    }),
  ],
  x: {
    scale: scaleLinear().domain(latencyDomain),
    label: 'Latency (ms)',
  },
  y: {
    scale: scaleLinear().domain([0, countMax]).nice(),
    label: 'Requests',
  },
})
```

D3 bins are arrays of the contributing source rows, so tooltips and callbacks
can retain source identity. Build them in `prepare` when input is dynamic so
visual-only updates reuse the result.

When migrating fixed Observable Plot thresholds, distinguish boundaries from
interior cuts. If `boundaries` is the complete sequence, Plot receives it
directly, while D3 should use:

```ts
const firstBoundary = boundaries[0] ?? 0
const lastBoundary = boundaries.at(-1) ?? firstBoundary + 1

bin<Row, number>()
  .value((row) => row.latency)
  .domain([firstBoundary, lastBoundary])
  .thresholds(boundaries.slice(1, -1))
```

This preserves the two edge bins instead of silently changing the bin count.

## Stacked values

```ts
import { extent, index, union } from 'd3-array'
import { scaleBand, scaleLinear } from 'd3-scale'
import { stack, stackOffsetDiverging } from 'd3-shape'
import { barY, defineChart } from '@tanstack/charts'

const quarters = [...new Set(rows.map((row) => row.quarter))]
const products = union(rows.map((row) => row.product))
const byQuarter = index(
  rows,
  (row) => row.quarter,
  (row) => row.product,
)
const stacked = stack<string, string>()
  .keys(products)
  .value(
    (quarter, product) => byQuarter.get(quarter)?.get(product)?.revenue ?? 0,
  )
  .offset(stackOffsetDiverging)(quarters)
  .flatMap((series) =>
    series.map((interval, quarterIndex) => ({
      quarter: quarters[quarterIndex] as string,
      product: series.key,
      y1: interval[0],
      y2: interval[1],
      datum: byQuarter.get(quarters[quarterIndex] as string)?.get(series.key),
    })),
  )
const [valueMin, valueMax] = extent(stacked.flatMap((row) => [row.y1, row.y2]))
const valueDomain: [number, number] =
  valueMin === undefined || valueMax === undefined
    ? [0, 1]
    : [valueMin, valueMax]

const chart = defineChart({
  marks: [
    barY(stacked, {
      x: 'quarter',
      y1: 'y1',
      y2: 'y2',
      z: 'product',
      key: (row) => `${row.quarter}:${row.product}`,
    }),
  ],
  x: {
    scale: scaleBand()
      .domain([...new Set(stacked.map((row) => row.quarter))])
      .paddingInner(0.1)
      .paddingOuter(0.05),
  },
  y: { scale: scaleLinear().domain(valueDomain).nice() },
})
```

`stackOffsetDiverging` gives positive and negative values separate baselines.
The application adapts D3 tuples into explicit `y1`/`y2` intervals while
retaining the source datum. If a server already supplies `y0`/`y1`, skip D3
stacking and point the mark’s `y1` and `y2` channels at those fields.

## Small multiples

```ts
import { scaleLinear, scaleUtc } from 'd3-scale'
import { facetChart, lineY } from '@tanstack/charts'

const chart = facetChart(rows, {
  by: 'package',
  minWidth: 220,
  chart: (group) => ({
    marks: [lineY(group, { x: 'date', y: 'downloads', key: 'id' })],
    x: { scale: scaleUtc().domain(sharedDateDomain) },
    y: { scale: scaleLinear().domain(sharedDownloadDomain) },
  }),
})
```

`facetChart` automatically flows cells into fewer columns as the measured width
shrinks. Each cell owns a normal chart definition and independent scales.
Provide explicit shared domains when the panels must be directly comparable.
Use the lower-level `facet` mark when a facet composition needs outer layers or
custom margins. Shared outer axes are not implemented yet: each cell currently
renders its own configured guides.

## Categorical heatmap

```ts
import { scaleBand, scaleOrdinal } from 'd3-scale'
import { cell, defineChart } from '@tanstack/charts'
import { colorLegend } from '@tanstack/charts/legend'

const chart = defineChart({
  marks: [
    cell(rows, {
      x: 'weekday',
      y: 'hour',
      z: 'status',
      key: 'id',
      radius: 3,
    }),
  ],
  x: { scale: scaleBand().domain(weekdays).padding(0.05) },
  y: { scale: scaleBand().domain(hours).padding(0.05) },
  color: {
    scale: scaleOrdinal(
      ['healthy', 'warning', 'critical'],
      ['#10b981', '#f59e0b', '#ef4444'],
    ),
    legend: colorLegend({ label: 'Status' }),
  },
})
```

Ordinal color is the default. For a numeric channel, opt into a continuous
scale and matching guide:

```ts
import { extent } from 'd3-array'
import { scaleBand, scaleLinear } from 'd3-scale'
import { cell, defineChart } from '@tanstack/charts'
import { colorGradientLegend } from '@tanstack/charts/legend'

const [valueMin = 0, valueMax = 1] = extent(rows, (row) => row.value)

const chart = defineChart({
  marks: [cell(rows, { x: 'weekday', y: 'hour', z: 'value' })],
  x: { scale: scaleBand().domain(weekdays).padding(0.05) },
  y: { scale: scaleBand().domain(hours).padding(0.05) },
  color: {
    scale: scaleLinear<string>()
      .domain([valueMin, (valueMin + valueMax) / 2, valueMax])
      .range(['#eff6ff', '#3b82f6', '#172554'])
      .clamp(true),
    legend: colorGradientLegend({ label: 'Requests' }),
  },
})
```

## Custom tooltip text

```tsx
<Chart
  definition={chart}
  ariaLabel="Weekly downloads"
  tooltip={{
    format: (point) => `${point.groupLabel}: ${point.yValue.toLocaleString()}`,
    sticky: true,
  }}
/>
```

`sticky: true` lets a pointer click pin the current tooltip until another click
or Escape releases it.

Use `onFocusChange` instead when the application must own rich tooltip or
focus UI. Use `onSelect` for click and keyboard activation; keep selected state
in the application and express its visual treatment as another mark layer.

The automatic tooltip uses locale-aware number formatting, which suppresses
floating-point artifacts. A supplied `format` or `formatGroup` callback owns
rounding and notation as part of the application's display policy.

Pointer selection and tooltip content are independent:

- omit `focus` for one nearest point in two dimensions;
- use `focusNearestX` or `focusNearestY` for one point while prioritizing an
  axis;
- use `focusX` or `focusY` to show one point per series at the nearest axis
  value.
