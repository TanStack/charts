---
title: Marks and Layering
description: Choose built-in geometric marks, compose them in render order, and preserve stable layer identity.
---

A mark turns data and channel values into renderer-neutral scene nodes. Marks are small, composable units; a chart type is usually a useful arrangement of several marks rather than a separate component.

## Built-in mark families

| Visual task                                   | Start with                |
| --------------------------------------------- | ------------------------- |
| Trend or connected path                       | `lineY`                   |
| Range, band, or filled trend                  | `areaY`, `areaX`          |
| Category comparison                           | `barY`, `barX`            |
| Interval, heatmap cell, or rectangular region | `rect`, `cell`            |
| Relationship or individual observation        | `dot`, `hexagon`          |
| Baseline, threshold, or reference             | `ruleX`, `ruleY`          |
| Label or annotation                           | `text`                    |
| Directed relationship                         | `arrow`, `link`, `vector` |
| Compact distribution glyph                    | `tickX`, `tickY`          |
| Plot frame                                    | `frame`                   |
| Small-multiple composition                    | `facet`, `facetChart`     |

Start from the analytical question in [Choosing a Chart](../guides/choosing-a-chart.md). The [Mark Reference](../reference/marks/line-and-area.md) lists every channel and style option.

## Layer order is declaration order

Marks earlier in the array paint behind later marks:

```ts
const marks = [
  areaY(rangeRows, rangeOptions),
  ruleY([target], ruleOptions),
  lineY(actualRows, lineOptions),
  dot(highlightedRows, dotOptions),
  text(labels, textOptions),
]
```

A useful default order is:

1. Background regions and filled areas
2. Reference bands and rules
3. Primary bars or lines
4. Highlight dots, ticks, or vectors
5. Labels and annotations

There is no separate overlay subsystem. An annotation is another mark with its own data, channels, and stable identity.

## Mark identity

Every mark has an `id`. When omitted, it is derived from the mark type and array position.

Provide an explicit `id` when:

- Marks appear conditionally.
- Marks reorder.
- Two definitions should reconcile the same conceptual layer.
- Application code needs a stable `markId` in interaction points.

```ts
lineY(rows, {
  id: 'actual-revenue',
  x: 'date',
  y: 'actual',
  key: 'id',
})
```

The datum `key` identifies observations within the layer. Use both stable mark IDs and datum keys for dynamic compositions.

## Grouped geometry

`z` partitions geometry that should not connect:

```ts
lineY(rows, {
  x: 'date',
  y: 'value',
  z: 'region',
  key: 'id',
})
```

Each region becomes an independent line. Area marks use the same grouping rule.

Bars use the primary band by default. When `z` values should form side-by-side bars, supply a configured D3 `groupScale`. When rows should stack, prepare explicit `y1` and `y2` or `x1` and `x2` intervals before the mark. TanStack Charts does not guess whether a group means color, dodge, stack, or overlap.

## Line and area gaps

`lineY` and `areaY` split geometry at missing or invalid positional values:

```ts
interface Reading {
  id: string
  time: Date
  low: number | null
  high: number | null
}

areaY(readings, {
  x: 'time',
  y1: 'low',
  y2: 'high',
  key: 'id',
})
```

The break is intentional evidence that no interval was materialized for that observation. Do not replace missing data with zero unless zero is semantically correct.

## Baselines and intervals

Bar and area marks accept explicit endpoints:

```ts
areaY(rows, {
  x: 'date',
  y1: 'minimum',
  y2: 'maximum',
})

barY(rows, {
  x: 'category',
  y1: 'start',
  y2: 'end',
})
```

When `y1` or `x1` is omitted, bar and area baselines default to zero where that mark supports it. Supplying both endpoints makes the interval semantics explicit and includes both sides in scale materialization.

Rectangles are the general interval mark:

```ts
rect(windows, {
  x1: 'start',
  x2: 'end',
  y1: 'minimum',
  y2: 'maximum',
  key: 'id',
})
```

## Style values and visual channels

Some appearance options are constants:

```ts
lineY(rows, {
  x: 'date',
  y: 'value',
  stroke: '#2563eb',
  strokeWidth: 2.5,
  strokeOpacity: 0.9,
})
```

