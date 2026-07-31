---
title: Stacked and Composed Charts
description: Choose stacked, normalized, streamgraph, and mosaic compositions for part-to-whole comparisons.
---

Stacked charts answer how a total divides into contributions. They work best
when the total and a small number of stable components both matter. Interior
layers do not share a baseline, so their individual values are harder to
compare than the first layer or the total.

Use a normalized stack when proportion matters more than magnitude. Use a
mosaic when both column width and internal height carry part-to-whole meaning.
Use a streamgraph only when changing shape is the primary story and exact
values remain available elsewhere.

## Choose the composition

| Reader question                                                 | Start with                              |
| --------------------------------------------------------------- | --------------------------------------- |
| How do several series contribute to a changing total?           | Stacked area                            |
| How does proportional mix change independently of the total?    | Normalized 100% stack                   |
| How does the overall shape of many positive series evolve?      | Streamgraph                             |
| How do two categorical part-to-whole dimensions interact?       | Marimekko or mosaic                     |
| Which subgroup values must be compared precisely across groups? | Grouped bars or aligned small multiples |
| Do contributions extend in positive and negative directions?    | Diverging stack around an explicit zero |

Single-value bar and area channels stack implicitly. Use `layout: stack()`
when the order or offset must be explicit; supply interval endpoints when the
application has already computed them.

## Preserve totals with a stacked area

A stacked area combines a shared ordered x domain with one length per series.
The top boundary carries the total; the thickness of each layer carries its
contribution.

```ts
areaY(rows, {
  x: 'date',
  y: 'value',
  color: 'series',
  layout: stack({ order: ['Core', 'Services'] }),
})
```

<iframe
  src="https://tanstack.com/charts/catalog/embed/04-stacked-time-area/?theme=system&height=480"
  title="Multi-series stacked time area built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

Keep series order stable across updates. Reordering layers can make unchanged
values appear to move substantially and breaks the reader's spatial memory.
When one series needs precise comparison, place it on the shared baseline or
give it a separate aligned view.

The original value remains available to tooltips and selection while the mark
derives its stack endpoints.

## Compare proportional mix

A normalized stack gives every x position the same total height. It answers
which series gained or lost share, but deliberately removes the original total
magnitude.

<iframe
  src="https://tanstack.com/charts/catalog/embed/20-normalized-stacked-area/?theme=system&height=480"
  title="Normalized one-hundred-percent stacked area built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

Format the quantitative guide as a percentage and state the denominator. Keep
raw totals available in a tooltip, table, or companion view when the reader may
otherwise mistake stable share for stable volume.

Use `layout: stack({ offset: 'normalize' })`. Normalization is resolved
independently at each x position.

## Emphasize changing shape

A streamgraph offsets and orders layers to reduce visible oscillation around a
central baseline. It is effective for the broad shape of many positive series,
but the displaced baseline makes precise values and totals difficult to read.

<iframe
  src="https://tanstack.com/charts/catalog/embed/21-streamgraph/?theme=system&height=480"
  title="Time-series streamgraph with a centered flowing baseline built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

Use `offset: 'center'` or `offset: 'wiggle'` and an explicit order when the
composition depends on them. Keep those values stable across revisions,
preserve series colors, and provide exact values through
[Tooltips and Focus](../guides/tooltips-and-focus.md).

Use an ordinary stacked area when totals or baselines are part of the question.

## Encode two part-to-whole dimensions

A Marimekko chart uses column width for one categorical total and vertical
composition for a second. Each cell is an explicit rectangle with both
horizontal and vertical interval endpoints.

<iframe
  src="https://tanstack.com/charts/catalog/embed/64-marimekko-mosaic/?theme=system&height=480"
  title="Marimekko survey-response composition built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

The two dimensions have independent denominators: response totals determine
each question's column width, while response-category shares determine height
within that question. Keep those calculations separate and label both meanings.
Small cells may need a tooltip or adjacent table rather than unreadable direct
text.

Rectangle endpoint semantics are defined in
[Bar and Rect Marks](../reference/marks/bar-and-rect.md).

## Production checks

- State whether the chart preserves totals or normalizes every group.
- Keep series order, category order, colors, and keys stable.
- Include zero for ordinary positive stacks and an explicit zero rule for
  diverging stacks.
- Preserve raw values alongside derived endpoints and proportions.
- Avoid too many layers; group minor categories only when the aggregation is
  defensible and disclosed.
- Use a legend or direct labels that remain meaningful in light and dark
  themes. See [Legends and Color](../guides/legends-and-color.md).
- Verify keyboard focus and exact-value access with
  [Accessibility](../guides/accessibility.md).

[Marks and Layering](../concepts/marks-and-layering.md) explains how the
interval areas, rules, labels, and highlights compose into one chart.
