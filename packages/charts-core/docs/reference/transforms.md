---
title: Data Transforms
description: Typed, eager transforms for reusable application data.
---

Transforms are ordinary functions: rows in, rows out. They do not rewrite mark
options, retain state, cache results, or own framework reactivity.

## Functions

| Export                     | Result                                                   |
| -------------------------- | -------------------------------------------------------- |
| `groupBy`                  | Named group fields, reducer outputs, and lineage         |
| `binX`, `binY`             | Numeric intervals on one axis                            |
| `binXY`                    | Numeric cells with x and y intervals                     |
| `binTimeX`, `binTimeY`     | Calendar-aligned intervals from a supplied time interval |
| `window`                   | Flat input rows extended with rolling outputs            |
| `cumulative`               | Flat input rows extended with running outputs            |
| `rank`                     | Flat input rows extended with ranks                      |
| `normalize`                | Flat input rows extended with normalized values          |
| `select`                   | Selected original rows                                   |
| `stackRowsX`, `stackRowsY` | Flat input rows extended with stack endpoints            |
| `quantile`                 | A reusable quantile reducer factory                      |

Granular entry points are:

- `@tanstack/charts/transform`
- `@tanstack/charts/transform/bin`
- `@tanstack/charts/transform/bin-time`
- `@tanstack/charts/transform/bin-xy`
- `@tanstack/charts/transform/cumulative`
- `@tanstack/charts/transform/group`
- `@tanstack/charts/transform/normalize`
- `@tanstack/charts/transform/rank`
- `@tanstack/charts/transform/reduce`
- `@tanstack/charts/transform/select`
- `@tanstack/charts/transform/stack`
- `@tanstack/charts/transform/window`

Numeric, two-dimensional, and calendar bins are separate so specialized
binning does not enlarge an ordinary histogram.

Numeric `thresholds` accepts a count, complete boundary array, or a
D3-compatible threshold callback such as `thresholdScott`.

## Group fields

`by: 'region'` preserves the field name in the result. Compound groups use a
named object:

```ts
const daily = groupBy(orders, {
  by: {
    region: 'region',
    day: ({ datum }) => utcDay.floor(datum.createdAt),
  },
  outputs: {
    revenue: { value: 'amount', reduce: 'sum' },
    orders: { reduce: 'count' },
  },
})
```

The result contains `region` and `day`, not an opaque `key` or tuple.

## Reducers

Every output names its reducer. `count` omits `value`; numeric reducers require
it. Compact built-in strings are `count`, `sum`, `mean`, `min`, and `max`.
Tree-shakeable reducer functions provide `median`, `variance`, `deviation`,
`first`, `last`, `difference`, and `ratio` without adding them to every
aggregation bundle.

Custom reducers receive one object with `values`, selected `data`, source
`indexes`, and the named `group` object. `quantile(probability)` returns a
custom reducer.

Empty `count` and `sum` results are zero. Other empty numeric results are
`NaN`.

## Ordering and flat rows

`window` and `cumulative` accept `orderBy` and ascending or descending `order`.
Input order is used when `orderBy` is omitted. `rank` orders by its `value` and
supports competition, dense, and ordinal ties.

One-to-one transforms spread the input row and add named outputs:

```ts
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

There is no nested `datum.datum` path. A named output may intentionally replace
an input field; the original rows remain available through lineage. Structural
`source` and `sourceIndexes` names are reserved.

## Lineage

Aggregations expose `source` and `sourceIndexes`. Row-extending transforms
expose the source rows used for that derived value. This supports inspection,
tooltips, drill-down, and subsequent transforms without renderer knowledge.

See [Transforms and Reactivity](../guides/transforms-and-reactivity.md) for
composition and memoization guidance.

## Types

Value and grouping contracts are `TransformAccessor`,
`TransformAccessorContext`, `TransformField`, `TransformValue`,
`TransformValueOutput`, `TransformKey`, `TransformGroupSpec`,
`TransformGroupRow`, `TransformOrder`, `TransformOrderOptions`, and
`TransformLineage`.

Reducer contracts are `TransformNumericReducer`, `TransformReducer`,
`TransformReduceContext`, `TransformOutputSpec`, `TransformOutputs`,
`TransformOutputValue`, and `TransformOutputRow`.

Group exports are `GroupByOptions` and `GroupByDatum`. Numeric bin exports are
`BinOptions`, `BinXDatum`, and `BinYDatum`. Two-dimensional bin exports are
`BinXYOptions` and `BinXYDatum`. Calendar bin exports are `TimeIntervalLike`,
`BinTimeOptions`, and `BinTimeDatum`.

Rolling exports are `WindowOptions`, `WindowDatum`, and `WindowAnchor`.
Cumulative exports are `CumulativeOptions` and `CumulativeDatum`. Rank exports
are `RankOptions`, `RankDatum`, and `RankTies`.

Normalization exports are `NormalizeOptions`, `NormalizeDatum`,
`NormalizeBasis`, and `NormalizeContext`. Selection exports are
`SelectOptions`, `SelectMethod`, and `SelectContext`. Row-stack exports are
`StackRowsXOptions`, `StackRowsXDatum`, `StackRowsYOptions`, and
`StackRowsYDatum`.
