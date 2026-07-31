---
title: Bars and Rankings
description: Choose bar, lollipop, dumbbell, and waterfall compositions for categorical comparison and change.
---

Bars answer categorical magnitude questions through length from a shared
baseline. Sort them when rank is part of the question, keep a semantic order
when sequence matters, and use a lighter comparison mark when a filled bar
would overstate the data.

## Choose the comparison

| Reader question                                                   | Start with                                                                             |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Which category has the largest or smallest value?                 | Sorted bars                                                                            |
| Which categories have notable endpoints without emphasizing area? | Lollipops                                                                              |
| How far apart are two values for each category?                   | Dumbbells                                                                              |
| How do signed contributions bridge from a start to a total?       | A waterfall                                                                            |
| How do subgroups contribute to each category?                     | Grouped or stacked bars in [Stacked and Composed Charts](./stacked-and-composition.md) |

Use horizontal bars when labels are long or when the rank itself should read
top to bottom. [Layout, Axes, and Coordinates](../concepts/layout-axes-and-coordinates.md)
shows how categorical orientation and automatic guide margins fit together.

## Rank categories with bars

Sorting the scale domain makes the intended ranking explicit. Sorting only the
input rows is insufficient when several layers or prepared datasets share the
same categorical axis.

<iframe
  src="https://tanstack.com/charts/catalog/embed/bar-vertical-sorted/?theme=system&height=480"
  title="Sorted vertical category bars built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

Bar charts normally include zero on the quantitative domain. Truncating that
baseline turns small differences into large apparent changes.

## Reduce visual weight with lollipops

A lollipop keeps the common baseline and precise endpoint while replacing the
filled rectangle with a thin link. It is useful for many categories or when
the endpoint matters more than area.

<iframe
  src="https://tanstack.com/charts/catalog/embed/16-lollipop/?theme=system&height=480"
  title="Ranked category lollipop chart built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

Compose the stem and endpoint as separate marks. The
[Rules, Links, Arrows, Vectors, and Ticks reference](../reference/marks/rules-links-arrows-vectors-and-ticks.md)
defines the link channels; [Dot and Hexagon Marks](../reference/marks/dot-and-hexagon.md)
defines the endpoint layer.

## Compare two values per category

Dumbbells emphasize the distance and direction between two endpoints without
implying the combined area of grouped bars.

<iframe
  src="https://tanstack.com/charts/catalog/embed/17-dumbbell/?theme=system&height=480"
  title="Paired category dumbbell comparison built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

Label the endpoint semantics in a legend or surrounding text. If chronological
order between two periods is the message, a slopegraph may be more direct; if
absolute magnitudes must remain independently comparable, use grouped bars.

## Explain a bridge to a total

A waterfall requires cumulative preparation. Each contribution becomes an
explicit lower and upper interval; the renderer should not guess whether a row
is a delta, subtotal, or total.

<iframe
  src="https://tanstack.com/charts/catalog/embed/29-waterfall/?theme=system&height=480"
  title="Signed waterfall bridge with an explicit total built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

Keep the cumulative calculation in application data preparation and pass the
prepared interval channels to a ranged bar or rectangle. The ownership boundary
is described in [Scales and D3](../concepts/scales-and-d3.md), and the geometry
contracts are in [Bar and Rect Marks](../reference/marks/bar-and-rect.md).

## Production checks

- Preserve a semantic category order unless rank is the question.
- Include zero for ordinary bar magnitudes; use explicit interval endpoints for
  floating and waterfall bars.
- Avoid encoding the same distinction only by color. Labels, position, and
  shape can carry the essential comparison.
- Verify long labels and rotated ticks with
  [Responsive Charts](../guides/responsive-charts.md).
- Preserve unique category values when bars reorder or animate; supply `key`
  only when the category does not identify a row. See
  [Dynamic Data and Animation](../guides/dynamic-data-and-animation.md).
