---
title: Data and Channels
description: Map typed application data to positions, grouping, color, radius, and stable chart identity.
---

Marks consume ordinary iterables. Channels say which values from those rows control position, grouping, color, size, or identity.

TanStack Charts does not require a universal series shape. Keep the data model that best represents the problem, and let each mark consume the rows it needs.

## Field channels

Use a field name when the value already exists:

```ts
lineY(rows, {
  x: 'date',
  y: 'revenue',
  z: 'region',
  key: 'id',
})
```

The field list is type-filtered. For example:

- A numeric `barX` length accepts numeric fields.
- A date-based `lineY` x channel accepts a `Date` field.
- `key` accepts string or number fields.
- Nullable positional fields are valid when the mark defines missing-value behavior.

If TypeScript rejects a field name, do not cast it. Correct the row type, choose the intended field, or use a typed accessor.

## Accessor channels

Use an accessor for derived values:

```ts
dot(rows, {
  x: (row) => row.revenue / row.accounts,
  y: (row) => row.retained / row.accounts,
  key: 'id',
})
```

Every accessor receives:

```ts
;(datum, index, data) => value
```

`datum` has the exact source type, `index` is the zero-based position, and `data` is the readonly materialized source array. Accessors are evaluated when the mark initializes; keep expensive cross-row transforms in application code or a dynamic definition’s `prepare` phase.

## Positional channels

The x and y channels feed the chart’s configured positional scales:

```ts
barX(rows, {
  x: 'revenue',
  y: 'region',
})
```

Positional values are also retained in each interaction `ChartPoint`:

```ts
const handleFocus = (point: ChartPoint<Row, number, string> | null) => {
  if (!point) return
  console.log(point.datum, point.xValue, point.yValue)
}
```

Normal callbacks infer these types from the definition, so explicit `ChartPoint` annotations are usually unnecessary.

`number`, `string`, and `Date` are the supported chart value types. A definition can infer a union when conditional branches intentionally use different coordinate types; narrow that union with normal TypeScript control flow.

## Grouping with `z`

`z` identifies a semantic series or group:

```ts
lineY(rows, {
  x: 'date',
  y: 'value',
  z: 'region',
  key: 'id',
})
```

For line and area marks, `z` partitions observations into independent geometry. For built-in marks, it also supplies a categorical value to the color resolver unless a separate color channel is available.

On bars, `z` does not implicitly invent grouped-bar geometry. Supply an explicit D3 `groupScale` when multiple bars must occupy sub-bands within the same category. See [Bars and Rankings](../examples/bars-and-rankings.md).

## Color channels and constants

There are two common paths:

- A fixed `fill` or `stroke` is a constant style.
- A categorical `z` or `color` channel is a semantic mapping resolved by the chart color scale.

The default categorical palette is useful for quick distinctions. Use an explicit D3 ordinal scale when a category must always map to the same color across charts, filters, and sessions.

```ts
const segmentColor = scaleOrdinal(
  ['Consumer', 'Enterprise', 'Public'],
  ['#2563eb', '#f97316', '#10b981'],
)

const chart = defineChart({
  marks: [
    dot(rows, {
      x: 'revenue',
      y: 'retention',
      z: 'segment',
      key: 'id',
    }),
  ],
  x: { scale: revenueScale },
  y: { scale: retentionScale },
  color: {
    scale: segmentColor,
    legend: colorLegend({ label: 'Segment' }),
  },
})
```

This snippet directly imports `scaleOrdinal` from `d3-scale` and uses `colorLegend` from `@tanstack/charts`. Install `d3-scale` and `@types/d3-scale` as direct dependencies. [Legends and Color](../guides/legends-and-color.md) covers continuous color, gradients, and application-wide palettes.

## Radius is explicit

The `r` option on `dot` is a pixel radius unless `rScale` is supplied:

```ts
const accountRadius = scaleSqrt().domain([0, accountMaximum]).range([3, 22])

dot(rows, {
  x: 'revenue',
  y: 'retention',
  r: 'accounts',
  rScale: accountRadius,
  key: 'id',
})
```

This direct `scaleSqrt` import belongs to `d3-scale` and requires the matching direct dependency and type package.

Keeping the scale visible makes the perceptual encoding reviewable. It also avoids silently treating a business measure as pixels.

## Stable identity with `key`

Use `key` whenever observations can:

- Reorder
- Enter or leave
- Move between groups
- Animate between values
- Remain focused across updates

```ts
barX(rows, {
  id: 'product-ranking',
  x: 'value',
  y: 'product',
  key: 'productId',
})
```

