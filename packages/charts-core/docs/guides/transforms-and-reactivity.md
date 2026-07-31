---
title: Transforms and Reactivity
description: Derive typed chart rows with explicit transforms and memoize them through application reactivity.
---

TanStack Charts provides pure data transforms for common analytical work. Each
transform accepts rows and returns rows immediately. It does not rewrite mark
options, retain hidden state, or choose when to recompute.

The data path stays explicit:

```text
raw rows → data transforms → mark channels → mark layout → interaction state
```

## Choose the layer

| Work                                           | Location                                |
| ---------------------------------------------- | --------------------------------------- |
| A value derived from one row                   | Channel accessor                        |
| Group, bin, rolling, normalize, select, stack  | TanStack data transform                 |
| Chart-specific or domain-specific preparation  | Custom data transform                   |
| Reused or expensive derived data               | Framework memo or computed state        |
| Group or stack geometry for one mark           | `layout: group()` or inferred/`stack()` |
| A surface-responsive transform                 | Definition builder using surface size   |
| Exact plot-pixel collision or placement        | Custom mark render phase                |
| Querying, permissions, or business aggregation | Application or server                   |

Data transforms are appropriate when the result is useful as data: it feeds
multiple marks, needs source lineage, or must be inspected outside rendering.
Mark layout is appropriate when only one mark needs visual offsets or stack
endpoints.

## Accessors and outputs

Transform values accept a field name or an accessor. Accessors receive one
object:

```ts
const values = normalize(rows, {
  value: ({ datum, index, data }) => datum.actual / datum.target,
  by: 'region',
})
```

Reducers also receive one object containing `values`, selected `data`, source
`indexes`, and the group `key`:

```ts
const summaries = groupBy(rows, {
  by: 'region',
  outputs: {
    count: { reduce: 'count' },
    revenue: { value: 'revenue', reduce: 'sum' },
    spread: {
      value: 'revenue',
      reduce: ({ values }) => Math.max(...values) - Math.min(...values),
    },
  },
})
```

Built-in reducers are `count`, `sum`, `mean`, `min`, and `max`. Empty `sum`
and `count` outputs are `0`; empty `mean`, `min`, and `max` outputs are `NaN`.

Aggregating transforms retain the contributing observations as `source` and
their input positions as `sourceIndexes`. One-to-one transforms also expose
`datum` and `index`. This makes tooltip, selection, and drill-down ownership
explicit.

Named outputs cannot replace structural transform fields such as `key`,
`source`, interval endpoints, `datum`, or `index`; a reserved name throws.

## Group

`groupBy` creates one row per key and computes all requested outputs in one
grouping pass:

```ts
const species = groupBy(penguins, {
  by: 'species',
  outputs: {
    meanBodyMass: { value: 'body_mass_g', reduce: 'mean' },
  },
})

barY(species, { x: 'key', y: 'meanBodyMass' })
```

An accessor can return a tuple for a compound key.

## Bin

`binX` and `binY` return aligned interval endpoints, centers, outputs, and
lineage. A threshold array is treated as complete boundaries, including the
outer boundaries:

```ts
const histogram = binX(observations, {
  value: 'latency',
  thresholds: [0, 50, 100, 250, 500, 1000],
  outputs: {
    count: { reduce: 'count' },
    average: { value: 'latency', reduce: 'mean' },
  },
})

rect(histogram, {
  x1: 'x1',
  x2: 'x2',
  y1: () => 0,
  y2: 'count',
  inset: 1,
})
```

Set `by` to produce grouped bins. Every group uses the same boundaries, so
facets and overlaid series remain comparable. A numeric `thresholds` value
uses D3's bin threshold calculation over the shared domain. When an explicit
boundary sequence and `domain` are both supplied, the domain must match its
first and last boundaries. Explicit boundaries also produce stable zero-count
bins for an empty ungrouped source or a group containing no valid values.

## Window

`window` computes rolling outputs and retains the complete source window:

```ts
const rolling = window(readings, {
  by: 'sensor',
  size: 14,
  partial: false,
  outputs: {
    high: { value: 'high', reduce: 'mean' },
    low: { value: 'low', reduce: 'mean' },
  },
})

lineY(rolling, {
  x: ({ datum }) => datum.date,
  y: 'high',
})
```

The default anchor is `end`. `start` and `middle` are available when the
output should align differently. Without `outputs`, `value` produces a single
`value` field and defaults to `mean`. `size` must be positive and finite.

## Normalize and select

`normalize` keeps one output row per valid input row. It supports `sum`,
`max`, `extent`, `first`, `last`, or a custom basis, optionally per group:

```ts
const shares = normalize(rows, {
  value: 'revenue',
  by: 'quarter',
  basis: 'sum',
})
```

`select` returns original rows. Use `first`, `last`, `min`, `max`, or a custom
selector. Custom selectors return source indexes from the provided `indexes`
array:

```ts
const extrema = [
  ...select(rows, { value: 'revenue', select: 'min' }),
  ...select(rows, { value: 'revenue', select: 'max' }),
]
```

## Stack rows or lay out a mark

Color or `z` series are stacked automatically by stack-capable marks. Use
`layout: stack(options)` to configure order or offset, and `layout: group()`
to place series side by side:

```ts
barY(rows, {
  x: 'quarter',
  y: 'revenue',
  color: 'product',
  layout: stack({ offset: 'normalize' }),
})
```

Use `stackRowsY` or `stackRowsX` when the endpoints are data: multiple marks
reuse them, a table needs them, or another transform consumes them.

```ts
const stacked = stackRowsY(rows, {
  x: 'quarter',
  y: 'revenue',
  z: 'product',
  offset: 'normalize',
})

rect(stacked, {
  x: 'x',
  y1: 'y1',
  y2: 'y2',
  color: 'z',
})
```

Both paths use the same stack engine and options.

## Custom composition

Ordinary function composition is usually enough:

```ts
const binned = binX(rows, { value: 'latency', thresholds: 20 })
const largest = select(binned, { value: 'value', select: 'max' })
```

`transformData` provides a small typed protocol when a reusable pipeline is
more convenient. Each stage receives `{ data, stage }` and returns an
iterable:

```ts
const activeValues = transformData(
  rows,
  ({ data }) => data.filter((row) => row.active),
  ({ data }) => data.map((row) => row.value),
)
```

## Memoize execution

Transforms are eager and deterministic. Memoize them through the owning
framework when the input reference is stable:

```tsx
function LatencyChart({ observations }: Props) {
  const histogram = useMemo(
    () => binX(observations, { value: 'latency', thresholds: 24 }),
    [observations],
  )

  const definition = useMemo(
    () =>
      defineChart({
        marks: [
          rect(histogram, {
            x1: 'x1',
            x2: 'x2',
            y1: () => 0,
            y2: 'value',
            inset: 1,
          }),
        ],
        x: { scale: scaleLinear },
        y: { scale: scaleLinear, nice: true },
      }),
    [histogram],
  )

  return <Chart definition={definition} ariaLabel="Request latency" />
}
```

Use `computed`, `createMemo`, `$derived`, or the equivalent primitive in other
frameworks. TanStack Charts does not add a second cache or reactive graph.

All helpers are available from `@tanstack/charts`. Granular paths such as
`@tanstack/charts/transform/bin` and `@tanstack/charts/transform/window` keep
specialized utilities independently importable.
