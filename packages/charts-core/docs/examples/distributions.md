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
| How do several smoothed distribution shapes compare?       | Violin                            |
| Must every observation remain visible?                     | A beeswarm or strip layout        |

Binning, quantiles, density estimation, and collision layout are data
preparation. TanStack Charts renders their explicit output through ordinary
marks.

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
[Scales and D3](../concepts/scales-and-d3.md) concept explains how the
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

Prepare one summary row per group and a separate outlier dataset. Compose
rectangles, rules, ticks, and dots instead of expecting one opaque boxplot
primitive. [Marks and Layering](../concepts/marks-and-layering.md) covers this
composition model.

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

## Compare detailed group shapes

A violin mirrors a prepared density around each category. It reveals modes and
shape that a boxplot can hide, but its appearance depends on density bandwidth
and sampling.

<iframe
  src="https://tanstack.com/charts/catalog/embed/63-violin-distributions/?theme=system&height=480"
  title="Mirrored violin distributions with median indicators built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

Render the mirrored interval with an area mark and add the median as an
independent link and dot. Document the density method in the surrounding
product when its parameters affect interpretation.

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
