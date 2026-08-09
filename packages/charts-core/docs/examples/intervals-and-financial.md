---
title: Intervals and Financial Charts
description: Compose timelines, uncertainty intervals, candlesticks, and percentile ribbons from explicit endpoints.
---

Interval charts answer where a span begins and ends. The endpoints may
represent time, uncertainty, a daily trading range, or a percentile envelope.
Model those meanings explicitly with `x1` and `x2` or `y1` and `y2`; do not
force intervals through a point-value channel.

## Choose the comparison

| Reader question                                               | Start with                                            |
| ------------------------------------------------------------- | ----------------------------------------------------- |
| How did each trading day move from open to close?             | Horizontal price interval                             |
| How uncertain is each point estimate?                         | Point plus low-high error bar                         |
| What were open, high, low, and close for each period?         | Candlestick                                           |
| How does a percentile range evolve over time?                 | Quantile ribbon plus median line                      |
| How do explicit lower and upper measurements change together? | Range area in [Lines and Areas](./lines-and-areas.md) |

The definition may receive endpoint fields directly or derive them from typed
reducer outputs. In either form, endpoint units must match the scale.
[Data and Channels](../concepts/data-and-channels.md) defines these interval
channel shapes.

## Compare open-to-close spans

This view maps each AAPL trading date to a categorical lane and its `Open` and
`Close` fields to a horizontal rectangle. Color distinguishes gains from
losses, while the endpoints carry the price movement directly.

<!-- ::chart-example id=13-interval-timeline height=480 -->

Keep trading dates stable and lane order explicit. Date labels rely on automatic
guide measurement; verify them at the smallest supported width with
[Responsive Charts](../guides/responsive-charts.md).

## Preserve uncertainty bounds

An error bar combines a point estimate, a low-high link, and endpoint ticks.
The chart renders the supplied interval; it does not decide whether the bounds
are standard deviation, standard error, a confidence interval, or a credible
interval.

```ts group=error-bar env=charts file=/src/chart.ts entry
import { defineChart, dot, link, tickY } from '@tanstack/charts'
import { scaleBand } from '@tanstack/charts/scales/band'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { estimates } from './data'

export default defineChart({
  marks: [
    link(estimates, {
      x1: 'treatment',
      y1: 'low',
      x2: 'treatment',
      y2: 'high',
      stroke: '#2563eb',
      strokeWidth: 1.5,
    }),
    tickY(estimates, {
      x: 'treatment',
      y: 'low',
      stroke: '#2563eb',
      strokeWidth: 1.5,
    }),
    tickY(estimates, {
      x: 'treatment',
      y: 'high',
      stroke: '#2563eb',
      strokeWidth: 1.5,
    }),
    dot(estimates, {
      x: 'treatment',
      y: 'estimate',
      key: 'treatment',
      fill: '#2563eb',
      r: 4,
    }),
  ],
  x: { scale: () => scaleBand<string>().padding(0.3) },
  y: {
    scale: scaleLinear,
    grid: true,
    axis: { label: 'Mean response (95% confidence interval)' },
  },
})
```

```ts group=error-bar file=/src/data.ts collapsed
export const estimates = [
  { treatment: 'Control', estimate: 42, low: 36, high: 48 },
  { treatment: 'Low dose', estimate: 51, low: 45, high: 57 },
  { treatment: 'High dose', estimate: 63, low: 56, high: 70 },
]
```

Name the interval in the chart description or surrounding prose. Compose the
link, caps, and point as separate layers using the
[Rules, Links, Arrows, Vectors, and Ticks reference](../reference/marks/rules-links-arrows-vectors-and-ticks.md)
and [Dot and Hexagon Marks](../reference/marks/dot-and-hexagon.md).

The [full catalog example](https://tanstack.com/charts/catalog/14-error-bars/)
starts with contributing observations, groups them once with `groupBy`, and
derives the interval from typed mean and sample-deviation outputs. The
estimator and singleton policy remain authored chart meaning; no dedicated
error-bar mark is required.

## Encode open, high, low, and close

A candlestick uses a high-low wick and an open-close body. Directional color is
secondary to the body endpoints and should not be the only way to distinguish
an increasing period from a decreasing one.

<!-- ::chart-example id=28-candlestick height=480 -->

Use one row per period with all four values. Render the wick as a link and the
body as a ranged rectangle; preserve missing trading periods on the temporal
domain instead of silently inventing observations.

## Show an interval over time

A quantile ribbon combines a prepared lower percentile, median, and upper
percentile for each time group. It shows how both location and spread evolve.

<!-- ::chart-example id=61-quantile-ribbon height=480 -->

Use `groupBy` with `quantile` reducers to preserve each time group's source
rows, then give the ribbon and median their own marks. [Transforms and
Reactivity](../guides/transforms-and-reactivity.md) defines the aggregation
boundary; [Line and Area Marks](../reference/marks/line-and-area.md) defines the
range-area channels.

## Production checks

- State what each endpoint means and whether the interval is inclusive.
- Use timezones and calendar boundaries intentionally for temporal spans.
- Keep interval semantics in data fields rather than inferring them from color
  or row order.
- Preserve exact values through a tooltip, table, or textual summary. See
  [Tooltips and Focus](../guides/tooltips-and-focus.md).
- Use semantic controls and application state when intervals become editable;
  see [Interactions and Selections](../guides/interactions-and-selections.md).
- Verify essential distinctions without color in
  [Accessibility](../guides/accessibility.md).

Rectangle channel details are in
[Bar and Rect Marks](../reference/marks/bar-and-rect.md).
