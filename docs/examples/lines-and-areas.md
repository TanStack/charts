---
title: Lines and Areas
description: Choose and compose line, range-area, rolling-statistic, and annotation patterns for ordered data.
---

Lines answer how a value changes across an ordered domain. Areas add a second
meaning: distance from a baseline or the span between two boundaries. Use that
extra area only when the reader should compare magnitude, accumulation, or an
interval—not merely because a filled chart looks stronger.

## Choose the comparison

| Reader question                                          | Start with                                                                                  |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| How does one measure change over time?                   | One line with an explicit temporal scale                                                    |
| How do several measures change together?                 | Several lines with direct labels or a legend                                                |
| What is the local trend after reducing short-term noise? | A raw line plus a clearly named rolling statistic                                           |
| What range surrounds a central estimate?                 | An area with explicit lower and upper channels                                              |
| Which observations deserve explanation?                  | A line plus selected text, dots, rules, or bands                                            |
| How does composition change over time?                   | A stacked or normalized area in [Stacked and Composed Charts](./stacked-and-composition.md) |

The x domain must have a meaningful order. Do not connect nominal categories
just because they appear in an array.

## Compare several series from a common baseline

Indexing each series to its first observation compares relative change when the
original magnitudes are not directly comparable. Direct end labels reduce the
work of matching line colors to a separate legend.

<iframe
  src="https://tanstack.com/charts/catalog/embed/55-indexed-multi-line/?theme=system&height=480"
  title="Indexed multi-series performance lines with direct end labels built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

Prepare the indexed values in the application, state the baseline, and retain
the original values for exact-value disclosure. Use a stable series channel so
color, path grouping, focus, and updates agree on identity.
[Data and Channels](../concepts/data-and-channels.md) covers series grouping,
while [Legends and Color](../guides/legends-and-color.md) explains when a
separate legend is the better choice.

## Show a derived trend honestly

A moving average is a derived series, not a visual curve setting. Prepare the
rolling values in the application, keep the original time domain, and name the
window in surrounding text or a legend.

<iframe
  src="https://tanstack.com/charts/catalog/embed/19-moving-average-line/?theme=system&height=480"
  title="Multi-series moving-average time chart built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

Changing interpolation only changes the path between observations. It does not
perform smoothing or create evidence between samples. Route rolling windows,
grouping, and curve selection through
[Scales and D3](../concepts/scales-and-d3.md).

## Add context with an interval

A Bollinger band combines a rolling center line with an interval derived from
local variation. The band is context for the observed series; it is not a
confidence interval unless the underlying calculation actually defines one.

<iframe
  src="https://tanstack.com/charts/catalog/embed/22-bollinger-band/?theme=system&height=480"
  title="Time-series line with a Bollinger volatility band built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

Represent the interval with explicit lower and upper channels. This keeps range
geometry independent from the line and lets each layer use its natural prepared
rows. See [Line and Area Marks](../reference/marks/line-and-area.md) for the
channel contracts.

## Annotate selected observations

Annotations should explain a small number of meaningful points. Selecting the
minimum and maximum in data preparation makes the intent auditable and avoids
placing a text label on every observation.

<iframe
  src="https://tanstack.com/charts/catalog/embed/58-select-extrema/?theme=system&height=480"
  title="Time-series line with selected minimum and maximum annotations built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

Layer dots and text over the same scales rather than baking labels into a line
renderer. [Marks and Layering](../concepts/marks-and-layering.md) explains why
separate layers remain easier to update and extend.

## Production checks

- Preserve missing values when a gap is meaningful. The
  [Quick Start](../quick-start.md) demonstrates an explicit line gap.
- Use a temporal scale for dates and define the domain in application data
  semantics, as described in
  [Scales and D3](../concepts/scales-and-d3.md).
- Preserve row IDs or unique positions across updates, and group series with
  `z`; supply `key` only when the mark cannot infer identity. See
  [Dynamic Data and Animation](../guides/dynamic-data-and-animation.md).
- Let automatic layout measure tick labels, then verify the smallest container
  in [Responsive Charts](../guides/responsive-charts.md).
- Use position, labels, or line treatment in addition to color when a
  distinction is essential. See [Accessibility](../guides/accessibility.md).
