---
title: Heatmaps and Densities
description: Choose quantitative matrix cells, contours, or hexagonal bins to show concentration across two dimensions.
---

Heatmaps and density charts answer where values concentrate across two
dimensions. A matrix uses explicit row and column categories or intervals.
Contours summarize a regular scalar grid or an estimated point field; spatial
bins summarize local observations. Choose the representation that preserves
the question instead of defaulting to one color per raw observation.

## Choose the comparison

| Reader question                                               | Start with                  |
| ------------------------------------------------------------- | --------------------------- |
| How does daily activity vary by week and weekday?             | Token use calendar heatmap  |
| How many observations fall in each quantitative x-y interval? | Binned quantitative heatmap |
| What regions of a regular scalar grid cross selected levels?  | Scalar-grid contours        |
| What smooth regions enclose similar point density?            | Density contours            |
| Where are dense clusters while retaining local bin shape?     | Hexagonal bins              |
| What value belongs to each pair of named categories?          | An ordinal cell matrix      |

[Data and Channels](../concepts/data-and-channels.md) explains interval and
color channels. [Legends and Color](../guides/legends-and-color.md) covers
continuous color meaning and accessible legend design.

## Bin events into a calendar

A contribution-style calendar exposes both long-term activity and weekday
rhythm without drawing one long daily time axis. This example aggregates raw,
session-level token events into a complete twelve-month UTC day domain, then
maps Sunday weeks to columns and weekdays to rows.

<!-- ::chart-example id=118-token-usage-calendar height=480 -->

The example uses `binTimeX` with D3's `utcDay` interval and an explicit
twelve-month domain. Each output row contains the day interval, the summed token
count, the session count, and source lineage. Empty bins become real zero-value
days and share one consistent neutral treatment.

Calendar placement is a second, explicit step: `utcSunday.count` produces the
week column and `date.getUTCDay()` selects the row. A categorical usage scale
creates contribution-style levels, while the accessible chart description and
cell color explain the zero-to-high usage range. The compact focus tooltip keeps
the visible detail to the exact token total and date. Keep all calendar
calculations in one time basis—UTC here—to avoid moving events between days
around daylight-saving transitions.

## Aggregate into quantitative cells

A two-dimensional binned heatmap makes density bounded: the number of rendered
cells depends on the chosen grid, not directly on the number of raw points.

<!-- ::chart-example id=24-quantitative-binned-heatmap height=480 -->

Prepare explicit x and y interval endpoints plus the aggregate value. Use
thresholds that are stable across comparable views and a color domain that
states whether absolute count or normalized density is being shown. See
[Scales](../concepts/scales-and-d3.md) for binning and scale ownership.

## Trace levels through a scalar grid

A scalar-grid contour shows where a sampled field crosses chosen values. The
input is a regular row-major grid rather than a set of x/y observations.

<!-- ::chart-example id=38-contour-topography height=480 -->

The optional [`contour` mark](../reference/marks/contour.md) accepts the raw
grid, dimensions, value channel, and levels. It owns marching-squares topology
and structured polygons; the chart definition retains the metric and threshold
choices. Keep grid orientation and dimensions explicit when changing the
sample window.

## Estimate point concentration with density contours

Density contours turn many points into nested level sets. They are useful for
revealing cluster shape and overlap when raw dots would occlude one another.

<!-- ::chart-example id=39-density-contours height=480 -->

Bandwidth and thresholds change the visible shape. Treat them as analytical
parameters, keep them stable for comparisons, and explain them when they affect
interpretation. The optional
[`densityContour` mark](../reference/marks/density.md) maps the source channels
through final scales, owns responsive estimation, and emits structured polygons
and holes without case-owned path construction.

## Retain local structure with hexagonal bins

Hexagonal bins aggregate nearby points in pixel space and encode each bin's
count or statistic. They provide a compact alternative when a rectangular grid
would impose stronger horizontal and vertical edges.

<!-- ::chart-example id=43-hexbin-density height=480 -->

Pixel-space binning is responsive work: a changed container changes the spatial
layout. The optional [`hexbin` mark](../reference/marks/hexbin.md) owns that
resolved-layout step, reducer channels, source lineage, and hexagon scene
output without a duplicated scale.

## Production checks

- State whether color represents count, proportion, rate, or another aggregate.
- Choose a sequential, diverging, or threshold scale that matches the data
  semantics.
- Keep missing, zero, and out-of-domain cells visually distinct.
- Add direct labels only when cells remain large enough to read. A labeled
  ordinal matrix is demonstrated in
  [Themes and Styling](../guides/themes-and-styling.md).
- Prefer aggregation over rendering an unbounded raw point layer. See
  [Large Data](../guides/large-data.md).
