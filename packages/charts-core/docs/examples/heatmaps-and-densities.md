---
title: Heatmaps and Densities
description: Choose quantitative matrix cells, contours, or hexagonal bins to show concentration across two dimensions.
---

Heatmaps and density charts answer where values concentrate across two
dimensions. A matrix uses explicit row and column categories or intervals.
Contours and spatial bins summarize a continuous point field. Choose the
representation that preserves the question instead of defaulting to one color
per raw observation.

## Choose the comparison

| Reader question                                               | Start with                  |
| ------------------------------------------------------------- | --------------------------- |
| How many observations fall in each quantitative x-y interval? | Binned quantitative heatmap |
| What smooth regions enclose similar point density?            | Density contours            |
| Where are dense clusters while retaining local bin shape?     | Hexagonal bins              |
| What value belongs to each pair of named categories?          | An ordinal cell matrix      |

[Data and Channels](../concepts/data-and-channels.md) explains interval and
color channels. [Legends and Color](../guides/legends-and-color.md) covers
continuous color meaning and accessible legend design.

## Aggregate into quantitative cells

A two-dimensional binned heatmap makes density bounded: the number of rendered
cells depends on the chosen grid, not directly on the number of raw points.

<iframe
  src="https://tanstack.com/charts/catalog/embed/24-quantitative-binned-heatmap/?theme=system&height=420"
  title="Two-dimensional quantitative binned heatmap built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="420"
  style="width:100%;height:420px;border:0;"
></iframe>

Prepare explicit x and y interval endpoints plus the aggregate value. Use
thresholds that are stable across comparable views and a color domain that
states whether absolute count or normalized density is being shown. See
[Scales and D3](../concepts/scales-and-d3.md) for binning and scale ownership.

## Summarize a continuous field with contours

Density contours turn many points into nested level sets. They are useful for
revealing cluster shape and overlap when raw dots would occlude one another.

<iframe
  src="https://tanstack.com/charts/catalog/embed/39-density-contours/?theme=system&height=420"
  title="Nested point-density contours built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="420"
  style="width:100%;height:420px;border:0;"
></iframe>

Bandwidth and thresholds change the visible shape. Treat them as analytical
parameters, keep them stable for comparisons, and explain them when they affect
interpretation. This case uses an optional custom mark boundary described in
[Custom Marks and Renderers](../guides/custom-marks-and-renderers.md).

## Retain local structure with hexagonal bins

Hexagonal bins aggregate nearby points in pixel space and encode each bin's
count or statistic. They provide a compact alternative when a rectangular grid
would impose stronger horizontal and vertical edges.

<iframe
  src="https://tanstack.com/charts/catalog/embed/43-hexbin-density/?theme=system&height=420"
  title="Pixel-space hexagonally binned density chart built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="420"
  style="width:100%;height:420px;border:0;"
></iframe>

Pixel-space binning is responsive work: a changed container changes the spatial
layout. Keep that preparation aligned with the chart's measured inner bounds.
[Responsive Charts](../guides/responsive-charts.md) defines the measurement
lifecycle; [Dot and Hexagon Marks](../reference/marks/dot-and-hexagon.md)
defines the rendered mark.

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
