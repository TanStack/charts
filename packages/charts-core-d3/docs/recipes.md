# Recipes

> Archived experiment documentation. Use `packages/charts-core/docs` for the
> current D3-native product.

All examples use `@tanstack/charts`. React renders the definition with
`@tanstack/react-charts`; Octane uses `@tanstack/octane-charts`.

## Grouped time-series line

```ts
import {
  colorLegend,
  curveMonotoneX,
  defineChart,
  lineY,
  scaleUtc,
} from '@tanstack/charts'

const chart = defineChart({
  marks: [
    lineY(rows, {
      x: 'date',
      y: 'downloads',
      z: 'package',
      key: 'id',
      curve: curveMonotoneX,
    }),
  ],
  x: { type: scaleUtc() },
  y: { label: 'Weekly downloads', grid: true },
  color: { legend: colorLegend({ label: 'Package' }) },
})
```

One flat array and one `z` channel produce the groups. Do not filter the data
into one array per package.

## Area plus line and baseline

```ts
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
      curve: curveMonotoneX,
    }),
  ],
})
```

Layer order is declaration order.

## Sparkline

```ts
const sparkline = defineChart({
  guides: false,
  margin: 0,
  marks: [lineY(values)],
})
```

Guide suppression removes axes, grids, labels, and their default margins. The
same scene, SSR, responsive, and interaction contracts still apply.

## Dynamic ranking

```ts
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
    x: { grid: true, ticks: width < 420 ? 4 : 7 },
    y: { padding: 0.22 },
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
import { scaleLog } from '@tanstack/charts/scales/transforms'

const chart = defineChart({
  marks: [
    dot(rows, {
      x: 'users',
      y: 'revenue',
      z: 'segment',
      r: 'accounts',
      key: 'id',
    }),
  ],
  x: { type: scaleLog(), label: 'Users', grid: true },
  y: { type: scaleLog(), label: 'Revenue', grid: true },
})
```

Log domains must be strictly positive. Use `symlog` when values may be zero or
negative. A radius channel is area-scaled automatically. Use
`rScale: scaleRadius({ range: [3, 18] })` to configure it, or `rScale: false`
when the channel already contains pixel radii.

## Histogram

```ts
import { rect } from '@tanstack/charts'
import { binX } from '@tanstack/charts/transform/bin'

const bins = binX(rows, {
  value: 'latency',
  thresholds: 20,
})

const chart = defineChart({
  marks: [
    rect(bins, {
      x: 'x',
      x1: 'x1',
      x2: 'x2',
      y1: () => 0,
      y2: 'value',
      key: 'x1',
      inset: 1,
    }),
  ],
  x: { label: 'Latency (ms)' },
  y: { label: 'Requests' },
})
```

Public data transforms retain contributing source rows. Memoize them through
the owning framework when the input is dynamic.

## Stacked values

```ts
import { rect } from '@tanstack/charts'
import { stackRowsY } from '@tanstack/charts/transform/stack'

const stacked = stackRowsY(rows, {
  x: 'quarter',
  y: 'revenue',
  z: 'product',
})

const chart = defineChart({
  marks: [
    rect(stacked, {
      x: 'x',
      y1: 'y1',
      y2: 'y2',
      z: 'z',
      key: (row) => `${row.x}:${row.z}`,
    }),
  ],
})
```

Positive and negative values use separate baselines. Each derived row exposes
its original datum as `datum`.

## Small multiples

```ts
import { facetChart, lineY } from '@tanstack/charts'

const chart = facetChart(rows, {
  by: 'package',
  minWidth: 220,
  chart: (group) => ({
    marks: [lineY(group, { x: 'date', y: 'downloads', key: 'id' })],
    x: { domain: sharedDateDomain },
    y: { domain: sharedDownloadDomain },
  }),
})
```

`facetChart` automatically flows cells into fewer columns as the measured width
shrinks. Each cell owns a normal chart definition and independent scales.
Provide explicit shared domains when the panels must be directly comparable.
Use the lower-level `facet` mark when a facet composition needs outer layers or
custom margins.

## Categorical heatmap

```ts
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
  color: {
    domain: ['healthy', 'warning', 'critical'],
    range: ['#10b981', '#f59e0b', '#ef4444'],
    legend: colorLegend({ label: 'Status' }),
  },
})
```

Ordinal color is the default. For a numeric channel, opt into a continuous
scale and matching guide:

```ts
import { colorGradientLegend } from '@tanstack/charts/legend'
import { scaleColorLinear } from '@tanstack/charts/scales/color'

const chart = defineChart({
  marks: [cell(rows, { x: 'weekday', y: 'hour', z: 'value' })],
  color: {
    type: scaleColorLinear(),
    range: ['#eff6ff', '#3b82f6', '#172554'],
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
  }}
/>
```

Use `onFocusChange` instead when the application must own rich tooltip or
focus UI. Use `onSelect` for click and keyboard activation; keep selected state
in the application and express its visual treatment as another mark layer.
