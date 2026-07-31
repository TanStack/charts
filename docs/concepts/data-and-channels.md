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
})
```

Every accessor receives:

```ts
;(datum, index, data) => value
```

`datum` has the exact source type, `index` is the zero-based position, and `data` is the readonly materialized source array. Accessors are evaluated when the mark initializes; keep expensive cross-row transforms in application code.

## Positional channels

The x and y channels feed the chart’s positional scale factories or instances:

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
})
```

For connected line and area marks, an explicit `z` partitions observations
into independent geometry. If `z` is omitted and `color` is authored, `color`
also supplies that path grouping. When both are present, `z` wins for geometry
and interaction grouping while `color` remains an independent color-scale
value. Omitting `color` reuses `z` for color.

Bars stack their length channel by default. Use `layout: group()` when multiple
bars must occupy sub-bands within one category. Grouping uses `z` when present,
otherwise a discrete `color` channel may infer series identity. See
[Bars and Rankings](../examples/bars-and-rankings.md).

## Color channels and constants

There are two common paths:

- `color` is a semantic mapping resolved by the chart color scale.
- `z` falls back into that mapping when no separate `color` channel is set.
- `fill` and `stroke` are final paint overrides and bypass scale mapping for
  that paint.

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
dot(rows, {
  x: 'revenue',
  y: 'retention',
  r: 'accounts',
  rScale: {
    scale: () => scaleSqrt().range([3, 22]),
  },
})
```

This direct `scaleSqrt` import belongs to `d3-scale` and requires the matching direct dependency and type package.

Keeping the scale visible makes the perceptual encoding reviewable. It also avoids silently treating a business measure as pixels.

## Stable identity

Built-in marks infer identity in this order:

1. An explicit `key`
2. A unique string or number `datum.id`
3. A unique string or number `datum.data.id`
4. A unique mark-specific positional identity
5. Row index

Bars use their categorical channel. Lines and areas use their independent
axis. Dots and text try x, then y, then the x/y tuple. Rects and cells use
their x/y interval tuple. These candidates are checked within each interaction
group; a collision rejects the candidate and continues to the next fallback.
The nested ID convention covers rows emitted by wrappers such as D3 pie
without requiring an accessor solely to unwrap `data.id`.

For common rows with a unique `id`, no key option is required:

```ts
barX(rows, {
  id: 'product-ranking',
  x: 'value',
  y: 'product',
})
```

Use an explicit key when identity lives in another field, the inferred
positional value can change, or the automatic candidates are not unique:

```ts
barX(rows, {
  x: 'value',
  y: 'product',
  key: 'productId',
})
```

Explicit keys are string or number values and need to be unique within the
mark and group. When a mark-owned positional candidate is present but
incomplete or duplicated, the mark falls back to array position and warns once
per mark instance in development. Marks with no positional candidate also use
row position after checking IDs, without adding a warning for ordinary static
data.

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
  }),
  lineY(readings, {
    x: 'time',
    y: 'temperature',
  }),
  text(annotations, {
    x: 'time',
    y: 'value',
    text: 'label',
  }),
]
```

The definition’s interaction datum becomes the honest union of point-emitting mark data. Callbacks narrow that union using your existing discriminants or type guards.

## Derived data stays explicit

Grouping, binning, rolling, normalization, selection, and reusable stack
endpoints happen before mark construction. Use the pure transforms from
TanStack Charts or an ordinary application function:

```ts
const bins = binX(observations, {
  value: 'latency',
  thresholds: 24,
})
```

Transforms return materialized typed rows and retain source lineage. They do
not rewrite mark options or own reactivity. Run them beside `defineChart` or
inside the framework primitive that memoizes the definition. The resulting
rows flow into ordinary marks.

[Transforms and Reactivity](../guides/transforms-and-reactivity.md) shows the
complete raw-data-to-mark path and separates application memoization from
responsive layout work.

## Complete bubble-scatter example

```ts
import { scaleLinear, scaleOrdinal, scaleSqrt } from 'd3-scale'
import { colorLegend, defineChart, dot } from '@tanstack/charts'

interface PenguinsRow {
  species: string
  culmen_length_mm: number | null
  culmen_depth_mm: number | null
  body_mass_g: number | null
}

const penguins: readonly PenguinsRow[] = [
  {
    species: 'Adelie',
    culmen_length_mm: 39.1,
    culmen_depth_mm: 18.7,
    body_mass_g: 3750,
  },
  {
    species: 'Adelie',
    culmen_length_mm: 40.3,
    culmen_depth_mm: 18,
    body_mass_g: 3250,
  },
  {
    species: 'Chinstrap',
    culmen_length_mm: 46.5,
    culmen_depth_mm: 17.9,
    body_mass_g: 3500,
  },
  {
    species: 'Chinstrap',
    culmen_length_mm: 50,
    culmen_depth_mm: 19.5,
    body_mass_g: 3900,
  },
  {
    species: 'Gentoo',
    culmen_length_mm: 46.1,
    culmen_depth_mm: 13.2,
    body_mass_g: 4500,
  },
  {
    species: 'Gentoo',
    culmen_length_mm: 50,
    culmen_depth_mm: 16.3,
    body_mass_g: 5700,
  },
  {
    species: 'Gentoo',
    culmen_length_mm: null,
    culmen_depth_mm: null,
    body_mass_g: null,
  },
]

type CompletePenguin = PenguinsRow & {
  culmen_length_mm: number
  culmen_depth_mm: number
  body_mass_g: number
}

const rows = penguins.filter(
  (row): row is CompletePenguin =>
    row.culmen_length_mm !== null &&
    row.culmen_depth_mm !== null &&
    row.body_mass_g !== null,
)
const species = ['Adelie', 'Chinstrap', 'Gentoo']

const bubbleChart = defineChart({
  marks: [
    dot(rows, {
      x: 'culmen_length_mm',
      y: 'culmen_depth_mm',
      color: 'species',
      r: 'body_mass_g',
      rScale: {
        scale: () => scaleSqrt().range([3, 11]),
      },
      fillOpacity: 0.78,
      stroke: 'currentColor',
      strokeOpacity: 0.28,
      strokeWidth: 0.75,
    }),
  ],
  x: {
    scale: scaleLinear,
    grid: true,
    axis: { label: 'Bill length (mm)' },
  },
  y: {
    scale: scaleLinear,
    grid: true,
    axis: { label: 'Bill depth (mm)' },
  },
  color: {
    scale: scaleOrdinal(species, ['#2563eb', '#f97316', '#10b981']),
    legend: colorLegend({ label: 'Species' }),
  },
})
```

The filter only removes observations missing a plotted measurement; the marks
still use the source dataset's field names. This example imports `d3-scale`
directly. Install it and `@types/d3-scale`.

<iframe
  src="https://tanstack.com/charts/catalog/embed/scatter-bubble/?theme=system&height=480"
  title="Bubble scatterplot with color and radius channels built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

For every built-in channel, see the relevant [Mark Reference](../reference/marks/line-and-area.md). For inference rules and custom datum unions, see [TypeScript](../guides/typescript.md).
