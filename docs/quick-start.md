---
title: Quick Start
description: Build, mount, update, and clean up a responsive TanStack Charts line chart with fully inferred types.
---

This walkthrough uses the framework-agnostic DOM host. The same chart
definition passes unchanged to any supported
[framework adapter](./installation.md#framework-compatibility).

## 1. Add a chart container

```html
<div id="revenue-chart"></div>
```

The host follows the container width when `width` is omitted.

## 2. Define the data and chart

<!-- docs-example: core-quick-start typecheck -->

```ts
import { extent, max } from 'd3-array'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { defineChart, lineY, mountChart } from '@tanstack/charts'

interface RevenueRow {
  id: string
  date: Date
  revenue: number | null
}

const rows: readonly RevenueRow[] = [
  { id: '2026-01', date: new Date('2026-01-01T00:00:00Z'), revenue: 38_000 },
  { id: '2026-02', date: new Date('2026-02-01T00:00:00Z'), revenue: 44_500 },
  { id: '2026-03', date: new Date('2026-03-01T00:00:00Z'), revenue: null },
  { id: '2026-04', date: new Date('2026-04-01T00:00:00Z'), revenue: 51_200 },
  { id: '2026-05', date: new Date('2026-05-01T00:00:00Z'), revenue: 57_800 },
]

const [firstDate, lastDate] = extent(rows, (row) => row.date)
const dateDomain: [Date, Date] =
  firstDate && lastDate
    ? [firstDate, lastDate]
    : [new Date(0), new Date(86_400_000)]
const revenueMax = max(rows, (row) => row.revenue ?? 0) ?? 0

const revenueChart = defineChart({
  marks: [
    lineY(rows, {
      id: 'monthly-revenue',
      x: 'date',
      y: 'revenue',
      key: 'id',
      stroke: '#2563eb',
      points: true,
    }),
  ],
  x: {
    scale: scaleUtc().domain(dateDomain).nice(),
    label: 'Month',
  },
  y: {
    scale: scaleLinear().domain([0, revenueMax]).nice(),
    label: 'Revenue',
    format: (value) =>
      new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(value),
    grid: true,
  },
})
```

Because this source imports `d3-array` and `d3-scale` directly, add those modules and `@types/d3-array` and `@types/d3-scale` as direct dependencies. See [Installation](./installation.md).

The missing March value creates a break instead of a misleading segment. The datum type flows through the mark and into interaction callbacks; no cast or manual chart generic is needed.

## 3. Mount it

```ts
const container = document.querySelector<HTMLElement>('#revenue-chart')

if (!container) {
  throw new Error('Missing #revenue-chart container')
}

const options = {
  definition: revenueChart,
  height: 360,
  initialWidth: 640,
  ariaLabel: 'Monthly revenue from January through May 2026',
  ariaDescription: 'March has no reported value.',
  tooltip: true,
}

const host = mountChart(container, options)
```

`initialWidth` is the deterministic fallback for server output, hidden containers, and the first frame before measurement. Once visible, the host uses `ResizeObserver` to follow the container.

<iframe
  src="https://tanstack.com/charts/catalog/embed/01-line-gaps/?theme=system&height=360"
  title="Line chart with missing-value gaps built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="360"
  style="width:100%;height:360px;border:0;"
></iframe>

## 4. Update host options

Static definitions contain their data. You can still update host concerns such as height, focus, tooltips, accessibility text, and animation:

```ts
host.update({
  ...options,
  height: 420,
  animate: { duration: 240, easing: 'ease-out' },
})
```

Use a [dynamic definition](./concepts/chart-definitions.md) when data or visual options change. Dynamic definitions receive a required, exactly typed `input` value while keeping the definition stable at module scope.

## 5. Clean up

```ts
host.destroy()
```

Destroying the host removes observers, event listeners, animations, runtime caches, tooltips, and chart markup. Framework adapters do this automatically during unmount.

## What the declaration means

- `lineY(rows, ...)` chooses a line mark and keeps the original row as the interaction datum.
- `x: 'date'` and `y: 'revenue'` map typed fields to positional channels.
- `key: 'id'` gives each observation stable identity across updates.
- The configured D3 scales own semantic domains, ticks, and mapping behavior.
- TanStack Charts copies those scales and assigns responsive pixel ranges.
- `label`, `format`, and `grid` configure the axis guide without changing the scale.
- Omitted margins are measured automatically from the rendered labels and titles.
- `ariaLabel` names the chart; pointer and keyboard focus use the same inferred points.

Read [Grammar of Graphics](./concepts/grammar-of-graphics.md) for the full model, then browse the [Example Gallery](./examples/index.md) for complete compositions.
