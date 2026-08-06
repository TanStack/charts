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

## Add a linear regression

Pass the observations directly to `linearRegressionY`. The mark owns the
least-squares fit, semantic-domain samples, optional confidence band, and
aggregate source lineage. Keep the dot layer separate so each observation
remains independently focusable.

<iframe
  src="https://tanstack.com/charts/catalog/embed/31-linear-regression/?theme=system&height=480"
  title="Scatterplot with a linear regression mark built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

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

<iframe
  src="https://tanstack.com/charts/catalog/embed/56-connected-scatter/?theme=system&height=480"
  title="Chronologically connected scatterplot with direction cues built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

Without an explicit order, connecting points invents a relationship. Keep the
path, arrow, selected labels, and points as separate layers so each can use the
same scales without sharing renderer-specific state.

## Compare each observation with its predecessor

A lag plot moves time out of the axis and into data preparation. Each point
pairs a current value with the previous value; an identity rule shows where
those values would be equal.

<iframe
  src="https://tanstack.com/charts/catalog/embed/60-lag-autocorrelation/?theme=system&height=480"
  title="Lag-one autocorrelation scatterplot with an identity reference built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

Make the lag length explicit and decide how the first observation is handled.
The chart should receive the resulting pairs rather than conceal the shift
inside a mark.

## Separate visible cells from nearest-point focus

Voronoi cells make each point's nearest region visible. The optional `voronoi`
mark paints those cells but deliberately adds no focus candidates. A layered
`dot` mark remains the semantic source for pointer focus, keyboard navigation,
and tooltips.

<iframe
  src="https://tanstack.com/charts/catalog/embed/65-voronoi-nearest-tooltip/?theme=system&height=480"
  title="Scatterplot with two-dimensional nearest-point focus built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

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
