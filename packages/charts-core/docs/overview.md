---
title: Overview
description: Learn what TanStack Charts provides, how its grammar works, and where charting responsibilities belong.
---

These docs follow unreleased `main`. The latest published TanStack Charts
release is `0.9.0`; it is pre-alpha and its API may change between releases.

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

```ts group=overview-composition env=charts file=/src/chart.ts entry
import { defineChart, dot, lineY } from '@tanstack/charts'
import { scaleBand } from '@tanstack/charts/scales/band'
import { scaleLinear } from '@tanstack/charts/scales/linear'

const signups = [
  { month: 'Jan', value: 42 },
  { month: 'Feb', value: 58 },
  { month: 'Mar', value: 51 },
  { month: 'Apr', value: 73 },
  { month: 'May', value: 86 },
]

export default defineChart({
  marks: [
    lineY(signups, {
      x: 'month',
      y: 'value',
      stroke: '#2563eb',
      strokeWidth: 2,
    }),
    dot(signups, {
      x: 'month',
      y: 'value',
      fill: '#2563eb',
      r: 4,
    }),
  ],
  x: {
    scale: () => scaleBand<string>().padding(0.2),
  },
  y: {
    scale: scaleLinear,
    nice: true,
    grid: true,
    axis: { label: 'Signups' },
  },
})
```

The line and dots use the same rows and scales. Their array order puts the
points above the line. [Scales](./concepts/scales-and-d3.md) explains when to
replace these compact scales with specialized mappings.

## What TanStack Charts owns

TanStack Charts owns the parts that make a declarative chart reliable inside an application:

- A grammar of typed marks, channels, scales, guides, and layers
- Container-responsive pixel ranges and automatic guide margins
- A renderer-neutral scene with stable keys
- Default SVG rendering, keyed DOM reconciliation, optional Canvas painting,
  and interruptible animation
- Pointer and keyboard focus, selection callbacks, and built-in tooltips
- Framework-agnostic runtime state with thin framework adapters
- Light and dark mode defaults based on inherited color and CSS variables
- Public extension points for custom marks, focus strategies, spatial indexes, and renderers

## Keep ownership explicit

TanStack Charts keeps data preparation explicit and optional algorithms behind
narrow imports.

| Responsibility                                                                                         | Owner                                                            |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| Common numeric and categorical scale mappings                                                          | Exact `@tanstack/charts/scales/*` subpaths                       |
| Common group, bin, rollingWindow, normalize, select, and row-stack transforms                          | TanStack's eager data-transform helpers                          |
| Temporal, nonlinear, piecewise, spatial, and other specialized algorithms                              | Exact TanStack entries, granular D3 modules, or application code |
| Fetching, cleaning, profiling, and exploratory analysis                                                | Your data layer, server, or AI workflow                          |
| Mark-channel domain inference, responsive ranges, guide layout, scenes, rendering, and chart lifecycle | TanStack Charts                                                  |
| Page controls, queries, filters, persistence, memoization, and application state                       | Your application                                                 |

Prepared data can come from TanStack transforms, D3, SQL, a server, or
ordinary TypeScript; marks consume it without requiring a special series
container.

## Defaults for the common case

The normal path is intentionally short:

- Omit `width` to follow the chart container.
- Omit `margin` to measure axes, tick labels, rotation, and titles automatically.
- Supply `ariaLabel`; keyboard focus is enabled by default.
- Add the `tooltip` extension when a built-in value tooltip is enough.
- Start with compact linear, band, point, and ordinal scales; upgrade only the
  scale that needs fuller D3 semantics.
- Let built-in marks infer stable identity from IDs or unique positions; supply
  a stable `key` when that identity is unavailable or can change.
- Let field names, datum types, scales, interaction points, and adapters infer without casts.
- Use inherited `currentColor` and the `--ts-chart-*` CSS variables for automatic theme integration.

Every automatic behavior has an explicit escape hatch. The [Guides](./guides/responsive-charts.md) cover those controls by task rather than repeating the API reference.

## Package subpaths

Install only `@tanstack/charts`. Its ESM subpaths expose compact scales,
framework adapters, renderers, and optional capabilities while preserving
their tree-shakeable module boundaries. For example, React uses
`@tanstack/charts/react`, React Native uses
`@tanstack/charts/react-native`, and compact linear scales use
`@tanstack/charts/scales/linear`.

## Where to go next

- [Compare Libraries](./comparison.md) — evaluate Chart.js, Apache ECharts, Recharts, Observable Plot, and TanStack Charts against the pinned evidence.
- [Installation](./installation.md) — install Charts, framework peers, and any D3 modules your source imports directly.
- [Quick Start](./quick-start.md) — define, mount, update, and destroy a responsive chart.
- [Grammar of Graphics](./concepts/grammar-of-graphics.md) — understand how data, marks, channels, scales, and layers fit together.
- [Choosing a Chart](./guides/choosing-a-chart.md) — start from the analytical question.
- [Example Gallery](./examples/index.md) — run and edit complete compositions.
- [Migrating](./guides/migrating.md) — preserve semantics and establish parity before removing an existing renderer.
- [AI Authoring](./guides/ai-authoring.md) — give an agent the smallest reliable path from intent to verified output.