Marks that accept `VisualChannel` options can also derive a style from each row:

```ts
barX(rows, {
  x: 'value',
  y: 'label',
  fill: (row) => (row.highlighted ? '#f97316' : '#94a3b8'),
})
```

Use a semantic group or color channel and configured color scale when color represents data consistently across observations. Use a visual accessor for local styling that is not a shared scale.

## Clipping

Set `clip: true` on the chart definition when marks must not paint outside the resolved plot rectangle:

```ts
const chart = defineChart({
  marks,
  x: { scale: xScale },
  y: { scale: yScale },
  clip: true,
})
```

Clipping applies to the chart’s mark group, not axes or legends. Leave it off when an intentional annotation or marker should extend beyond the plot.

## Complete range-band composition

```ts
import { extent, max, min } from 'd3-array'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { areaY, defineChart, lineY } from '@tanstack/charts'

interface TemperatureRow {
  id: string
  date: Date
  low: number
  high: number
  average: number
}

const rows: readonly TemperatureRow[] = [
  {
    id: 'mon',
    date: new Date('2026-07-20T00:00:00Z'),
    low: 16,
    high: 27,
    average: 21,
  },
  {
    id: 'tue',
    date: new Date('2026-07-21T00:00:00Z'),
    low: 17,
    high: 30,
    average: 24,
  },
  {
    id: 'wed',
    date: new Date('2026-07-22T00:00:00Z'),
    low: 15,
    high: 26,
    average: 20,
  },
  {
    id: 'thu',
    date: new Date('2026-07-23T00:00:00Z'),
    low: 18,
    high: 32,
    average: 25,
  },
  {
    id: 'fri',
    date: new Date('2026-07-24T00:00:00Z'),
    low: 19,
    high: 34,
    average: 27,
  },
]

const [firstDate, lastDate] = extent(rows, (row) => row.date)
const dateDomain: [Date, Date] =
  firstDate && lastDate
    ? [firstDate, lastDate]
    : [new Date(0), new Date(86_400_000)]
const temperatureMinimum = min(rows, (row) => row.low) ?? 0
const temperatureMaximum = max(rows, (row) => row.high) ?? 1

const temperatureChart = defineChart({
  marks: [
    areaY(rows, {
      id: 'daily-range',
      x: 'date',
      y1: 'low',
      y2: 'high',
      key: 'id',
      fill: '#60a5fa',
      fillOpacity: 0.24,
    }),
    lineY(rows, {
      id: 'daily-low',
      x: 'date',
      y: 'low',
      key: 'id',
      stroke: '#2563eb',
      strokeWidth: 1.5,
    }),
    lineY(rows, {
      id: 'daily-high',
      x: 'date',
      y: 'high',
      key: 'id',
      stroke: '#2563eb',
      strokeWidth: 1.5,
    }),
    lineY(rows, {
      id: 'daily-average',
      x: 'date',
      y: 'average',
      key: 'id',
      stroke: '#f97316',
      strokeWidth: 2.5,
      points: true,
    }),
  ],
  x: {
    scale: scaleUtc().domain(dateDomain),
    label: 'Day',
  },
  y: {
    scale: scaleLinear()
      .domain([temperatureMinimum, temperatureMaximum])
      .nice(),
    label: 'Temperature (°C)',
    grid: true,
  },
})
```

This example directly imports `d3-array` and `d3-scale`. Install those modules and their matching `@types` packages as direct dependencies.

<iframe
  src="https://tanstack.com/charts/catalog/embed/03-temperature-range-band/?theme=system&height=400"
  title="Temperature range band with layered lines built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="400"
  style="width:100%;height:400px;border:0;"
></iframe>

## Custom marks

Use `createMark` when the needed geometry cannot be expressed by composing built-ins. A custom mark should still:

- Materialize scale channels explicitly.
- Use the resolved chart scales.
- Emit stable keyed scene nodes.
- Emit typed interaction points when the geometry represents observations.
- Reuse theme, clipping, and renderer-neutral scene primitives.

Most custom visualizations should remain compositions of built-in marks plus application-prepared rows. Reach for a custom mark only when the geometry itself is new. See [Custom Marks and Renderers](../guides/custom-marks-and-renderers.md).
