---
title: Distributions
description: Choose histograms, boxplots, empirical cumulative distributions, and violins for shape, spread, and rank.
---

Distribution charts answer where observations lie, how widely they vary, and
whether groups differ in shape or rank. The right encoding depends on whether
the reader needs familiar bins, compact summaries, cumulative probability, or
the detailed shape of each group.

## Choose the comparison

| Reader question                                            | Start with                        |
| ---------------------------------------------------------- | --------------------------------- |
| How often do values fall within fixed ranges?              | Histogram                         |
| How do center, spread, and outliers compare across groups? | Boxplot                           |
| What proportion of observations is at or below each value? | Empirical cumulative distribution |
| How do several binned profiles compare in limited space?   | Ridgeline                         |
| How do several mirrored distribution profiles compare?     | Violin                            |
| Must every observation remain visible?                     | A beeswarm or strip layout        |

Binning, standalone quantiles, and density estimation are data preparation.
`boxX` and `boxY` own their complete Tukey summaries because independently
prepared quartiles, fences, whiskers, and outliers can drift. Dot collision
placement belongs to the chart because it depends on final scales, plot bounds,
and pixel radii.

## Preserve observations with a beeswarm

Use a dodge layout when every observation should remain visible without moving
its measured coordinate.

```ts
dot(rows, {
  x: 'economy (mpg)',
  key: 'id',
  r: 4,
  layout: dodgeY({ anchor: 'middle', padding: 1 }),
})
```

<iframe
  src="https://tanstack.com/charts/catalog/embed/52-beeswarm-dodge/?theme=system&height=480"
  title="Fuel economy beeswarm built with the native dodgeY dot layout"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

The [Dodge Layouts reference](../reference/marks/dodge.md) covers anchors,
variable radii, identity, and facets.

## Inspect frequency with a histogram

A histogram groups quantitative observations into intervals. Keep thresholds
stable when comparing revisions or groups; otherwise a changed binning decision
can look like a changed distribution.

<iframe
  src="https://tanstack.com/charts/catalog/embed/histogram/?theme=system&height=480"
  title="Fixed-threshold quantitative histogram built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

The prepared rows should carry each bin's lower bound, upper bound, and count or
proportion. Render those intervals with
[Bar and Rect Marks](../reference/marks/bar-and-rect.md). The
[Scales](../concepts/scales-and-d3.md) explains how the
application chooses thresholds and reductions.

## Compare compact summaries

A boxplot summarizes quartiles, a median, whiskers, and optional outliers. It is
compact and comparable, but it does not reveal modes, gaps, or sample size on
its own.

<iframe
  src="https://tanstack.com/charts/catalog/embed/15-boxplot/?theme=system&height=480"
  title="Grouped boxplot with quartiles, whiskers, medians, and outliers built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

Pass the raw observations to `boxY`, or use `boxX` for horizontal boxes:

```ts
boxY(morley, {
  x: 'Expt',
  y: 'Speed',
  key: 'Run',
  fill: '#bfdbfe',
  stroke: '#2563eb',
})
```

The mark owns quartiles, 1.5-IQR Tukey fences, observed whiskers, outlier
partitioning, and direct source lineage. Its tooltip datum discriminates
`kind: 'summary'` from `kind: 'outlier'`. The [Box Marks reference](../reference/marks/box.md)
documents the exact statistics, styling, and interaction targets.

## Preserve every rank with an ECDF

An empirical cumulative distribution shows the proportion of observations at
or below each observed value. It avoids bin-width decisions and supports direct
percentile comparisons.

<iframe
  src="https://tanstack.com/charts/catalog/embed/50-empirical-cdf/?theme=system&height=480"
  title="Empirical cumulative distribution step chart built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

Use a step curve because the empirical proportion changes at observations, not
continuously between them. State whether ties share a rank and format the
vertical axis as a proportion.

## Compare binned profiles

Use a ridgeline when several prepared profiles need a shared quantitative axis
and compact categorical baselines.

```ts
const profiles = normalize(
  binX(episodes, {
    value: 'imdb_rating',
    by: 'season',
    thresholds: ratingBoundaries,
    outputs: { count: { reduce: 'count' } },
  }),
  {
    value: 'count',
    by: 'season',
    basis: 'max',
    as: 'height',
  },
)

ridgelineY(profiles, {
  x: 'x',
  y: 'season',
  height: 'height',
  overlap: 0.78,
  color: 'season',
})
```

<iframe
  src="https://tanstack.com/charts/catalog/embed/62-ridgeline-density/?theme=system&height=480"
  title="Grouped normalized IMDb rating histograms laid out with semantic ridgeline baselines"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

`binX` retains the episodes in each bin, `normalize` retains each bin as its
immediate source, and `ridgelineY` owns only the responsive category-step
offset. This example is a normalized histogram profile, not a kernel density
estimate. The [Ridgeline Marks reference](../reference/marks/ridgeline.md)
documents overlap, category scales, curves, and interaction.

## Compare detailed group shapes

A violin mirrors a prepared normalized profile around each category. It can
show modes and shape that a boxplot hides. Its interpretation still depends on
the authored bins or density estimator.

```ts
const profiles = normalize(
  binY(observations, {
    value: 'body_mass_g',
    by: 'species',
    thresholds: massBoundaries,
    outputs: { count: { reduce: 'count' } },
  }),
  {
    value: 'count',
    by: 'species',
    basis: 'max',
    as: 'width',
  },
)
const summaries = groupBy(observations, {
  by: 'species',
  outputs: {
    median: { value: 'body_mass_g', reduce: median },
  },
})

violinY(profiles, {
  x: 'species',
  y: 'y',
  width: 'width',
  span: 0.76,
  color: 'species',
  curve: d3AreaXCurve(curveBasis),
})
tickY(summaries, { x: 'species', y: 'median', span: 0.36 })
dot(summaries, { x: 'species', y: 'median' })
```

<iframe
  src="https://tanstack.com/charts/catalog/embed/63-violin-distributions/?theme=system&height=480"
  title="Mirrored violin distributions with median indicators built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

`violinY` owns only mirrored category-step geometry. `binY`, max normalization,
and the median stay visible and retain source lineage. This catalog example is
a smoothed normalized histogram, not a kernel density estimate. The
[Violin Marks reference](../reference/marks/violin.md) documents category
scales, spans, curves, and interaction.

## Production checks

- Use counts when sample size matters and proportions when comparing groups of
  different sizes.
- Keep thresholds and density parameters consistent across comparable views.
- Show sample size or raw observations when a summary could hide sparse data.
- Supply exact values through tooltips, tables, or textual summaries; see
  [Tooltips and Focus](../guides/tooltips-and-focus.md) and
  [Accessibility](../guides/accessibility.md).
- Use facets when each group needs its own complete distribution view. See
  [Faceting and Composition](../guides/faceting-and-composition.md).

Area channel details are in
[Line and Area Marks](../reference/marks/line-and-area.md).
