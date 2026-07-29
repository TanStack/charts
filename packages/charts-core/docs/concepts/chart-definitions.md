---
title: Chart Definitions
description: Choose static or dynamic definitions, understand preparation and equality, and preserve stable updates.
---

A chart definition is the stable, typed boundary between application state and the chart grammar. It owns marks, scales, guides, theme overrides, and the rules for turning input into a `ChartSpec`.

There are two forms:

- A **static definition** for data and visual options that are already fixed.
- A **dynamic definition** for input that changes, size-aware composition, cached preparation, or theme-aware choices.

## Static definitions

Pass a `ChartSpec` directly to `defineChart`:

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
  marks: [
    barY(rows, {
      x: 'region',
      y: 'revenue',
      key: 'id',
      fill: '#2563eb',
      inset: 2,
    }),
  ],
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

The definition infers the datum and coordinate types from its marks. Use it when changing the chart means intentionally creating a new definition.

Because this example imports `d3-scale` directly, add `d3-scale` and `@types/d3-scale` as direct dependencies. See [Scales and D3](./scales-and-d3.md).

## Dynamic definitions

Call `defineChart<Input>()` and provide either a chart callback or a configuration object:

<!-- docs-example: dynamic-definition typecheck -->

```ts
import { max } from 'd3-array'
import { scaleBand, scaleLinear } from 'd3-scale'
import { barX, defineChart } from '@tanstack/charts'

interface ProductRow {
  id: string
  product: string
  revenue: number
  orders: number
}

interface RankingInput {
  rows: readonly ProductRow[]
  metric: 'revenue' | 'orders'
  accent: string
}

interface RankingRow {
  id: string
  product: string
  value: number
  source: ProductRow
}

function prepareRanking(input: RankingInput): readonly RankingRow[] {
  return input.rows
    .map((source) => ({
      id: source.id,
      product: source.product,
      value: source[input.metric],
      source,
    }))
    .sort((left, right) => right.value - left.value)
}

const productRanking = defineChart<RankingInput>()({
  inputEqual: (previous, next) =>
    previous.rows === next.rows &&
    previous.metric === next.metric &&
    previous.accent === next.accent,
  prepareEqual: (previous, next) =>
    previous.rows === next.rows && previous.metric === next.metric,
  prepare: (input, { signal }) => {
    signal.throwIfAborted()
    return prepareRanking(input)
  },
  chart: ({ input, prepared, width }) => {
    const maximum = max(prepared, (row) => row.value) ?? 0

    return {
      marks: [
        barX(prepared, {
          x: 'value',
          y: 'product',
          key: 'id',
          fill: input.accent,
          inset: 2,
        }),
      ],
      x: {
        scale: scaleLinear().domain([0, maximum]).nice(),
        ticks: width < 480 ? 4 : 7,
        label: input.metric === 'revenue' ? 'Revenue' : 'Orders',
        grid: true,
      },
      y: {
        scale: scaleBand<string>()
          .domain(prepared.map((row) => row.product))
          .padding(0.1),
      },
    }
  },
})
```

This example directly imports `d3-array` and `d3-scale`. Install those modules and `@types/d3-array` and `@types/d3-scale` as direct application dependencies.

The input type is the only manual type introduction. The prepared rows, mark datum, channel fields, scales, interaction points, vanilla host, and framework adapter props all infer from the returned definition.

## Build context

The `chart` callback receives:

| Value      | Meaning                                                            |
| ---------- | ------------------------------------------------------------------ |
| `input`    | The exact input passed by the host or adapter                      |
| `prepared` | The output of `prepare`, or `input` when no preparation is defined |
| `width`    | Current chart surface width                                        |
| `height`   | Current chart surface height                                       |
| `theme`    | The base chart theme available while building the spec             |

Use `width` and `height` to change tick density, annotation detail, label rotation, or even mark composition according to the **container**, not the viewport.

Use `theme` when a mark choice needs a base theme value. A `theme` override returned by the same chart callback is applied later while the scene is compiled, so read application theme state through `input` when the declaration itself must branch on it. Prefer CSS variables for colors that only need normal light and dark mode styling.

## Preparation

`prepare` isolates synchronous work that should not repeat on every visual change:

- Sorting and ranking
- Grouping and aggregation
- Binning or stacking
- Building interval rows
- Constructing a lookup used by multiple marks

