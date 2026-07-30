---
title: React Quick Start
description: Install the React adapter, define a typed chart, render responsive SVG, and add native interaction.
---

Install the framework adapter, core grammar, React peer, and only the granular
data and scale modules used by the chart:

```sh
pnpm add @tanstack/charts @tanstack/react-charts react d3-array d3-scale
pnpm add -D @types/d3-array @types/d3-scale @types/react
```

The shared [Scales and D3](../../concepts/scales-and-d3.md) page explains why
scales and optional algorithms remain direct application dependencies.

## Define a chart

Definitions are ordinary framework-independent TypeScript:

<!-- docs-example: react-quick-start typecheck -->

```tsx
import { max } from 'd3-array'
import { scaleBand, scaleLinear } from 'd3-scale'
import { barY, defineChart } from '@tanstack/charts'
import { Chart } from '@tanstack/react-charts'

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

The definition infers the original row and semantic x/y types. Do not add
component generics or cast the definition.

## Responsive sizing

Use a fixed height with responsive width:

```tsx
<Chart definition={revenueChart} height={320} ariaLabel="Monthly revenue" />
```

Or give the host a proportional box:

```tsx
<Chart
  definition={revenueChart}
  aspectRatio={16 / 9}
  initialWidth={720}
  ariaLabel="Monthly revenue"
/>
```

The outer element fills its available width when `width` is absent. The
adapter server-renders with `initialWidth`, then the shared DOM host measures
the actual container after hydration. See
[React adapter](./adapter.md#sizing-and-layout).

## Memoize live definitions

When a chart captures component values, memoize the complete definition:

```tsx
import { useMemo } from 'react'

interface RevenueInput {
  rows: readonly { month: string; value: number }[]
  accent: string
}

export function LiveRevenue({ rows, accent }: RevenueInput) {
  const definition = useMemo(() => {
    const maximum = max(rows, (row) => row.value) ?? 0

    return defineChart({
      marks: [
        barY(rows, {
          x: 'month',
          y: 'value',
          fill: accent,
        }),
      ],
      x: {
        scale: scaleBand()
          .domain(rows.map((row) => row.month))
          .padding(0.18),
      },
      y: {
        scale: scaleLinear().domain([0, maximum]).nice(),
      },
    })
  }, [rows, accent])

  return (
    <Chart
      definition={definition}
      height={320}
      ariaLabel="Live monthly revenue"
      animate
      tooltip
    />
  )
}
```

The dependency list owns application invalidation. The definition identity
tells the chart host when captured values changed. See
[Chart Definition API](../../reference/chart-definitions.md).

## Interaction callbacks

Callback types flow from the marks:

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

The native tooltip is optional. Grouped focus, formatting, keyboard behavior,
and application-owned interaction are documented in
[Focus and interaction](../../reference/focus-and-interaction.md).

## Example

This catalog example uses multiple line layers and endpoint labels through the
same React adapter:

<iframe
  src="https://tanstack.com/charts/catalog/embed/02-multi-line-end-labels/?theme=system&height=360"
  title="Multi-line chart with endpoint labels"
  loading="lazy"
  width="100%"
  height="360"
  style="width: 100%; height: 360px; border: 0"
></iframe>

Continue with the [React adapter](./adapter.md) for lifecycle and SSR, the
[`Chart` reference](./reference/chart.md) for every prop, or the
[core API reference](../../reference/index.md) for definitions, marks, scales,
and rendering.
