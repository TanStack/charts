---
title: Choosing a Chart
description: Choose a visual encoding from the question, data shape, and comparison task before composing TanStack Charts marks.
---

Start with the comparison a reader must make. A chart type is the result of
that decision, not the starting point.

TanStack Charts does not inspect a dataset and choose a chart automatically.
Data exploration, cleaning, and recommendation belong in application tooling
or an authoring skill. The runtime receives data that is ready to encode.

## Task-first choices

| Reader task                     | First choice                           | Common alternatives                                                     |
| ------------------------------- | -------------------------------------- | ----------------------------------------------------------------------- |
| Follow change over ordered time | Line                                   | Area for accumulated magnitude; bars for discrete periods               |
| Compare named categories        | Horizontal bars                        | Dots or lollipops when a zero baseline is not the message               |
| Compare two values per category | Dumbbell or slopegraph                 | Grouped bars when absolute magnitude matters                            |
| Inspect a relationship          | Scatterplot                            | Bubble scatterplot for a third quantitative value                       |
| Inspect one distribution        | Histogram                              | ECDF when cumulative probability matters                                |
| Compare distributions           | Boxplot or violin                      | Faceted histograms when shape details matter                            |
| Show an interval                | Range area, interval bar, or error bar | Candlestick for financial open-high-low-close data                      |
| Show composition                | Stacked bars or areas                  | Normalized stack for proportions; mosaic for two categorical dimensions |
| Show a matrix                   | Heatmap                                | Labeled cells for small matrices                                        |
| Repeat the same view by group   | Facets                                 | Linked views when each panel needs a different role                     |
| Show topology                   | Node-link diagram                      | Matrix encoding when the network is dense                               |
| Edit or navigate a time range   | Chart plus semantic controls           | Brush, zoom, or scrubber owned by the application                       |

The [chart examples](../examples/index.md) show these choices as executable
compositions.

## Check the data shape

Before choosing marks, identify:

- the observation represented by one row;
- quantitative, temporal, ordinal, and nominal fields;
- whether missing values mean unknown, zero, or a deliberate gap;
- whether order is semantic or merely presentational;
- which rows share a series or group;
- whether values are points or intervals;
- whether aggregation would answer the question more clearly than raw marks.

Keep those rows in their natural application shape. Use
[channels](../concepts/data-and-channels.md) to map fields or accessors into
visual properties. Do not convert data into a library-owned series structure.

## Prefer the smallest complete composition

Use this escalation order:

1. One built-in mark.
2. Several built-in marks sharing scales.
3. Facets or explicitly linked views.
4. D3-prepared rows passed to built-in marks.
5. A custom mark that emits scene nodes.
6. An application-owned overlay or gesture controller.

Composition is usually enough. A boxplot, for example, is a prepared summary
rendered with rectangles, rules, ticks, and dots. A candlestick is a link plus
a ranged rectangle. A focus-and-context view is two charts sharing semantic
state.

See [Marks and Layering](../concepts/marks-and-layering.md),
[Faceting and Composition](./faceting-and-composition.md), and
[Custom Marks and Renderers](./custom-marks-and-renderers.md) for the
corresponding boundaries.

## Avoid misleading defaults

- Bar charts should normally include zero on the quantitative axis.
- Line charts imply an ordered continuum. Do not connect unordered categories.
- Area encodings compare distance from a baseline. Use explicit interval
  endpoints when the baseline is not zero.
- Stacks make totals easy to compare but interior layers harder to compare.
- Bubble radius must use an area-preserving radial scale.
- Dual quantitative axes often make unrelated movement look related. Prefer
  aligned small multiples.
- Three-dimensional effects distort position, length, and area. Keep analytical
  marks planar.
- More raw marks are not automatically more honest. For dense data, choose a
  bounded representation that preserves the question.

The [Large Data](./large-data.md) guide covers the raw-versus-encoded decision.

## Verify the result

A chart is ready when:

- its title or surrounding text states the question;
- the axes and legend identify units;
- ordering and aggregation are intentional;
- color is not the only carrier of essential state;
- missing and empty states are explicit;
- focus and keyboard behavior match pointer behavior;
- updates preserve keys, selection, and viewport state;
- the chart remains readable at its smallest supported container;
- a table or textual summary is available when exact values are essential.

If the first attempt fails one of these checks, change the representation
before adding decorative complexity.
