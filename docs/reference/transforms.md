---
title: Data Transforms
description: Public group, bin, window, normalize, select, stack-row, reducer, lineage, and custom transform contracts.
---

Transforms are eager functions from input rows to output rows. See
[Transforms and Reactivity](../guides/transforms-and-reactivity.md) for the
execution boundary, examples, and mark-layout distinction.

All functions and types are exported from `@tanstack/charts`. The package also
provides these granular entry points:

- `@tanstack/charts/transform`
- `@tanstack/charts/transform/bin`
- `@tanstack/charts/transform/group`
- `@tanstack/charts/transform/normalize`
- `@tanstack/charts/transform/select`
- `@tanstack/charts/transform/stack`
- `@tanstack/charts/transform/window`

## Functions

| Export                        | Result                                                    |
| ----------------------------- | --------------------------------------------------------- |
| `groupBy(source, options)`    | One `GroupByDatum` per key with named reducer outputs     |
| `binX(source, options)`       | `BinXDatum` rows with `x`, `x1`, and `x2`                 |
| `binY(source, options)`       | `BinYDatum` rows with `y`, `y1`, and `y2`                 |
| `window(source, options)`     | One `WindowDatum` per selected input position             |
| `normalize(source, options)`  | One `NormalizeDatum` per valid numeric input              |
| `select(source, options)`     | Selected original source rows                             |
| `stackRowsY(source, options)` | `StackRowsYDatum` rows with `y1` and `y2`                 |
| `stackRowsX(source, options)` | `StackRowsXDatum` rows with `x1` and `x2`                 |
| `transformData(source, …)`    | Output of one to four typed custom `DataTransform` stages |

`BinOptions`, `GroupByOptions`, `WindowOptions`, `NormalizeOptions`,
`SelectOptions`, `StackRowsXOptions`, and `StackRowsYOptions` describe the
corresponding author options. `BinKey`, `WindowKey`, and `NormalizeKey` derive
the output key type from `by`.

`NormalizeBasis` is `sum`, `max`, `extent`, `first`, or `last`.
`WindowAnchor` is `start`, `middle`, or `end`. `SelectMethod` is `first`,
`last`, `min`, or `max`.

## Accessors and reducers

`TransformValue<TDatum, TValue>` accepts a compatible `TransformField` or a
`TransformAccessor`. The accessor receives `TransformAccessorContext` with
`datum`, `index`, and `data`. `TransformValueOutput` extracts its result type.

`TransformOutputs`, `TransformOutputSpec`, and `TransformOutputRow` describe
named reducer outputs. `TransformNumericReducer` contains `count`, `sum`,
`mean`, `min`, and `max`. A custom `TransformReducer` receives
`TransformReduceContext` with numeric `values`, selected `data`, source
`indexes`, and the `TransformKey`. A transform key can be a chart value,
boolean, nullish value, or a readonly tuple of transform keys.

`NormalizeContext` and `SelectContext` provide equivalent operation-specific
object bags.

## Result and composition types

Aggregating results implement `TransformLineage`, which exposes readonly
`source` rows and `sourceIndexes`.

The public result types are `GroupByDatum`, `BinXDatum`, `BinYDatum`,
`WindowDatum`, `NormalizeDatum`, `StackRowsXDatum`, and `StackRowsYDatum`.

A custom `DataTransform<TInput, TOutput>` receives a `DataTransformContext`
with the current readonly `data` and zero-based `stage`, then returns an
iterable. `transformData` materializes each stage before invoking the next.
