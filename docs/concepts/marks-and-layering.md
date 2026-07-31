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
| Pie, donut, gauge, or cyclic profile          | `polar` and radial marks  |
| Projected GeoJSON                             | `geoShape`                |

Start from the analytical question in
[Choosing a Chart](../guides/choosing-a-chart.md). The
[Mark Reference](../reference/index.md#mark-reference) lists every channel and
style option. Polar and geographic marks use explicit capability subpaths.

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
})
```

Built-in marks infer datum identity from a unique top-level `id`, nested
`data.id`, or mark-specific position. Supply `key` when that inferred value is
not the entity's stable identity.

## Grouped geometry

An explicit `z` partitions geometry that should not connect:

```ts
lineY(rows, {
  x: 'date',
  y: 'value',
  z: 'region',
})
```

Each region becomes an independent line. Area marks use the same grouping
rule. When `z` is omitted on a connected line or area, an authored `color`
channel supplies the path groups as well as color semantics. Explicit `z`
always wins when the two fields differ.

Bars stack their single quantitative channel by default. Use
`layout: group({ scale })` for side-by-side bars; it groups by `z` when present
and otherwise by discrete `color`. Explicit `y1`/`y2` or `x1`/`x2` channels
opt out of implicit stacking and preserve authored intervals.

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
import { scaleLinear, scaleUtc } from 'd3-scale'
import { areaY, defineChart, lineY } from '@tanstack/charts'

interface DailyTemperature {
  date: Date
  high: number
  low: number
}

const sfTemperatures: readonly DailyTemperature[] = [
  { date: new Date('2026-07-01T00:00:00Z'), high: 68, low: 55 },
  { date: new Date('2026-07-02T00:00:00Z'), high: 71, low: 56 },
  { date: new Date('2026-07-03T00:00:00Z'), high: 66, low: 54 },
  { date: new Date('2026-07-04T00:00:00Z'), high: 69, low: 55 },
  { date: new Date('2026-07-05T00:00:00Z'), high: 73, low: 57 },
  { date: new Date('2026-07-06T00:00:00Z'), high: 70, low: 56 },
]

const temperatureChart = defineChart({
  marks: [
    areaY(sfTemperatures, {
      id: 'daily-range',
      x: 'date',
      y1: 'low',
      y2: 'high',
      fill: '#60a5fa',
      fillOpacity: 0.24,
    }),
    lineY(sfTemperatures, {
      id: 'daily-low',
      x: 'date',
      y: 'low',
      stroke: '#2563eb',
      strokeWidth: 1.5,
    }),
    lineY(sfTemperatures, {
      id: 'daily-high',
      x: 'date',
      y: 'high',
      stroke: '#dc2626',
      strokeWidth: 1.5,
    }),
  ],
  x: {
    scale: scaleUtc,
    axis: { label: 'Day' },
  },
  y: {
    scale: scaleLinear,
    nice: true,
    grid: true,
    axis: { label: 'Temperature (°F)' },
  },
})
```

This example directly imports `d3-scale`. Install it and `@types/d3-scale` as
direct dependencies.

<iframe
  src="https://tanstack.com/charts/catalog/embed/03-temperature-range-band/?theme=system&height=480"
  title="Temperature range band with layered lines built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

## Custom marks

Use `createMark` when the needed geometry cannot be expressed by composing built-ins. A custom mark should still:

- Materialize scale channels explicitly.
- Use the resolved chart scales.
- Emit stable keyed scene nodes.
- Emit typed interaction points when the geometry represents observations.
- Reuse theme, clipping, and renderer-neutral scene primitives.

Most custom visualizations should remain compositions of built-in marks plus application-prepared rows. Reach for a custom mark only when the geometry itself is new. See [Custom Marks and Renderers](../guides/custom-marks-and-renderers.md).
