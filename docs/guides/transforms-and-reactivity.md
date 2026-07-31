---
title: Transforms and Reactivity
description: Derive typed rows once and memoize them where the data is owned.
---

TanStack transforms are eager, deterministic data utilities. Their results can
feed a chart, table, export, test, or another transform.

```text
source rows → data transforms → mark channels → mark layout
```

Use a channel accessor for a one-row calculation, a data transform for reusable
cross-row work, and `layout: stack()` or `layout: group()` when geometry belongs
only to one mark.

## Hoist the calculation

```ts
const daily = groupBy(orders, {
  by: {
    region: 'region',
    day: ({ datum }) => utcDay.floor(datum.createdAt),
  },
  outputs: {
    revenue: { value: 'amount', reduce: 'sum' },
    orders: { reduce: 'count' },
    averageOrder: { value: 'amount', reduce: 'mean' },
  },
})

const trends = window(daily, {
  by: 'region',
  orderBy: 'day',
  size: 28,
  partial: false,
  outputs: {
    revenue28d: { value: 'revenue', reduce: 'sum' },
    averageOrder28d: { value: 'averageOrder', reduce: 'mean' },
  },
})

lineY(trends, { x: 'day', y: 'revenue28d', color: 'region' })
```

Unlike a mark-options transform, both intermediate datasets are normal typed
rows. Group fields are named and row transforms remain flat.

## Use callbacks and escape hatches

Field names and object-bag callbacks are interchangeable:

```ts
const summaries = groupBy(rows, {
  by: { region: 'region', profitable: ({ datum }) => datum.margin > 0 },
  outputs: {
    p90: { value: 'latency', reduce: quantile(0.9) },
    custom: {
      reduce: ({ data, group }) => domainCalculation(data, group),
    },
  },
})
```

For transforms outside the built-ins, use an ordinary function:

```ts
const active = rows.filter((row) => row.active)
const enriched = active.map(enrichRow)
const summaries = groupBy(enriched, options)
```

This is the escape hatch and the composition model. There is no pipeline
protocol to learn.

## Memoize at the owner

```tsx
const histogram = useMemo(
  () => binX(observations, { value: 'latency', thresholds: 24 }),
  [observations],
)
```

Use `computed`, `createMemo`, `$derived`, or the equivalent application
primitive. TanStack Charts does not add a cache or reactive graph.

## Keep geometry separate

Color can infer stack series for stack-capable marks. Grouping remains an
explicit geometric choice:

```ts
barY(rows, { x: 'quarter', y: 'revenue', color: 'product' })

barY(rows, {
  x: 'quarter',
  y: 'revenue',
  color: 'product',
  layout: group(),
})
```

Use `stackRowsX` or `stackRowsY` when stack endpoints must be reused outside
that mark.

Granular imports such as `@tanstack/charts/transform/group` and
`@tanstack/charts/transform/window` keep unrelated transform families out of
bundle-sensitive code.