Keys are string or number values. They need to be unique within the mark and group. Do not use an array index for dynamic rows unless array position is the true semantic identity.

The mark `id` identifies the layer. Give conditionally rendered or reordered marks an explicit, stable `id` as well.

## Missing and invalid values

Marks ignore positional observations they cannot materialize.

- `lineY` and `areaY` split geometry at missing or non-finite positions.
- `dot`, bars, rectangles, rules, and text omit invalid observations.
- A negative dot radius is invalid.
- A null group means “ungrouped.”

Model a genuinely missing observation as `null` or `undefined` in the field type. Do not replace it with zero unless zero is the correct domain value.

For lines, a gap communicates missing data:

```ts
interface Reading {
  id: string
  time: Date
  temperature: number | null
}

lineY(readings, {
  x: 'time',
  y: 'temperature',
  key: 'id',
})
```

## Different marks can use different rows

Layering does not force one datum union:

```ts
const marks = [
  rect(maintenanceWindows, {
    x1: 'start',
    x2: 'end',
    y1: 'minimum',
    y2: 'maximum',
    key: 'id',
  }),
  lineY(readings, {
    x: 'time',
    y: 'temperature',
    key: 'id',
  }),
  text(annotations, {
    x: 'time',
    y: 'value',
    text: 'label',
    key: 'id',
  }),
]
```

The definition’s interaction datum becomes the honest union of point-emitting mark data. Callbacks narrow that union using your existing discriminants or type guards.

## Derived data remains application-owned

Grouping, binning, stacking, sorting, aggregation, and spatial preparation happen before marks:

```ts
const bins = bin().domain([minimum, maximum]).thresholds(24)(values)

const rows = bins.map((items, index) => ({
  id: index,
  x1: items.x0 ?? minimum,
  x2: items.x1 ?? maximum,
  count: items.length,
  items,
}))
```

The resulting rows flow into ordinary marks. Install the granular D3 module used by the transform and its matching type package. [Scales and D3](./scales-and-d3.md) routes each responsibility to official D3 documentation without duplicating it.

## Complete bubble-scatter example

```ts
import { max } from 'd3-array'
import { scaleLinear, scaleOrdinal, scaleSqrt } from 'd3-scale'
import { colorLegend, defineChart, dot } from '@tanstack/charts'

interface AccountSegment {
  id: string
  revenue: number
  retention: number
  accounts: number
  segment: 'Consumer' | 'Enterprise' | 'Public'
}

const rows: readonly AccountSegment[] = [
  { id: 'a', revenue: 28, retention: 0.74, accounts: 180, segment: 'Consumer' },
  {
    id: 'b',
    revenue: 62,
    retention: 0.91,
    accounts: 75,
    segment: 'Enterprise',
  },
  { id: 'c', revenue: 44, retention: 0.83, accounts: 120, segment: 'Public' },
  { id: 'd', revenue: 35, retention: 0.79, accounts: 240, segment: 'Consumer' },
]

const accountMaximum = max(rows, (row) => row.accounts) ?? 0
const radius = scaleSqrt().domain([0, accountMaximum]).range([4, 24])
const segments: readonly AccountSegment['segment'][] = [
  'Consumer',
  'Enterprise',
  'Public',
]

const bubbleChart = defineChart({
  marks: [
    dot(rows, {
      x: 'revenue',
      y: 'retention',
      z: 'segment',
      r: 'accounts',
      rScale: radius,
      key: 'id',
      fillOpacity: 0.72,
      stroke: 'Canvas',
      strokeWidth: 1,
    }),
  ],
  x: {
    scale: scaleLinear().domain([0, 70]).nice(),
    label: 'Revenue',
    grid: true,
  },
  y: {
    scale: scaleLinear().domain([0.65, 1]).nice(),
    label: 'Retention',
    format: (value) => `${Math.round(value * 100)}%`,
    grid: true,
  },
  color: {
    scale: scaleOrdinal(segments, ['#2563eb', '#f97316', '#10b981']),
    legend: colorLegend({ label: 'Segment' }),
  },
})
```

This example imports `d3-array` and `d3-scale` directly. Install both modules and their matching `@types` packages.

<iframe
  src="https://tanstack.com/charts/catalog/embed/scatter-bubble/?theme=system&height=400"
  title="Bubble scatterplot with color and radius channels built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="400"
  style="width:100%;height:400px;border:0;"
></iframe>

For every built-in channel, see the relevant [Mark Reference](../reference/marks/line-and-area.md). For inference rules and custom datum unions, see [TypeScript](../guides/typescript.md).
