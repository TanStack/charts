---
title: Overview
description: Learn what TanStack Charts provides, how its grammar works, and where charting responsibilities belong.
---

TanStack Charts `0.6.5` is a pre-alpha release. Its API may change between
releases.

TanStack Charts is a small, framework-agnostic chart grammar for TypeScript and
JavaScript. Give each mark its natural data, map fields or accessors to visual
channels, and use compact scales to define common numeric and categorical
axes. TanStack Charts compiles that declaration into a responsive, keyed scene
and renders accessible SVG by default, with Canvas available as an opt-in
surface.

TanStack Charts builds on the grammar-of-graphics tradition established by
[Leland Wilkinson](https://doi.org/10.1007/0-387-28695-0) and developed through
projects such as [ggplot2](https://ggplot2.tidyverse.org/),
[Vega-Lite](https://vega.github.io/vega-lite/), and
[Observable Plot](https://observablehq.com/plot/). Observable Plot is the
closest API influence for mark-local data, channels, and layered composition.
TanStack Charts applies those ideas to typed application infrastructure with
explicit scale and algorithm boundaries, responsive scene compilation, and
framework lifecycle.

The library is designed for two equally important authors:

- People should get polished, responsive charts from a short declaration.
- AI should be able to compose, inspect, and modify charts without learning an application-specific series model or guessing at hidden behavior.

The same definition can feed the vanilla DOM host and framework adapters.
React and Octane also provide optional Canvas entries; the experimental React
Native adapter consumes definitions from the universal entry.

## A chart is a composition

<!-- docs-example: overview typecheck -->

```ts
import { areaY, defineChart, lineY } from '@tanstack/charts'
import { scaleLinear } from '@tanstack/charts-scales/linear'

interface ClosingPrice {
  day: number
  Close: number
}

const observations: readonly ClosingPrice[] = [
  { day: 1, Close: 64.96 },
  { day: 2, Close: 63.41 },
  { day: 3, Close: 61.26 },
  { day: 4, Close: 62.08 },
  { day: 5, Close: 61.89 },
  { day: 6, Close: 63.28 },
  { day: 7, Close: 62.81 },
  { day: 8, Close: 63.05 },
]

const rows = observations.flatMap((row, index) => {
  if (index < 2) return []
  const window = observations.slice(index - 2, index + 1)
  const average =
    window.reduce((total, observation) => total + observation.Close, 0) /
    window.length
  return [{ ...row, average }]
})

const closingPriceChart = defineChart({
  marks: [
    areaY(rows, {
      x: 'day',
      y1: 'average',
      y2: 'Close',
      fill: '#2563eb',
      fillOpacity: 0.18,
    }),
    lineY(rows, {
      x: 'day',
      y: 'Close',
      stroke: '#2563eb',
    }),
    lineY(rows, {
      x: 'day',
      y: 'average',
      stroke: '#64748b',
    }),
  ],
  x: {
    scale: scaleLinear,
    nice: true,
    axis: { label: 'Trading day' },
  },
  y: {
    scale: scaleLinear,
    nice: true,
    grid: true,
    axis: { label: 'Close (USD)' },
  },
})
```

The rolling average is an ordinary, visible data transform. Both axes use the
compact numeric scale, and their factories infer domains from the materialized
channels. When the horizontal values become real calendar dates, replace only
the x scale with D3's `scaleUtc`; the compact y scale and chart definition stay
unchanged. [Scales](./concepts/scales-and-d3.md) defines that upgrade
boundary.

## What TanStack Charts owns

TanStack Charts owns the parts that make a declarative chart reliable inside an application:

- A grammar of typed marks, channels, scales, guides, and layers
- Container-responsive pixel ranges and automatic guide margins
- A renderer-neutral scene with stable keys
- Default SVG rendering, keyed DOM reconciliation, optional Canvas painting,
  and interruptible animation
- Pointer and keyboard focus, selection callbacks, and native tooltips
- Framework-agnostic runtime state with thin framework adapters
- Light and dark mode defaults based on inherited color and CSS variables
- Public extension points for custom marks, focus strategies, spatial indexes, and renderers

## What stays outside the library

TanStack Charts keeps data preparation explicit and spatial algorithms outside
the rendering runtime.

| Responsibility                                                                                         | Owner                                                      |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| Common numeric and categorical scale mappings                                                          | `@tanstack/charts-scales`                                  |
| Common group, bin, window, normalize, select, and row-stack transforms                                 | TanStack's eager data-transform helpers                    |
| Temporal, nonlinear, piecewise, spatial, and other specialized algorithms                              | Your application using only the granular D3 modules needed |
| Fetching, cleaning, profiling, and exploratory analysis                                                | Your data layer, server, or AI workflow                    |
| Mark-channel domain inference, responsive ranges, guide layout, scenes, rendering, and chart lifecycle | TanStack Charts                                            |
| Page controls, queries, filters, persistence, memoization, and application state                       | Your application                                           |

Prepared data can come from TanStack transforms, D3, SQL, a server, or
ordinary TypeScript; marks consume it without requiring a special series
container.

## Defaults for the common case

The normal path is intentionally short:

- Omit `width` to follow the chart container.
- Omit `margin` to measure axes, tick labels, rotation, and titles automatically.
- Supply `ariaLabel`; keyboard focus is enabled by default.
- Add the `tooltip` extension when a native value tooltip is enough.
- Start with compact linear, band, point, and ordinal scales; upgrade only the
  scale that needs fuller D3 semantics.
- Let built-in marks infer stable identity from IDs or unique positions; supply
  a stable `key` when that identity is unavailable or can change.
- Let field names, datum types, scales, interaction points, and adapters infer without casts.
- Use inherited `currentColor` and the `--ts-chart-*` CSS variables for automatic theme integration.

Every automatic behavior has an explicit escape hatch. The [Guides](./guides/responsive-charts.md) cover those controls by task rather than repeating the API reference.

## Packages

| Package                         | Use it for                                                       |
| ------------------------------- | ---------------------------------------------------------------- |
| `@tanstack/charts`              | Definitions, marks, scenes, SVG, Canvas, export, and vanilla DOM |
| `@tanstack/charts-scales`       | Compact linear, band, point, and ordinal scales                  |
| `@tanstack/react-charts`        | React `<Chart>`                                                  |
| `@tanstack/react-native-charts` | Experimental React Native SVG `<Chart>`                          |
| `@tanstack/preact-charts`       | Preact `<Chart>`                                                 |
| `@tanstack/vue-charts`          | Vue `<Chart>`                                                    |
| `@tanstack/solid-charts`        | Solid `<Chart>`                                                  |
| `@tanstack/svelte-charts`       | Svelte `<Chart>`                                                 |
| `@tanstack/angular-charts`      | Angular `<tanstack-chart>`                                       |
| `@tanstack/lit-charts`          | Lit `<tanstack-chart>`                                           |
| `@tanstack/alpine-charts`       | Alpine `x-chart`                                                 |
| `@tanstack/octane-charts`       | Octane `<Chart>`                                                 |

All packages are ESM and tree-shakeable. Built-in marks and optional capabilities also have subpath exports when a library or design system needs tighter bundle boundaries.

## Where to go next

- [Compare Libraries](./comparison.md) — evaluate Chart.js, Apache ECharts, Recharts, Observable Plot, and TanStack Charts against the pinned evidence.
- [Installation](./installation.md) — install the core, compact scales, an adapter, and any advanced D3 modules your charts import.
- [Quick Start](./quick-start.md) — define, mount, update, and destroy a responsive chart.
- [Grammar of Graphics](./concepts/grammar-of-graphics.md) — understand how data, marks, channels, scales, and layers fit together.
- [Choosing a Chart](./guides/choosing-a-chart.md) — start from the analytical question.
- [Example Gallery](./examples/index.md) — browse complete, embeddable compositions.
- [Migrating](./guides/migrating.md) — preserve semantics and establish parity before removing an existing renderer.
- [AI Authoring](./guides/ai-authoring.md) — give an agent the smallest reliable path from intent to verified output.
