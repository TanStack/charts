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

<!-- ::chart-example id=04-stacked-time-area height=480 -->

Keep series order stable across updates. Reordering layers can make unchanged
values appear to move substantially and breaks the reader's spatial memory.
When one series needs precise comparison, place it on the shared baseline or
give it a separate aligned view.

The original value remains available to tooltips and selection while the mark
derives its stack endpoints.

## Center an ordered response scale

Survey counts are nonnegative, but an ordered response scale often reads as
diverging. Group the observations into counts, then anchor the stack on the
neutral category:

```ts
const counts = groupBy(responses, {
  by: { question: 'question', response: 'response' },
  outputs: { count: { reduce: 'count' } },
})

barX(counts, {
  x: 'count',
  y: 'question',
  z: 'response',
  color: 'response',
  layout: stack({
    order: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree'],
    anchor: { series: 'Neutral', fraction: 0.5 },
  }),
})
```

The grouping transform owns counts and lineage. The stack owns ordered
endpoints and the per-question zero translation. Response order, neutral
choice, and anchor fraction remain explicit chart meaning.

<!-- ::chart-example id=26-diverging-likert height=480 -->

## Compare proportional mix

A normalized stack gives every x position the same total height. It answers
which series gained or lost share, but deliberately removes the original total
magnitude.

<!-- ::chart-example id=20-normalized-stacked-area height=480 -->

Format the quantitative guide as a percentage and state the denominator. Keep
raw totals available in a tooltip, table, or companion view when the reader may
otherwise mistake stable share for stable volume.

Use `layout: stack({ offset: 'normalize' })`. Normalization is resolved
independently at each x position.

## Emphasize changing shape

A streamgraph offsets and orders layers to reduce visible oscillation around a
central baseline. It is effective for the broad shape of many positive series,
but the displaced baseline makes precise values and totals difficult to read.

<!-- ::chart-example id=21-streamgraph height=480 -->

The source can stay in tidy form; stacking belongs to the area definition:

```ts
areaY(industries, {
  x: 'date',
  y: 'unemployed',
  z: 'industry',
  color: 'industry',
  layout: stack({ offset: 'wiggle', order: 'inside-out' }),
})
```

Keep the offset and order stable across revisions, preserve series colors, and
provide exact values through
[Tooltips and Focus](../guides/tooltips-and-focus.md).

Use an ordinary stacked area when totals or baselines are part of the question.

## Show shares as fixed units

A waffle chart trades precise length comparison for countable, equal units.
Use it when one tile has a clear meaning, such as one percentage point.

```ts
waffleY(alphabet, {
  y: 'frequency',
  color: 'letter',
  unit: 0.01,
  round: true,
  gap: 2,
  radius: 2,
})
```

<!-- ::chart-example id=41-waffle-unit-chart height=480 -->

`waffleY` expands source values internally and preserves each source row for
tooltips and selection. `unit` defines one complete cell; `round: true` rounds
cumulative boundaries so category rounding does not change the overall total.
Leave `columns` unset for responsive square-cell packing, or set it when the
grid dimensions are part of the encoding.

## Encode two part-to-whole dimensions

A Marimekko chart uses column width for one categorical total and vertical
composition for a second. Each cell is an explicit rectangle with both
horizontal and vertical interval endpoints.

<!-- ::chart-example id=64-marimekko-mosaic height=480 -->

The two dimensions have independent denominators: response totals determine
each question's column width, while response-category shares determine height
within that question. Use `groupBy` to state the count or sum, then `mosaicY`
to allocate both normalized interval dimensions. Ordinary `rect` and `text`
marks render the result. Small cells may need a tooltip or adjacent table
rather than unreadable direct text.

The transform contract is defined in [Data Transforms](../reference/transforms.md),
and rectangle endpoint semantics are defined in
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
