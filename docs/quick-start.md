---
title: Quick Start
description: Build, mount, update, and clean up a responsive TanStack Charts line chart with fully inferred types.
---

This walkthrough uses the framework-agnostic DOM host. The same chart
definition passes unchanged to any supported
[framework adapter](./installation.md#framework-compatibility).

Install TanStack Charts:

```sh
pnpm add @tanstack/charts
```

## 1. Add a chart container

```html
<div id="monthly-revenue-chart"></div>
```

The host follows the container width when `width` is omitted.

## 2. Define the data and chart

<!-- docs-example: core-quick-start typecheck -->

```ts
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { scalePoint } from '@tanstack/charts/scales/point'
import { defineChart, lineY, mountChart } from '@tanstack/charts'
import { tooltip } from '@tanstack/charts/tooltip'

interface RevenueMonth {
  month: string
  revenue: number
}

const monthlyRevenue: readonly RevenueMonth[] = [
  { month: 'Jan', revenue: 42_000 },
  { month: 'Feb', revenue: 58_000 },
  { month: 'Mar', revenue: 76_000 },
  { month: 'Apr', revenue: 64_000 },
  { month: 'May', revenue: 81_000 },
]

const monthlyRevenueChart = defineChart({
  marks: [
    lineY(monthlyRevenue, {
      id: 'monthly-revenue',
      x: 'month',
      y: 'revenue',
      points: true,
      stroke: '#2563eb',
    }),
  ],
  scales: {
    x: {
      scale: () => scalePoint<string>().padding(0.2),
      axis: { label: 'Month' },
    },
    y: {
      scale: scaleLinear,
      nice: true,
      grid: true,
      axis: { label: 'Revenue (USD)' },
    },
  },

  tooltip,
})
```

The compact point and linear scales cover this categorical and numeric chart
without a D3 dependency. The original revenue row flows through the mark and
into interaction callbacks; no cast or manual chart generic is needed.

## 3. Mount it

```ts
const container = document.querySelector<HTMLElement>('#monthly-revenue-chart')

if (!container) {
  throw new Error('Missing #monthly-revenue-chart container')
}

const options = {
  definition: monthlyRevenueChart,
  height: 360,
  initialWidth: 640,
  ariaLabel: 'Monthly revenue',
}

const host = mountChart(container, options)
```

`initialWidth` is the deterministic fallback for server output, hidden containers, and the first frame before measurement. Once visible, the host uses `ResizeObserver` to follow the container.

## 4. Update the chart

Host options only cover mounting concerns such as size and accessibility:

```ts
host.update({
  ...options,
  height: 420,
})
```

When data, visual options, focus, tooltips, keyboard policy, or animation
change, create a new definition and pass it to `host.update`. In a framework
component, memoize the complete definition against the values it captures. See
[Chart definitions](./concepts/chart-definitions.md).

## 5. Clean up

```ts
host.destroy()
```

Destroying the host removes observers, event listeners, animations, tooltips, and chart markup. Framework adapters do this automatically during unmount.

## What the declaration means

- `lineY(monthlyRevenue, ...)` chooses a line mark and keeps each source row as
  the interaction datum.
- `x: 'month'` and `y: 'revenue'` map existing source fields.
- The unique month gives each observation stable positional identity across updates.
- Compact scale factories infer domains from mark channels and own mapping behavior.
- TanStack Charts copies those scales and assigns responsive pixel ranges.
- `label`, `format`, and `grid` configure the axis guide without changing the scale.
- Omitted margins are measured automatically from the rendered labels and titles.
- `ariaLabel` names the chart; pointer and keyboard focus use the same inferred points.

Read [Grammar of Graphics](./concepts/grammar-of-graphics.md) for the full model, then browse the [Example Gallery](./examples/index.md) for complete compositions.
