---
title: Difference Marks
description: Reference for differenceY and differenceX comparison areas, exact crossings, grouping, gaps, lineage, styling, and interaction.
---

`differenceY` compares two numeric y channels along a numeric or temporal x
channel. It fills positive and negative lobes and draws both boundary lines.
`differenceX` transposes the same semantics to two numeric x channels along a
numeric or temporal y channel.

```ts
import { differenceY } from '@tanstack/charts/difference'

differenceY(rows, {
  x: 'date',
  y1: 'forecast',
  y2: 'actual',
  positiveFill: '#16a34a',
  negativeFill: '#dc2626',
})
```

Both marks are also exported from `@tanstack/charts` and
`@tanstack/charts/universal`.

## Signatures

```ts
function differenceY<TDatum>(
  source: Iterable<TDatum>,
  options: DifferenceYOptions<TDatum>,
): ChartMark<DifferenceDatum<TDatum, InferredX>, InferredX, number>

function differenceX<TDatum>(
  source: Iterable<TDatum>,
  options: DifferenceXOptions<TDatum>,
): ChartMark<DifferenceDatum<TDatum, InferredY>, number, InferredY>
```

For `differenceY`, `y1` is the comparison and `y2` is the primary value. A
positive lobe means `y2 > y1`; a negative lobe means `y2 < y1`.
`differenceX` applies the same rule to `x1` and `x2`.

The independent channel accepts finite numbers or valid `Date` values. One
mark input cannot mix the two kinds. The value channels accept numeric
constants or channels. Input order is path order; sort rows before creating the
mark when the semantic independent order differs from source order. Set `z` to
compare one pair of lines per first-seen group.

## Crossing and gap semantics

At every sign change, the mark maps both boundary segments through the final
x and y scales, solves their exact rendered crossing, and inverts that point
back to semantic values. The result remains exact with nonlinear log, power,
or symlog scales instead of assuming data-space interpolation is affine. Both
configured positional scales must support inversion.

The crossing belongs to both adjacent lobes, so the fills meet without overlap
or a gap. Consecutive equal values remain part of the neighboring lobe instead
of producing one-point areas.

A row with an invalid independent, comparison, or primary value creates the
same gap in both areas and both lines. Later valid rows begin new segments.
The mark composes ordinary `areaY`/`areaX` and `lineY`/`lineX` children; it does
not emit a case-specific path.

## Options

| Option                      | Type                                                 | Default         | Meaning                                          |
| --------------------------- | ---------------------------------------------------- | --------------- | ------------------------------------------------ |
| `id`                        | `string`                                             | Layer-derived   | Stable composite mark ID                         |
| `x` / `y`                   | Orientation-specific `Channel`                       | Required        | Numeric or temporal independent value            |
| `y1` / `x1`                 | `number \| Channel<TDatum, number?>`                 | Required        | Comparison boundary                              |
| `y2` / `x2`                 | `number \| Channel<TDatum, number?>`                 | Required        | Primary boundary                                 |
| `z`                         | `Channel<TDatum, ChartKey?>`                         | One group       | Independent comparison groups                    |
| `key`                       | `Channel<TDatum, ChartKey>`                          | Inferred        | Stable raw-row and derived-lobe identity         |
| `positiveFill`              | `VisualChannel<DifferenceAreaDatum, string> \| null` | `#3ca951`       | Positive-lobe paint; `null` omits the fill       |
| `negativeFill`              | `VisualChannel<DifferenceAreaDatum, string> \| null` | `#4269d0`       | Negative-lobe paint; `null` omits the fill       |
| `fillOpacity`               | `number`                                             | `0.2`           | Shared fill opacity                              |
| `positiveFillOpacity`       | `number`                                             | `fillOpacity`   | Positive-lobe opacity                            |
| `negativeFillOpacity`       | `number`                                             | `fillOpacity`   | Negative-lobe opacity                            |
| `stroke`                    | `VisualChannel<TDatum, string>`                      | `currentColor`  | Primary-line paint                               |
| `strokeOpacity`             | `number`                                             | SVG default     | Primary-line opacity                             |
| `strokeWidth`               | `number`                                             | `2.25`          | Primary-line width                               |
| `strokeDasharray`           | `string`                                             | None            | Primary-line dash pattern                        |
| `comparisonStroke`          | `VisualChannel<TDatum, string>`                      | `#64748b`       | Comparison-line paint                            |
| `comparisonStrokeOpacity`   | `number`                                             | `strokeOpacity` | Comparison-line opacity                          |
| `comparisonStrokeWidth`     | `number`                                             | `strokeWidth`   | Comparison-line width                            |
| `comparisonStrokeDasharray` | `string`                                             | None            | Comparison-line dash pattern                     |
| `points`                    | `boolean`                                            | `false`         | Draws points on both boundary lines              |
| `states`                    | `readonly ChartMarkState[]`                          | None            | Primary-line focus presentation                  |
| `comparisonStates`          | `readonly ChartMarkState[]`                          | None            | Comparison-line focus presentation               |
| `motion`                    | `ChartMotionDefinition<DifferenceDatum<...>>`        | None            | Motion over raw boundaries and derived area rows |

The orientation determines the exact channel types. Use `DifferenceYOptions`
or `DifferenceXOptions` when naming an options object separately. The two fill
channels receive derived area rows; the line paint and state channels receive
the original source rows.

## Derived data and lineage

Area children receive `DifferenceAreaDatum` rows:

```ts
interface DifferenceAreaDatum<TDatum, TIndependent> {
  kind: 'difference-area'
  independent: TIndependent
  comparison: number
  primary: number
  sign: 'positive' | 'negative'
  segment: string
  crossing: boolean
  markKey: ChartKey
  source: readonly TDatum[]
  sourceIndexes: readonly number[]
}

type DifferenceDatum<TDatum, TIndependent> =
  TDatum | DifferenceAreaDatum<TDatum, TIndependent>
```

The public type surface also includes `DifferenceIndependent` and
`DifferenceSign`.

An original area point retains its source row and index. An interpolated
crossing retains both adjacent source rows and indexes. `segment` and
`markKey` derive from stable group and source-boundary identity, so prepending
an unrelated lobe does not rename later geometry.

## Interaction

The positive and negative areas are decorative. The comparison and primary
lines each contribute interaction points that retain the original source-row
identity. Their child mark IDs end in `:comparison` and `:primary`, allowing a
tooltip or selection handler to distinguish the two values without receiving
synthetic crossing rows.

Set either fill to `null` to render one-sided emphasis. Set both to `null` to
retain the two interactive boundary lines without areas.
