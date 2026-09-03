---
title: Waffle Marks
description: Reference for responsive waffleY and waffleX unit layouts, cumulative rounding, color, source identity, and interaction.
---

`waffleY` and `waffleX` divide nonnegative source values into equal visual
units. They pack directly inside the final chart bounds, so no positional
scales or application-owned cell expansion are required.

```ts
import { waffleX, waffleY } from '@tanstack/charts/waffle'

const mark = waffleY(rows, {
  y: 'share',
  color: 'category',
  unit: 0.01,
  round: true,
  gap: 2,
  radius: 2,
})
```

Both marks are also exported from `@tanstack/charts` and
`@tanstack/charts/universal`.

## Orientation

`waffleY` treats `y` as each source row's contribution. Units advance
left-to-right, then bottom-to-top. `waffleX` transposes the contract: `x`
contains the contribution and units advance bottom-to-top, then left-to-right.

```ts
function waffleY<TDatum>(
  source: Iterable<TDatum>,
  options: WaffleYOptions<TDatum>,
): ChartMark<TDatum, ChartKey, number, never, never>

function waffleX<TDatum>(
  source: Iterable<TDatum>,
  options: WaffleXOptions<TDatum>,
): ChartMark<TDatum, number, ChartKey, never, never>
```

## Options

`WaffleOptions<TDatum>` contains the shared identity, unit, paint, state, and
motion fields. `WaffleYOptions<TDatum>` adds `y` and `columns`;
`WaffleXOptions<TDatum>` adds `x` and `rows`.

| Option                                            | Type                                       | Default          | Meaning                                                    |
| ------------------------------------------------- | ------------------------------------------ | ---------------- | ---------------------------------------------------------- |
| `y`                                               | `Channel<TDatum, number?>`                 | Required by Y    | Contribution encoded by `waffleY`                          |
| `x`                                               | `Channel<TDatum, number?>`                 | Required by X    | Contribution encoded by `waffleX`                          |
| `unit`                                            | `number`                                   | `1`              | Semantic value represented by one complete cell            |
| `round`                                           | `boolean`                                  | `false`          | Round cumulative unit boundaries before allocating cells   |
| `columns`                                         | `number`                                   | Responsive       | Fixed cells per row for `waffleY`                          |
| `rows`                                            | `number`                                   | Responsive       | Fixed cells per column for `waffleX`                       |
| `gap`                                             | `number`                                   | `1`              | Empty pixels between complete cells                        |
| `radius`                                          | `number`                                   | None             | Corner radius for complete cells                           |
| `id`                                              | `string`                                   | Layer-derived    | Stable mark ID                                             |
| `z`                                               | `Channel<TDatum, ChartKey?>`               | No group         | Interaction group; color fallback when omitted             |
| `color`                                           | `Channel<TDatum, ChartKey?>`               | `z`              | Value sent to the chart color scale                        |
| `key`                                             | `Channel<TDatum, ChartKey>`                | Inferred         | Stable source-row identity                                 |
| `fill`, `stroke`                                  | `VisualChannel<TDatum, string>`            | Resolved color   | Per-row paint overrides                                    |
| `fillOpacity`, `strokeOpacity`, and `strokeWidth` | `number`                                   | Renderer default | Cell presentation                                          |
| `states`                                          | `readonly ChartMarkState[]`                | None             | Focus-driven rectangle styles applied to every source tile |
| `motion`                                          | `ChartMarkMotionOptions<TDatum>['motion']` | None             | Per-tile motion policy                                     |

`unit` must be positive and finite. Contributions must be nonnegative and
finite; nullish and nonfinite channel values are omitted. Fixed `columns` or
`rows` must be positive integers, and `gap` must be nonnegative.

## Unit boundaries

The mark allocates each row against cumulative values. With `unit: 0.01`, a
complete cell represents one percentage point. With `round: true`, cumulative
boundaries are rounded, so the complete allocation preserves the rounded total
without independently rounding every category.

When `round` is false, a category boundary may divide one cell. Each category
receives its exact fractional rectangle and the adjacent fragments meet without
an added gap. `radius` applies only to complete cells.

## Responsive packing

Without `columns` or `rows`, the mark chooses a square-cell grid from the final
plot bounds after margins and legends resolve. It may change the number of rows
or columns when the chart resizes while preserving source order and keys. Set
`columns` on `waffleY` or `rows` on `waffleX` when the grid count is part of the
chart's meaning, such as a fixed ten-by-ten percentage display.

## Source identity and interaction

Cell expansion is internal. Each visible source row contributes one interaction
point, and every complete or fractional tile for that row references the same
original datum and datum index. The quantitative point value remains the row's
contribution; cumulative start and end values are exposed as its interval.

Color-domain inference uses the original source rows, including a category that
rounds to zero visible cells. This keeps an explicitly meaningful category in a
legend without manufacturing a rendered interaction point.
