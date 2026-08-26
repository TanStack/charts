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
4. **Scales** — callable factories or instances that map semantic values into visual coordinates.
5. **Guides** — axes, ticks, grids, titles, and legends that explain those mappings.
6. **Layers** — marks rendered together in declaration order.

The result is one `ChartSpec` compiled into a renderer-neutral scene.

## The smallest useful declaration

```ts
import { barY, defineChart } from '@tanstack/charts'
import { scaleBand } from '@tanstack/charts/scales/band'
import { scaleLinear } from '@tanstack/charts/scales/linear'

interface LetterFrequency {
  letter: string
  frequency: number
}

const alphabet: readonly LetterFrequency[] = [
  { letter: 'E', frequency: 0.12702 },
  { letter: 'T', frequency: 0.09056 },
  { letter: 'A', frequency: 0.08167 },
  { letter: 'O', frequency: 0.07507 },
  { letter: 'I', frequency: 0.06966 },
]

const chart = defineChart({
  marks: [barY(alphabet, { x: 'letter', y: 'frequency' })],
  scales: {
    x: { scale: scaleBand },
    y: { scale: scaleLinear, nice: true },
  },
})
```

The mark consumes the typed letter-frequency rows directly and maps their
existing fields to x and y. No universal series wrapper or renamed chart
fields sit between the source data and the mark.

The lightweight scale package covers these common numeric and categorical
mappings. [Scales](./scales-and-d3.md) explains when a chart needs D3 instead.

## Data belongs to marks

Each mark receives its own iterable:

```ts
const marks = [
  areaY(forecastRows, {
    x: 'date',
    y1: 'low',
    y2: 'high',
  }),
  lineY(actualRows, {
    x: 'date',
    y: 'value',
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
})
```

- `lineY` chooses connected line geometry.
- `x` and `y` map compatible fields to positional channels.
- `z` partitions observations into independent lines and feeds the default categorical color mapping.

Built-in marks infer observation identity from a unique top-level `id`, nested
`data.id`, or mark-specific positional value. Add `key` only when none
represents the entity.

Choose a mark for the analytical task, then layer other marks to add context. [Marks and Layering](./marks-and-layering.md) describes the built-in families.

## Channels map data to meaning

A channel is usually a compatible field name:

```ts
dot(rows, {
  x: 'revenue',
  y: 'retention',
  z: 'segment',
  r: 'accounts',
})
```

It can also be an accessor when the value is derived:

```ts
dot(rows, {
  x: (row) => row.revenue / row.accounts,
  y: 'retention',
})
```

Accessors receive `(datum, { index, data })` and remain fully typed. Field
channels are filtered by the value type the mark accepts, so TypeScript rejects
a date field where a numeric bar length is required.

Channels describe mappings. Constant appearance options such as `stroke: '#2563eb'` or `fillOpacity: 0.2` describe a fixed style. The distinction keeps semantic encodings visible in source.

Read [Data and Channels](./data-and-channels.md) for missing values, accessors, keys, grouping, color, and radius.

## Scale factories derive semantic space

Pass a factory when its domain should follow the mark channels:

```ts
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { scalePoint } from '@tanstack/charts/scales/point'

const axes = {
  x: {
    scale: scalePoint,
    axis: { label: 'Month' },
  },
  y: {
    scale: scaleLinear,
    nice: true,
    grid: true,
    axis: { label: 'Revenue' },
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
  grid: true,
  axis: {
    label: 'Monthly revenue',
    ticks: {
      count: 5,
      format: (value: number) => `${Math.round(value / 1_000)}k`,
    },
  },
}
```

The scale maps values. The guide makes that mapping legible. `ticks`, `format`, `label`, `grid`, `reverse`, `tickRotate`, and `labelOffset` are presentation controls for the axis; they do not replace scale semantics.

Omitted margins are measured from the actual guides. See [Layout, Axes, and Coordinates](./layout-axes-and-coordinates.md).

## Layers build richer charts

Marks render in array order. Put context behind the primary data and annotations above it:

```ts group=layered-chart env=charts file=/src/chart.ts entry
import { areaY, defineChart, dot, lineY } from '@tanstack/charts'
import { scaleBand } from '@tanstack/charts/scales/band'
import { scaleLinear } from '@tanstack/charts/scales/linear'

const rows = [
  { month: 'Jan', value: 14 },
  { month: 'Feb', value: 18 },
  { month: 'Mar', value: 16 },
  { month: 'Apr', value: 23 },
  { month: 'May', value: 27 },
  { month: 'Jun', value: 25 },
]

export default defineChart({
  marks: [
    areaY(rows, {
      x: 'month',
      y: 'value',
      fill: '#93c5fd',
      fillOpacity: 0.35,
    }),
    lineY(rows, {
      x: 'month',
      y: 'value',
      stroke: '#2563eb',
      strokeWidth: 2,
    }),
    dot(rows, {
      x: 'month',
      y: 'value',
      r: 4,
      fill: '#2563eb',
    }),
  ],
  scales: {
    x: {
      scale: () => scaleBand<string>().padding(0.12),
    },
    y: {
      scale: scaleLinear,
      nice: true,
      grid: true,
      axis: { label: 'Value' },
    },
  },
})
```

The area establishes context, the line carries the trend, and the dots keep
each observation visible. All three marks share the same rows and scales.

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
