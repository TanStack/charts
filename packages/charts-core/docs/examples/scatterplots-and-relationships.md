---
title: Scatterplots and Relationships
description: Choose scatterplot, regression, connected-path, lag, and nearest-point patterns for quantitative relationships.
---

Scatterplots answer how two quantitative measures vary together. Position
carries the primary evidence. Color, radius, a fitted line, or chronological
connections should add one clearly stated dimension rather than compete with
that relationship.

## Choose the comparison

| Reader question                                                 | Start with                                  |
| --------------------------------------------------------------- | ------------------------------------------- |
| Do two quantitative measures move together?                     | A scatterplot                               |
| What linear tendency summarizes that relationship?              | Scatterplot plus `linearRegressionY`        |
| How does the relationship evolve in a known order?              | A connected scatterplot                     |
| Does a series depend on its previous observation?               | A lag plot                                  |
| Which dense point is closest to the pointer or keyboard cursor? | A scatterplot with a spatial focus strategy |

Do not infer causation from proximity or a fitted trend. Show the model and
preparation only when they answer the stated question.

## Start with two quantitative measures

A plain scatterplot should establish the relationship before adding a fitted
model, chronology, or spatial partition.

```ts group=basic-scatter env=charts file=/src/chart.ts entry
import { defineChart, dot } from '@tanstack/charts'
import { scaleLinear } from '@tanstack/charts-scales/linear'

const rows = [
  { temperature: 12, sales: 18 },
  { temperature: 16, sales: 25 },
  { temperature: 20, sales: 31 },
  { temperature: 24, sales: 46 },
  { temperature: 29, sales: 52 },
  { temperature: 32, sales: 61 },
]

const chart = defineChart({
  marks: [
    dot(rows, {
      x: 'temperature',
      y: 'sales',
      r: 5,
      fill: '#2563eb',
    }),
  ],
  x: {
    scale: scaleLinear,
    grid: true,
    axis: { label: 'Temperature (°C)' },
  },
  y: {
    scale: scaleLinear,
    grid: true,
    axis: { label: 'Daily sales' },
  },
})

export default chart
```

## Add a linear regression

Pass the observations directly to `linearRegressionY`. The mark owns the
least-squares fit, semantic-domain samples, optional confidence band, and
aggregate source lineage. Keep the dot layer separate so each observation
remains independently focusable.

<!-- ::chart-example id=31-linear-regression height=480 -->

Set `ci: 0` when only the fitted line is needed. The default `0.95` band uses a
Student-t interval for the fitted mean. See the
[linear regression mark](../reference/marks/regression.md) for grouping,
sampling, and degenerate-fit behavior.
The dot layer still preserves every observation while the regression mark owns
only its derived model geometry.

## Connect observations only when order matters

A connected scatterplot turns sequence into a path through two-dimensional
measure space. Chronological labels and direction arrows make that additional
ordering visible.

<!-- ::chart-example id=56-connected-scatter height=480 -->

Without an explicit order, connecting points invents a relationship. Keep the
path, arrow, selected labels, and points as separate layers so each can use the
same scales without sharing renderer-specific state.

## Compare each observation with its predecessor

A lag plot moves time out of the axis and into data preparation. Each point
pairs a current value with the previous value; an identity rule shows where
those values would be equal.

<!-- ::chart-example id=60-lag-autocorrelation height=480 -->

Make the lag length explicit and decide how the first observation is handled.
The chart should receive the resulting pairs rather than conceal the shift
inside a mark.

## Separate visible cells from nearest-point focus

Voronoi cells make each point's nearest region visible. The optional `voronoi`
mark paints those cells but deliberately adds no focus candidates. A layered
`dot` mark remains the semantic source for pointer focus, keyboard navigation,
and tooltips.

<!-- ::chart-example id=65-voronoi-nearest-tooltip height=480 -->

See the [`voronoi` mark](../reference/marks/voronoi.md) for final-screen cell
geometry and stable identity. [Tooltips and Focus](../guides/tooltips-and-focus.md)
defines the focus and formatting model. Use a `ChartSpatialIndexFactory` when
lookup performance matters but the cells should not be painted.

## Production checks

- Use quantitative scales with intentional domains on both axes. Use a
  logarithmic scale only when multiplicative distance is the intended reading;
  see [Scales](../concepts/scales-and-d3.md).
- Map magnitude through an area-preserving radial scale when point size carries
  a third quantitative value.
- Control opacity or aggregate spatially before thousands of overlapping dots
  obscure the distribution. See [Large Data](../guides/large-data.md).
- Keep lag pairs in data preparation. Keep lookup-only spatial indexes in
  interaction capabilities; use `voronoi` only when cells are part of the
  visible encoding.
- Provide keyboard-equivalent focus and a textual value path, as described in
  [Accessibility](../guides/accessibility.md).

The channel and styling contracts for points are in
[Dot and Hexagon Marks](../reference/marks/dot-and-hexagon.md).
