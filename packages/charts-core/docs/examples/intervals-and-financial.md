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

The chart should receive prepared endpoint fields with units that match the
scale. [Data and Channels](../concepts/data-and-channels.md) defines these
interval channel shapes.

## Compare open-to-close spans

This view maps each AAPL trading date to a categorical lane and its `Open` and
`Close` fields to a horizontal rectangle. Color distinguishes gains from
losses, while the endpoints carry the price movement directly.

<iframe
  src="https://tanstack.com/charts/catalog/embed/13-interval-timeline/?theme=system&height=480"
  title="Apple daily open-to-close price intervals with gain and loss colors"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

Keep trading dates stable and lane order explicit. Date labels rely on automatic
guide measurement; verify them at the smallest supported width with
[Responsive Charts](../guides/responsive-charts.md).

## Preserve uncertainty bounds

An error bar combines a point estimate, a low-high link, and endpoint ticks.
The chart renders the supplied interval; it does not decide whether the bounds
are standard deviation, standard error, a confidence interval, or a credible
interval.

<iframe
  src="https://tanstack.com/charts/catalog/embed/14-error-bars/?theme=system&height=480"
  title="Categorical point estimates with low-high error bars built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

Name the interval in the chart description or surrounding prose. Compose the
link, caps, and point as separate layers using the
[Rules, Links, Arrows, Vectors, and Ticks reference](../reference/marks/rules-links-arrows-vectors-and-ticks.md)
and [Dot and Hexagon Marks](../reference/marks/dot-and-hexagon.md).

## Encode open, high, low, and close

A candlestick uses a high-low wick and an open-close body. Directional color is
secondary to the body endpoints and should not be the only way to distinguish
an increasing period from a decreasing one.

<iframe
  src="https://tanstack.com/charts/catalog/embed/28-candlestick/?theme=system&height=480"
  title="Open-high-low-close candlestick chart built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

Use one row per period with all four values. Render the wick as a link and the
body as a ranged rectangle; preserve missing trading periods on the temporal
domain instead of silently inventing observations.

## Show an interval over time

A quantile ribbon combines a prepared lower percentile, median, and upper
percentile for each time group. It shows how both location and spread evolve.

<iframe
  src="https://tanstack.com/charts/catalog/embed/61-quantile-ribbon/?theme=system&height=480"
  title="Time-varying percentile ribbon with a median line built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

Prepare quantiles by time group in the application, then give the ribbon and
median their own marks. [Scales and D3](../concepts/scales-and-d3.md) explains
the preparation boundary; [Line and Area Marks](../reference/marks/line-and-area.md)
defines the range-area channels.

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