Preparation must be synchronous. Fetch data before updating chart input. The `AbortSignal` supports cancellation checks and cleanup for work initiated during preparation.

Keep enough source identity in derived rows for tooltips and selection. The `source` property in the ranking example preserves the original `ProductRow`.

## Equality and memoization

Host-driven dynamic definitions have two equality boundaries:

1. `inputEqual` decides whether a host update changes the chart at all.
2. `prepareEqual` decides whether cached preparation can be reused.

The defaults are:

- Plain object input uses shallow equality.
- Arrays, dates, maps, sets, and class instances compare by identity.
- `prepareEqual` defaults to `inputEqual`.
- A size change rebuilds the scene but reuses prepared data.
- A different definition object invalidates the runtime cache.

Only add custom equality when measurement or application semantics require it. Comparators must be correct for every value read by their boundary. An `inputEqual` that ignores a color field can suppress a required host redraw; a `prepareEqual` that ignores the selected metric can reuse stale derived rows. Direct `runtime.render` calls always produce a scene; `prepareEqual` still controls whether their prepared value is reused.

## Keep definitions stable

Create reusable dynamic definitions at module scope:

```ts
const chart = defineChart<RankingInput>()(({ input, width }) => ({
  marks: [
    barX(input.rows, {
      x: input.metric,
      y: 'product',
      key: 'id',
      fill: input.accent,
    }),
  ],
  x: {
    scale: scaleLinear()
      .domain([0, max(input.rows, (row) => row[input.metric]) ?? 0])
      .nice(),
    ticks: width < 480 ? 4 : 7,
  },
  y: {
    scale: scaleBand<string>()
      .domain(input.rows.map((row) => row.product))
      .padding(0.1),
  },
}))
```

Do not recreate the definition inside each framework render. Pass changing values through `input`:

```tsx
<Chart
  definition={chart}
  input={{ rows, metric, accent }}
  ariaLabel="Product ranking"
/>
```

The inline input object is safe when its fields retain the identities the definition expects.

## Vanilla host updates

Dynamic definitions require `input`:

```ts
const firstInput: RankingInput = {
  rows,
  metric: 'revenue',
  accent: '#2563eb',
}

const firstOptions = {
  definition: productRanking,
  input: firstInput,
  height: 360,
  ariaLabel: 'Products ranked by revenue',
  tooltip: true,
}

const host = mountChart(container, firstOptions)

host.update({
  ...firstOptions,
  input: {
    rows,
    metric: 'orders',
    accent: '#f97316',
  },
  ariaLabel: 'Products ranked by orders',
  animate: true,
})
```

Each call that reaches `host.update` commits synchronously. Framework adapters
forward each committed chart option set; framework scheduling may omit
intermediate application states before they reach the chart.

## Keys, reconciliation, and animation

Scene nodes are keyed. Built-in marks derive stable node keys from:

- The mark `id`
- The grouping channel
- The datum `key`

Provide an explicit `id` when marks can reorder or appear conditionally. Provide a `key` whenever rows can reorder, enter, or leave.

Stable keys let the DOM host:

- Preserve surviving SVG elements
- Update geometry and styles in place
- Interpolate compatible numeric attributes and paths
- Retain focus when the same observation survives an update
- Interrupt an in-flight transition from its current painted geometry

Animation is a host concern:

```ts
host.update({
  ...firstOptions,
  input: {
    rows: nextRows,
    metric: 'revenue',
    accent: '#2563eb',
  },
  animate: {
    duration: 280,
    easing: 'ease-out',
    respectReducedMotion: true,
  },
})
```

Static scene creation and server rendering do not include animation work.

<iframe
  src="https://tanstack.com/charts/catalog/embed/86-streaming-window-preservation/?theme=system&height=380"
  title="Streaming chart preserving a bounded window across dynamic updates"
  loading="lazy"
  width="100%"
  height="380"
  style="width:100%;height:380px;border:0;"
></iframe>

## Choosing a form

Use a static definition when:

- Data and options are stable.
- You render a one-off static graphic.
- Recreating the definition is intentional.

Use a dynamic definition when:

- Data, metric, color, filtering, or composition changes.
- Preparation should have a separate cache.
- The chart responds to container size.
- Theme values affect the declaration.
- Updates should reconcile and animate through one stable identity.

Read [Dynamic Data and Animation](../guides/dynamic-data-and-animation.md) for application patterns and [Chart Definition API](../reference/chart-definitions.md) for every signature and option.
