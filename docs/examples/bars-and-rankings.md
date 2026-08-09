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

```ts group=sorted-bars env=charts file=/src/chart.ts entry
import { barY, defineChart } from '@tanstack/charts'
import { scaleBand } from '@tanstack/charts-scales/band'
import { scaleLinear } from '@tanstack/charts-scales/linear'

const rows = [
  { category: 'Search', value: 84 },
  { category: 'Direct', value: 63 },
  { category: 'Referral', value: 47 },
  { category: 'Social', value: 31 },
]

const ranked = [...rows].sort((a, b) => b.value - a.value)

const chart = defineChart({
  marks: [barY(ranked, { x: 'category', y: 'value', inset: 2 })],
  x: {
    scale: () =>
      scaleBand<string>()
        .domain(ranked.map((row) => row.category))
        .padding(0.16),
  },
  y: {
    scale: scaleLinear,
    nice: true,
    grid: true,
    axis: { label: 'Weekly signups' },
  },
})

export default chart
```

[Open the larger catalog case](https://tanstack.com/charts/catalog/bar-vertical-sorted/)
to inspect responsive label rotation and data updates.

Bar charts normally include zero on the quantitative domain. Truncating that
baseline turns small differences into large apparent changes.

## Reduce visual weight with lollipops

A lollipop keeps the common baseline and precise endpoint while replacing the
filled rectangle with a thin link. It is useful for many categories or when
the endpoint matters more than area.

<!-- ::chart-example id=16-lollipop height=480 -->

Compose the stem and endpoint as separate marks. The
[Rules, Links, Arrows, Vectors, and Ticks reference](../reference/marks/rules-links-arrows-vectors-and-ticks.md)
defines the link channels; [Dot and Hexagon Marks](../reference/marks/dot-and-hexagon.md)
defines the endpoint layer.

## Compare two values per category

Dumbbells emphasize the distance and direction between two endpoints without
implying the combined area of grouped bars.

<!-- ::chart-example id=17-dumbbell height=480 -->

Label the endpoint semantics in a legend or surrounding text. If chronological
order between two periods is the message, a slopegraph may be more direct; if
absolute magnitudes must remain independently comparable, use grouped bars.

## Explain a bridge to a total

A waterfall requires cumulative preparation. Each contribution becomes an
explicit lower and upper interval; the renderer should not guess whether a row
is a delta, subtotal, or total.

<!-- ::chart-example id=29-waterfall height=480 -->

Keep the cumulative calculation in application data preparation and pass the
prepared interval channels to a ranged bar or rectangle. The ownership boundary
is described in [Scales](../concepts/scales-and-d3.md), and the geometry
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
