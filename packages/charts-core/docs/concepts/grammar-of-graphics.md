---
title: Grammar of Graphics
description: Understand TanStack Charts as a composition of data, marks, channels, scales, guides, and layers.
---

TanStack Charts follows the grammar-of-graphics tradition established by
[Leland Wilkinson](https://doi.org/10.1007/0-387-28695-0) and developed through
projects such as [ggplot2](https://ggplot2.tidyverse.org/),
[Vega-Lite](https://vega.github.io/vega-lite/), and Observable Plot. Observable
Plot is the closest API influence for mark-local data, channels, and layered
composition.

The grammar describes **what visual encodings mean** and lets the runtime decide
how to lay them out and render them. A chart is not a special-purpose component
with a fixed series model. It is a composition of:

1. **Data** — the observations or derived rows a mark consumes.
2. **Marks** — geometric forms such as lines, bars, dots, areas, rules, or text.
3. **Channels** — mappings from data to position, grouping, color, radius, or identity.
4. **Scales** — D3 factories or instances that map semantic values into visual coordinates.
5. **Guides** — axes, ticks, grids, titles, and legends that explain those mappings.
6. **Layers** — marks rendered together in declaration order.

The result is one `ChartSpec` compiled into a renderer-neutral scene.

## The smallest useful declaration

```ts
import { scaleLinear } from 'd3-scale'
import { defineChart, lineY } from '@tanstack/charts'

const values = [4, 9, 7, 12]

const chart = defineChart({
  marks: [lineY(values)],
  x: { scale: scaleLinear },
  y: { scale: scaleLinear, nice: true },
})
```

`lineY(values)` uses the array index for `x` and the numeric datum for `y`. Supplying explicit channels makes the same grammar work with application rows.

Because this example imports `d3-scale` directly, add `d3-scale` and `@types/d3-scale` as direct dependencies. [Scales and D3](./scales-and-d3.md) explains why scales remain explicit.

## Data belongs to marks

Each mark receives its own iterable:

```ts
const marks = [
  areaY(forecastRows, {
    x: 'date',
    y1: 'low',
    y2: 'high',
    key: 'id',
  }),
  lineY(actualRows, {
    x: 'date',
    y: 'value',
    key: 'id',
  }),
  ruleY([target]),
]
```

The arrays may have different lengths and datum types. There is no required `{ series: [...] }` wrapper and no requirement to reshape unrelated layers into one table. This keeps simple charts simple and lets custom compositions use the data model that naturally represents each layer.

If a transform creates new rows, run that transform before the mark. Memoize expensive derived rows through application or framework reactivity. See [Chart Definitions](./chart-definitions.md).

## Marks choose geometry

A mark turns data and channel values into scene nodes and interaction points:

```ts
lineY(rows, {
  x: 'date',
  y: 'revenue',
  z: 'region',
  key: 'id',
})
```

- `lineY` chooses connected line geometry.
- `x` and `y` map compatible fields to positional channels.
- `z` partitions observations into independent lines and feeds the default categorical color mapping.
- `key` preserves observation identity across updates.

Choose a mark for the analytical task, then layer other marks to add context. [Marks and Layering](./marks-and-layering.md) describes the built-in families.

## Channels map data to meaning

A channel is usually a compatible field name:

```ts
dot(rows, {
  x: 'revenue',
  y: 'retention',
  z: 'segment',
  r: 'accounts',
  key: 'id',
})
```

It can also be an accessor when the value is derived:

```ts
dot(rows, {
  x: (row) => row.revenue / row.accounts,
  y: 'retention',
  key: 'id',
})
```

Accessors receive `(datum, index, data)` and remain fully typed. Field channels are filtered by the value type the mark accepts, so TypeScript rejects a date field where a numeric bar length is required.

Channels describe mappings. Constant appearance options such as `stroke: '#2563eb'` or `fillOpacity: 0.2` describe a fixed style. The distinction keeps semantic encodings visible in source.

Read [Data and Channels](./data-and-channels.md) for missing values, accessors, keys, grouping, color, and radius.

## Scale factories derive semantic space

Pass a D3 factory when its domain should follow the mark channels:

```ts
const axes = {
  x: {
    scale: scaleUtc,
    nice: true,
    label: 'Month',
  },
  y: {
    scale: scaleLinear,
    nice: true,
    label: 'Revenue',
    grid: true,
  },
}
```

The marks supply the domain, the factory supplies the mapping, and TanStack
Charts supplies the responsive range. Pass a configured scale instance when
the application owns a fixed domain.

## Guides explain scales

Axis guide options live next to their scale:

```ts
const y = {
  scale: revenueScale,
  label: 'Monthly revenue',
  format: (value: number) => `$${Math.round(value / 1_000)}k`,
  ticks: 5,
  grid: true,
}
```

The scale maps values. The guide makes that mapping legible. `ticks`, `format`, `label`, `grid`, `reverse`, `tickRotate`, and `labelOffset` are presentation controls for the axis; they do not replace scale semantics.

Omitted margins are measured from the actual guides. See [Layout, Axes, and Coordinates](./layout-axes-and-coordinates.md).

## Layers build richer charts

Marks render in array order. Put context behind the primary data and annotations above it:

```ts
import { scaleBand, scaleLinear } from 'd3-scale'
import { curveMonotoneX } from 'd3-shape'
import {
  areaY,
  barY,
  d3Curve,
  defineChart,
  dot,
  lineY,
  ruleY,
} from '@tanstack/charts'

interface Quarter {
  id: string
  quarter: string
  revenue: number
  forecast: number
}

const quarters: readonly Quarter[] = [
  { id: 'q1', quarter: 'Q1', revenue: 38, forecast: 35 },
  { id: 'q2', quarter: 'Q2', revenue: 45, forecast: 43 },
  { id: 'q3', quarter: 'Q3', revenue: 41, forecast: 46 },
  { id: 'q4', quarter: 'Q4', revenue: 54, forecast: 51 },
]

const composedChart = defineChart({
  marks: [
    ruleY([40], { stroke: '#94a3b8', strokeOpacity: 0.65 }),
    areaY(quarters, {
      x: 'quarter',
      y1: 'forecast',
      y2: 'revenue',
      key: 'id',
      fill: '#60a5fa',
      fillOpacity: 0.16,
    }),
    barY(quarters, {
      x: 'quarter',
      y: 'revenue',
      key: 'id',
      fill: '#bfdbfe',
      inset: 12,
    }),
    lineY(quarters, {
      x: 'quarter',
      y: 'forecast',
      key: 'id',
      stroke: '#f97316',
      curve: d3Curve(curveMonotoneX),
    }),
    dot(quarters, {
      x: 'quarter',
      y: 'revenue',
      key: 'id',
      r: 4,
      fill: '#2563eb',
    }),
  ],
  x: {
    scale: () => scaleBand<string>().padding(0.12),
    label: 'Quarter',
  },
  y: {
    scale: scaleLinear().domain([0, 60]).nice(),
    label: 'Revenue',
    grid: true,
  },
})
```

This source imports `d3-scale` and `d3-shape` directly, so add those modules and their matching `@types` packages as direct dependencies. `d3Curve` is the small bridge from a D3 curve factory to the mark curve contract.

<iframe
  src="https://tanstack.com/charts/catalog/embed/70-composed-chart/?theme=system&height=400"
  title="Layered area, bar, line, and dot composition built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="400"
  style="width:100%;height:400px;border:0;"
></iframe>

## Definitions compile the grammar

`defineChart` preserves the relationship between datum types, channel values, configured scales, axes, scenes, and interaction callbacks.

- An **object definition** closes over stable data and options.
- A **responsive definition** receives the current size and default build-time
  theme.

The definition is also the application memoization boundary. Keep reusable
definitions at module scope. In a component, memoize the complete definition
against the application values it captures.

## Rendering is downstream

The grammar does not contain DOM or framework lifecycle code. It compiles to a keyed `ChartScene` containing:

- Resolved chart and margin bounds
- Resolved x, y, and color mappings
- Renderer-neutral scene nodes
- Interaction points that retain original data
- Theme and gradient resources

The built-in SVG renderer, DOM and framework hosts, static exporter, and custom
renderers all consume that same result.

Continue with [Chart Definitions](./chart-definitions.md), or start from a task in [Choosing a Chart](../guides/choosing-a-chart.md).
