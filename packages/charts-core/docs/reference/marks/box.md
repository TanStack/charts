---
title: Box Marks
description: Reference for boxY and boxX Tukey summaries, quartiles, whiskers, outliers, lineage, styling, and interaction.
---

`boxY` summarizes raw observations into vertical boxplots. `boxX` transposes
the same statistical and interaction semantics into horizontal boxplots.

```ts
import { boxY } from '@tanstack/charts/box'

boxY(rows, {
  x: 'group',
  y: 'value',
  key: 'id',
  fill: '#bfdbfe',
  stroke: '#2563eb',
})
```

Both marks are also exported from `@tanstack/charts` and
`@tanstack/charts/universal`.

## Signatures

```ts
function boxY<TDatum>(
  source: Iterable<TDatum>,
  options: BoxYOptions<TDatum>,
): ChartMark<BoxDatum<TDatum, InferredX>, InferredX, number>

function boxX<TDatum>(
  source: Iterable<TDatum>,
  options: BoxXOptions<TDatum>,
): ChartMark<BoxDatum<TDatum, InferredY>, number, InferredY>
```

`boxY` requires a categorical `x` channel and numeric `y` channel. `boxX`
requires numeric `x` and categorical `y`.

## Summary semantics

For each non-null category, the mark:

1. keeps finite numeric observations;
2. computes linearly interpolated first quartile, median, and third quartile;
3. places Tukey fences at 1.5 times the interquartile range below and above
   the box;
4. uses the lowest and highest observed values inside those fences as
   whiskers; and
5. emits observations strictly outside the fences as outliers.

Categories retain first-seen order. Outliers retain their global source order,
including when category rows are interleaved. A category with no finite value
is omitted. Singleton, two-value, and zero-IQR groups use the same rules rather
than a separate fallback.

The mark composes a whisker link, interquartile bar, median tick, and outlier
dots. Those native children remain renderer-neutral; the mark does not emit a
custom SVG path.

## Options

| Option          | Type                                                                   | Default        | Meaning                                                       |
| --------------- | ---------------------------------------------------------------------- | -------------- | ------------------------------------------------------------- |
| `id`            | `string`                                                               | Layer-derived  | Stable parent mark ID                                         |
| `x`             | `boxY: Channel<TDatum, ChartValue?>`; `boxX: Channel<TDatum, number?>` | Required       | Category for `boxY`; finite observation for `boxX`            |
| `y`             | `boxY: Channel<TDatum, number?>`; `boxX: Channel<TDatum, ChartValue?>` | Required       | Finite observation for `boxY`; category for `boxX`            |
| `key`           | `Channel<TDatum, ChartKey>`                                            | Inferred       | Stable raw-observation identity, including duplicate outliers |
| `fill`          | `string`                                                               | `#ccc`         | Interquartile box fill                                        |
| `fillOpacity`   | `number`                                                               | SVG default    | Interquartile box fill opacity                                |
| `stroke`        | `string`                                                               | `currentColor` | Whisker, median, and outlier stroke                           |
| `strokeOpacity` | `number`                                                               | SVG default    | Whisker, median, and outlier stroke opacity                   |
| `strokeWidth`   | `number`                                                               | Per child      | Overrides whisker, median, and outlier widths together        |
| `inset`         | `number`                                                               | `0`            | Pixels removed from both categorical edges of box and median  |
| `r`             | `number`                                                               | `3`            | Outlier radius in pixels                                      |
| `motion`        | `ChartMotionDefinition<BoxDatum<...>>`                                 | None           | Motion for derived summary and outlier data                   |

The orientation determines the exact `x` and `y` channel types; the combined
row above is shorthand. Use `BoxYOptions` or `BoxXOptions` when naming an
options object separately.

## Derived data and lineage

The chart datum is a discriminated union:

```ts
type BoxDatum<TDatum, TCategory> =
  | {
      kind: 'summary'
      category: TCategory
      q1: number
      median: number
      q3: number
      whiskerLow: number
      whiskerHigh: number
      count: number
      source: readonly TDatum[]
      sourceIndexes: readonly number[]
    }
  | {
      kind: 'outlier'
      category: TCategory
      value: number
      source: readonly [TDatum]
      sourceIndexes: readonly [number]
    }
```

Use `datum.kind` in tooltip, motion, or selection code. Summary lineage contains
every finite contributing observation in source order. An outlier retains its
exact source row and index.

The public type surface includes `BoxDatum`, `BoxYDatum`, `BoxXDatum`,
`BoxSummaryDatum`, `BoxOutlierDatum`, `BoxYOptions`, and `BoxXOptions`.

## Interaction

Each category contributes one summary point owned by the box body and anchored
at the median. The whisker and median tick are decorative. Each outlier dot
contributes its own point and raw-row lineage. This keeps pointer, keyboard,
tooltip, and motion behavior from receiving duplicate summary targets for the
same category.

Supply `key` when observation identity matters across updates or when duplicate
outlier values can occur in one category.
