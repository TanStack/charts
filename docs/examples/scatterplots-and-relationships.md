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
| What linear tendency summarizes that relationship?              | Scatterplot plus a prepared regression line |
| How does the relationship evolve in a known order?              | A connected scatterplot                     |
| Does a series depend on its previous observation?               | A lag plot                                  |
| Which dense point is closest to the pointer or keyboard cursor? | A scatterplot with a spatial focus strategy |

Do not infer causation from proximity or a fitted trend. Show the model and
preparation only when they answer the stated question.

## Add a prepared regression

A fitted line is derived data. Calculate its coefficients in the application,
then render the raw observations and fitted endpoints as independent layers.

<iframe
  src="https://tanstack.com/charts/catalog/embed/31-linear-regression/?theme=system&height=480"
  title="Scatterplot with a prepared linear regression line built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

This separation lets the dot layer preserve every observation while the line
layer consumes only the model output. See
[Marks and Layering](../concepts/marks-and-layering.md) for composition and
[Scales and D3](../concepts/scales-and-d3.md) for the application-owned
statistics boundary.

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

## Use spatial focus for dense points

Nearest-point interaction should use two-dimensional distance when both axes
matter. A spatial index can make that lookup efficient without changing the
dot grammar or storing tooltip state inside the mark.

<iframe
  src="https://tanstack.com/charts/catalog/embed/65-voronoi-nearest-tooltip/?theme=system&height=480"
  title="Scatterplot with two-dimensional nearest-point focus built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

[Tooltips and Focus](../guides/tooltips-and-focus.md) defines the focus and
formatting model. Use [Interactions and Selections](../guides/interactions-and-selections.md)
when focused data also changes application state.

## Production checks

- Use quantitative scales with intentional domains on both axes. Use a
  logarithmic scale only when multiplicative distance is the intended reading;
  see [Scales and D3](../concepts/scales-and-d3.md).
- Map magnitude through an area-preserving radial scale when point size carries
  a third quantitative value.
- Control opacity or aggregate spatially before thousands of overlapping dots
  obscure the distribution. See [Large Data](../guides/large-data.md).
- Keep regression, lag pairs, and spatial indexes in data preparation or
  interaction capabilities rather than the dot mark.
- Provide keyboard-equivalent focus and a textual value path, as described in
  [Accessibility](../guides/accessibility.md).

The channel and styling contracts for points are in
[Dot and Hexagon Marks](../reference/marks/dot-and-hexagon.md).
