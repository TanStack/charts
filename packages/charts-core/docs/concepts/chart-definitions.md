---
title: Chart Definitions
description: Capture application values in memoized definitions and use responsive builders for surface-dependent choices.
---

A chart definition is the typed boundary between application state and the
chart grammar. It owns marks, scales, guides, theme overrides, responsive
choices, focus, tooltips, animation, keyboard policy, and spatial indexing.

## Static definitions

Pass a complete spec when the chart does not need its resolved surface size:

<!-- docs-example: static-definition typecheck -->

```ts
import { scaleBand, scaleLinear } from 'd3-scale'
import { barY, defineChart } from '@tanstack/charts'

const rows = [
  { id: 'north', region: 'North', revenue: 48 },
  { id: 'south', region: 'South', revenue: 35 },
  { id: 'west', region: 'West', revenue: 57 },
]

const revenueByRegion = defineChart({
  marks: [barY(rows, { x: 'region', y: 'revenue', key: 'id' })],
  x: {
    scale: scaleBand<string>()
      .domain(rows.map((row) => row.region))
      .padding(0.12),
  },
  y: {
    scale: scaleLinear().domain([0, 60]).nice(),
    label: 'Revenue',
    grid: true,
  },
})
```

## Responsive definitions

Pass a builder when tick density, annotations, or mark composition depends on
the chart surface:

```ts
const productRanking = defineChart({
  tooltip: true,
  chart: ({ width }) => ({
    marks: [barX(ranked, { x: 'value', y: 'product', key: 'id' })],
    x: {
      scale: scaleLinear().domain([0, maximum]).nice(),
      ticks: width < 480 ? 4 : 7,
    },
    y: {
      scale: scaleBand<string>()
        .domain(ranked.map((row) => row.product))
        .padding(0.1),
    },
  }),
})
```

The host controls `width` and `height`; the builder only reads their resolved
values. It also receives the default build-time `theme`.

## Transform beside the definition

Keep analytical work visible in ordinary functions:

```ts
function rankProducts(rows: readonly ProductRow[], metric: Metric) {
  return rows
    .map((source) => ({
      id: source.id,
      product: source.product,
      value: source[metric],
      source,
    }))
    .sort((left, right) => right.value - left.value)
}
```

Derived rows should retain source identity needed by tooltips and selection.
Fetching, cancellation, permissions, and server aggregation remain application
concerns.

## Memoize the complete definition

Definitions capture the values they use. In React:

```tsx
function ProductRanking({ rows, metric }: Props) {
  const definition = useMemo(() => {
    const ranked = rankProducts(rows, metric)
    const maximum = max(ranked, (row) => row.value) ?? 0

    return defineChart({
      tooltip: true,
      chart: ({ width }) => ({
        marks: [barX(ranked, { x: 'value', y: 'product', key: 'id' })],
        x: {
          scale: scaleLinear().domain([0, maximum]).nice(),
          ticks: width < 480 ? 4 : 7,
        },
        y: {
          scale: scaleBand<string>()
            .domain(ranked.map((row) => row.product))
            .padding(0.1),
        },
      }),
    })
  }, [rows, metric])

  return <Chart definition={definition} ariaLabel="Product ranking" />
}
```

Use `computed`, `createMemo`, `$derived`, or the equivalent native primitive in
other frameworks. Memoization is the update contract: preserve definition
identity until a captured value changes.

## Vanilla updates

Vanilla code makes that boundary explicit:

```ts
const createProductRanking = (rows: readonly ProductRow[], metric: Metric) => {
  const ranked = rankProducts(rows, metric)
  return defineChart({
    animate: true,
    chart: ({ width }) => buildRankingSpec(ranked, width),
  })
}

const options = {
  definition: createProductRanking(rows, 'revenue'),
  height: 360,
  ariaLabel: 'Products ranked by revenue',
}

const host = mountChart(container, options)

host.update({
  ...options,
  definition: createProductRanking(rows, 'orders'),
  ariaLabel: 'Products ranked by orders',
})
```

Charts owns surface measurement, scene construction, and keyed reconciliation.
It does not own application equality or data reactivity.
