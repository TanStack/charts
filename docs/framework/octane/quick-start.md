---
title: Octane Quick Start
description: Install the Octane adapter, define a typed chart, render responsive SSR-safe SVG, and add native interaction.
---

Install the framework adapter, core grammar, Octane peer, and only the granular
data and scale modules used by the chart:

```sh
pnpm add @tanstack/charts @tanstack/octane-charts octane d3-array d3-scale
pnpm add -D @types/d3-array @types/d3-scale
```

The shared [Scales and D3](../../concepts/scales-and-d3.md) page explains the
injected scale and algorithm boundary.

## Define and render a chart

Definitions are framework-independent and can be shared with any adapter:

<!-- docs-example: octane-quick-start octane -->

```tsx
import { max } from 'd3-array'
import { scaleBand, scaleLinear } from 'd3-scale'
import { barY, defineChart } from '@tanstack/charts'
import { Chart } from '@tanstack/octane-charts'

const revenue = [
  { month: 'Jan', value: 42 },
  { month: 'Feb', value: 58 },
  { month: 'Mar', value: 76 },
  { month: 'Apr', value: 64 },
]

const maximum = max(revenue, (row) => row.value) ?? 0

const revenueChart = defineChart({
  marks: [
    barY(revenue, {
      x: 'month',
      y: 'value',
    }),
  ],
  x: {
    scale: scaleBand()
      .domain(revenue.map((row) => row.month))
      .padding(0.18),
  },
  y: {
    scale: scaleLinear().domain([0, maximum]).nice(),
    label: 'Revenue',
    grid: true,
  },
})

export function RevenueChart() {
  return (
    <Chart
      definition={revenueChart}
      height={320}
      ariaLabel="Monthly revenue"
      tooltip
    />
  )
}
```

The definition infers the row, scale, and callback types. Normal TSRX authoring
does not need `Chart` generics or casts.

## Responsive sizing

Use `height` for a fixed-height responsive chart:

```tsx
<Chart definition={revenueChart} height={320} ariaLabel="Monthly revenue" />
```

Use `aspectRatio` when height should follow width:

```tsx
<Chart
  definition={revenueChart}
  aspectRatio={16 / 9}
  initialWidth={720}
  ariaLabel="Monthly revenue"
/>
```

The server scene uses `initialWidth`, then the shared host measures the actual
container after hydration. See
[Octane adapter](./adapter.md#sizing-and-layout).

## Dynamic input

```tsx
interface RevenueInput {
  rows: readonly { month: string; value: number }[]
  accent: string
}

const dynamicRevenue = defineChart<RevenueInput>()(({ input }) => {
  const maximum = max(input.rows, (row) => row.value) ?? 0

  return {
    marks: [
      barY(input.rows, {
        x: 'month',
        y: 'value',
        fill: input.accent,
      }),
    ],
    x: {
      scale: scaleBand()
        .domain(input.rows.map((row) => row.month))
        .padding(0.18),
    },
    y: {
      scale: scaleLinear().domain([0, maximum]).nice(),
    },
  }
})

export function LiveRevenue(props: RevenueInput) {
  return (
    <Chart
      definition={dynamicRevenue}
      input={props}
      height={320}
      ariaLabel="Live monthly revenue"
      animate
      tooltip
    />
  )
}
```

`input` is required with the exact declared shape. Keep preparation caching
inside the definition; see
[Chart Definition API](../../reference/chart-definitions.md).

## Interaction callbacks

```tsx
<Chart
  definition={revenueChart}
  height={320}
  ariaLabel="Monthly revenue"
  tooltip
  onFocusChange={(point) => {
    if (point) {
      console.log(point.datum.month, point.yValue)
    }
  }}
  onSelect={(point) => {
    if (point) openMonth(point.datum.month)
  }}
/>
```

Grouped focus, tooltip formatting, keyboard behavior, and application-owned
interaction are documented in
[Focus and interaction](../../reference/focus-and-interaction.md).

## Example

This calendar heatmap uses typed cells and responsive guide layout through the
same Octane adapter:

<iframe
  src="https://tanstack.com/charts/catalog/embed/25-calendar-heatmap/?theme=system&height=360"
  title="Calendar heatmap"
  loading="lazy"
  width="100%"
  height="360"
  style="width: 100%; height: 360px; border: 0"
></iframe>

Continue with the [Octane adapter](./adapter.md) for lifecycle and SSR, the
[`Chart` reference](./reference/chart.md) for every prop, or the
[core API reference](../../reference/index.md).
