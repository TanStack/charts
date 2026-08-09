---
title: Faceting and Composition
description: Layer marks, repeat a shared chart by group, and coordinate multiple views without introducing a fixed chart-type model.
---

Composition is the main extension mechanism in TanStack Charts. Marks share a
chart specification, scales, theme, and responsive plot rectangle. More
complex views combine those same primitives instead of switching to a separate
component family.

## Layer marks

Marks are rendered in array order. Put broad background geometry first and
annotations or direct labels last:

```ts
const definition = defineChart({
  marks: [
    ruleY([0]),
    areaY(rows, { x: 'date', y1: 'low', y2: 'high' }),
    lineY(rows, { x: 'date', y: 'median' }),
    dot(highlights, { x: 'date', y: 'median' }),
    text(labels, { x: 'date', y: 'median', text: 'label' }),
  ],
  x,
  y,
})
```

Each mark may consume a different datum type. The resulting chart interaction
type is the honest union of those datum types. Use ordinary TypeScript
narrowing when a callback handles several layers.

The canonical grammar is described in
[Marks and Layering](../concepts/marks-and-layering.md).

## Facet one view by a field

`facetChart` repeats a mark composition for each group and returns a complete
guide-free outer definition:

```ts group=regional-facets env=charts file=/src/chart.ts entry
import { dot, facetChart, lineY } from '@tanstack/charts'
import { scaleLinear } from '@tanstack/charts-scales/linear'
import { rows } from './data'

export default facetChart(rows, {
  by: 'region',
  columns: 3,
  gap: 16,
  axes: 'outer',
  label: (region) => String(region),
  chart(data) {
    return {
      marks: [
        lineY(data, { x: 'week', y: 'orders', strokeWidth: 2 }),
        dot(data, { x: 'week', y: 'orders', r: 3.5 }),
      ],
      x: { scale: scaleLinear().domain([1, 4]) },
      y: {
        scale: scaleLinear().domain([0, 80]),
        grid: true,
        axis: { label: 'Orders' },
      },
    }
  },
})
```

```ts group=regional-facets file=/src/data.ts collapsed
export const rows = [
  { region: 'North', week: 1, orders: 32 },
  { region: 'North', week: 2, orders: 46 },
  { region: 'North', week: 3, orders: 51 },
  { region: 'North', week: 4, orders: 64 },
  { region: 'South', week: 1, orders: 45 },
  { region: 'South', week: 2, orders: 42 },
  { region: 'South', week: 3, orders: 57 },
  { region: 'South', week: 4, orders: 61 },
  { region: 'West', week: 1, orders: 25 },
  { region: 'West', week: 2, orders: 39 },
  { region: 'West', week: 3, orders: 48 },
  { region: 'West', week: 4, orders: 70 },
]
```

Use `facet(rows, options)` instead when the repeated panels need to be one mark
inside a larger custom definition.

The default `axes: 'outer'` draws shared guides around the complete facet
grid. Use `axes: 'cell'` when each panel needs its own guides. Cell axes and
incompatible independent scales cannot be presented as one shared outer axis;
choose the option that matches the comparison.

[Open the Anscombe quartet catalog case](https://tanstack.com/charts/catalog/facets-anscombe/).

## Share domains intentionally

Shared scales make position comparable across panels. Independent domains
make local variation easier to see but can exaggerate differences.

Build shared domains once and pass configured scales to every facet. When a
panel deliberately uses an independent domain, label that policy in the
surrounding UI.

The [Scales](../concepts/scales-and-d3.md) page owns scale construction
and responsive range rules.

## Compose distinct views

Not every composition is a facet. A focus-and-context chart, scatterplot with
marginal histograms, or chart with an inset summary contains views with
different roles. Use `composeViews` when they belong to one accessible figure:

```ts
import { alignX, composeViews, grid } from '@tanstack/charts/view'

const definition = composeViews({
  views: {
    overview: overviewDefinition,
    detail: detailDefinition,
  },
  layout: grid({
    rows: [
      { id: 'overview', size: 72 },
      { id: 'detail', grow: 1 },
    ],
    columns: [{ id: 'main', grow: 1 }],
    cells: {
      overview: { row: 'overview', column: 'main' },
      detail: { row: 'detail', column: 'main' },
    },
  }),
  links: [alignX('overview', 'detail')],
})
```

Use `fill`, `layer`, and `inset` when views overlap. Later layers paint above
earlier layers, and every child is clipped to its resolved frame. Use
`shareX` or `shareY` when linked views must resolve the same scale domain and
mapping; `alignX` and `alignY` align plot endpoints without sharing domains.

`viewGrid` is convenience syntax for the non-overlapping grid case. Keep
semantic selection or viewport state in application state; each child
definition consumes that state as ordinary data or domains. Use separate chart
hosts when panels need independent tooltips, keyboard behavior, or accessible
labels.

Do not coordinate charts by querying or mutating their SVG nodes.

## Composition checklist

- Layer order reflects visual occlusion and reading order.
- Each mark keeps its natural data shape and stable inferred or explicit
  identity.
- Shared scales are used only where direct positional comparison is intended.
- Facet axis policy is explicit.
- Every named `composeViews` child is placed exactly once.
- A composed definition has one outer accessible chart label and host behavior.
- Independently hosted views have independent accessible labels.
- Shared state is semantic application state, not DOM state.
- Dense dashboards destroy hosts and listeners when panels unmount.
