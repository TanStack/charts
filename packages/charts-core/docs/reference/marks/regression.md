---
title: Linear Regression Marks
description: Reference for eager linearRegressionRowsY/X data and linearRegressionY/X least-squares marks, confidence bands, grouping, sampling, lineage, and interaction.
---

`linearRegressionY` fits numeric y values over a numeric or temporal x channel.
`linearRegressionX` transposes the same semantics to fit numeric x values over
a numeric or temporal y channel. `linearRegressionRowsY` and
`linearRegressionRowsX` expose the sampled semantic rows directly.

```ts
import { linearRegressionY } from '@tanstack/charts/regression'

linearRegressionY(rows, {
  x: 'power',
  y: 'economy',
  ci: 0.95,
  stroke: '#dc2626',
})
```

The row transforms and both marks are also exported from `@tanstack/charts`
and `@tanstack/charts/universal`.

## Signatures

```ts
function linearRegressionY<TDatum>(
  source: Iterable<TDatum>,
  options: LinearRegressionYOptions<TDatum>,
): ChartMark<LinearRegressionYDatum<TDatum, InferredX>, InferredX, number>

function linearRegressionX<TDatum>(
  source: Iterable<TDatum>,
  options: LinearRegressionXOptions<TDatum>,
): ChartMark<LinearRegressionXDatum<TDatum, InferredY>, number, InferredY>

function linearRegressionRowsY<TDatum>(
  source: Iterable<TDatum>,
  options: LinearRegressionRowsYOptions<TDatum>,
): LinearRegressionYDatum<TDatum, InferredX>[]

function linearRegressionRowsX<TDatum>(
  source: Iterable<TDatum>,
  options: LinearRegressionRowsXOptions<TDatum>,
): LinearRegressionXDatum<TDatum, InferredY>[]
```

The independent channel accepts finite numbers or valid `Date` values. The
dependent channel is numeric. Nullish and non-finite observations are omitted.
Set `z` to fit one independent model per first-seen series.

## Fit and confidence semantics

Each group uses centered ordinary least squares. Centering avoids subtracting
large raw sums and keeps millisecond `Date` values stable. Groups with fewer
than two valid observations or no independent variance are omitted.

The confidence band describes the fitted mean, using a Student-t critical
value and residual degrees of freedom. `ci` defaults to `0.95`; set it to `0`
to omit the band. A two-point fit has no residual degrees of freedom, so it
renders the line without a band.

`samples` controls the number of evenly spaced values across the observed
semantic independent domain. It defaults to `64` and must be an integer of at
least two. This is deliberately not a pixel precision: changing chart size
does not change the model data or motion identity. Multiple samples also keep
the fitted path faithful when the independent scale is nonlinear.

## Eager rows

Use the row transforms when fitted values feed more than the convenience
mark:

```ts
import { linearRegressionRowsY } from '@tanstack/charts/regression'

const fitted = linearRegressionRowsY(rows, {
  x: 'date',
  y: 'value',
  z: 'series',
  samples: 32,
})
```

`x`, `y`, and `z` use the standard `TransformValue` contract. Accessors receive
`{ datum, index, data }`. The transform runs eagerly, does not mutate source
rows, omits invalid and unfittable groups, and returns only semantic samples
and lineage. `linearRegressionY` and `linearRegressionX` add presentation
identity when composing the confidence area and fitted line.

## Options

| Option            | Type                                                 | Default       | Meaning                                           |
| ----------------- | ---------------------------------------------------- | ------------- | ------------------------------------------------- |
| `id`              | `string`                                             | Layer-derived | Stable composite mark ID                          |
| `x`               | Orientation-specific `Channel`                       | Required      | Numeric dependent or number/Date independent data |
| `y`               | Orientation-specific `Channel`                       | Required      | Numeric dependent or number/Date independent data |
| `z`               | `Channel<TDatum, ChartKey?>`                         | One group     | Independent fit series                            |
| `ci`              | `number` in `[0, 1)`                                 | `0.95`        | Fitted-mean confidence level; `0` hides the band  |
| `samples`         | Integer                                              | `64`          | Semantic-domain samples per fit                   |
| `stroke`          | `string`                                             | Series color  | Regression-line paint                             |
| `strokeOpacity`   | `number`                                             | SVG default   | Regression-line opacity                           |
| `strokeWidth`     | `number`                                             | `1.5`         | Regression-line width                             |
| `strokeDasharray` | `string`                                             | None          | Regression-line dash pattern                      |
| `fill`            | `string`                                             | Line stroke   | Confidence-band paint                             |
| `fillOpacity`     | `number`                                             | `0.1`         | Confidence-band opacity                           |
| `motion`          | `ChartMotionDefinition<LinearRegression*Datum<...>>` | None          | Motion over derived samples                       |

## Derived data and lineage

Each interactive line sample contains its semantic independent value, fitted
value, optional confidence bounds, group, and aggregate lineage:

```ts
interface LinearRegressionYDatum<TDatum, TXValue> {
  x: TXValue
  y: number
  y1?: number
  y2?: number
  group: ChartKey | null
  source: readonly TDatum[]
  sourceIndexes: readonly number[]
}
```

`LinearRegressionXDatum` transposes these fields to `x`, optional `x1` and
`x2`, and independent `y`. Lineage contains only finite observations that
contributed to that group's fit, in source order.

The public option types are `LinearRegressionRowsYOptions`,
`LinearRegressionRowsXOptions`, `LinearRegressionYOptions`, and
`LinearRegressionXOptions`.

The confidence area and fitted line are ordinary `areaY`/`areaX` and
`lineY`/`lineX` children. Only the fitted line contributes interaction points;
the band is decorative. This prevents a tooltip or focus step from receiving
duplicate targets for the same fitted sample.
