---
title: Overview
description: Learn what TanStack Charts provides, how its grammar works, and where charting responsibilities belong.
---

TanStack Charts `0.6.4` is a pre-alpha release. Its API may change between
releases.

TanStack Charts is a small, framework-agnostic chart grammar for TypeScript and JavaScript. Give each mark its natural data, map fields or accessors to visual channels, and supply the D3 scales that define the meaning of each axis. TanStack Charts compiles that declaration into a responsive, keyed scene and renders accessible SVG by default, with Canvas available as an opt-in surface.

TanStack Charts builds on the grammar-of-graphics tradition established by
[Leland Wilkinson](https://doi.org/10.1007/0-387-28695-0) and developed through
projects such as [ggplot2](https://ggplot2.tidyverse.org/),
[Vega-Lite](https://vega.github.io/vega-lite/), and
[Observable Plot](https://observablehq.com/plot/). Observable Plot is the
closest API influence for mark-local data, channels, and layered composition.
TanStack Charts applies those ideas to typed application infrastructure with
explicit D3 primitives, responsive scene compilation, and framework lifecycle.

The library is designed for two equally important authors:

- People should get polished, responsive charts from a short declaration.
- AI should be able to compose, inspect, and modify charts without learning an application-specific series model or guessing at hidden behavior.

The same definition can feed the vanilla DOM host and framework adapters.
React and Octane also provide optional Canvas entries; the experimental React
Native adapter consumes definitions from the universal entry.

## A chart is a composition

<!-- docs-example: overview typecheck -->

```ts
import { mean } from 'd3-array'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { areaY, defineChart, lineY } from '@tanstack/charts'

interface ClosingPrice {
  Date: Date
  Close: number
}

const observations: readonly ClosingPrice[] = [
  { Date: new Date('2013-05-13T00:00:00Z'), Close: 64.96 },
  { Date: new Date('2013-05-14T00:00:00Z'), Close: 63.41 },
  { Date: new Date('2013-05-15T00:00:00Z'), Close: 61.26 },
  { Date: new Date('2013-05-16T00:00:00Z'), Close: 62.08 },
  { Date: new Date('2013-05-17T00:00:00Z'), Close: 61.89 },
  { Date: new Date('2013-05-20T00:00:00Z'), Close: 63.28 },
  { Date: new Date('2013-05-21T00:00:00Z'), Close: 62.81 },
  { Date: new Date('2013-05-22T00:00:00Z'), Close: 63.05 },
]

const rows = observations.flatMap((row, index) => {
  if (index < 2) return []
  const average = mean(
    observations.slice(index - 2, index + 1),
    (observation) => observation.Close,
  )
  return average === undefined ? [] : [{ ...row, average }]
})

const closingPriceChart = defineChart({
  marks: [
    areaY(rows, {
      x: 'Date',
      y1: 'average',
      y2: 'Close',
      fill: '#2563eb',
      fillOpacity: 0.18,
    }),
    lineY(rows, {
      x: 'Date',
      y: 'Close',
      stroke: '#2563eb',
    }),
    lineY(rows, {
      x: 'Date',
      y: 'average',
      stroke: '#64748b',
    }),
  ],
  x: {
    scale: scaleUtc,
    nice: true,
    axis: { label: 'Date' },
  },
  y: {
    scale: scaleLinear,
    nice: true,
    grid: true,
    axis: { label: 'Close (USD)' },
  },
})
```

The rolling average is an ordinary, visible data transform. The direct
`d3-array` and `d3-scale` imports are application dependencies. Install those
modules and their matching `@types` packages alongside TanStack Charts.
[Installation](./installation.md) lists the exact packages, and
[Scales and D3](./concepts/scales-and-d3.md) explains the ownership boundary.

<iframe
  src="https://tanstack.com/charts/catalog/embed/33-difference-chart/?theme=system&height=480"
  title="Apple close versus moving-average difference chart built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

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

| Responsibility                                                                                         | Owner                                                   |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| Common group, bin, window, normalize, select, and row-stack transforms                                 | TanStack's eager data-transform helpers                 |
| Scale choice, fixed semantic domains, interpolation, specialized statistics, and spatial algorithms    | Your application using the granular D3 modules it needs |
| Fetching, cleaning, profiling, and exploratory analysis                                                | Your data layer, server, or AI workflow                 |
| Mark-channel domain inference, responsive ranges, guide layout, scenes, rendering, and chart lifecycle | TanStack Charts                                         |
| Page controls, queries, filters, persistence, memoization, and application state                       | Your application                                        |

Prepared data can come from TanStack transforms, D3, SQL, a server, or
ordinary TypeScript; marks consume it without requiring a special series
container.

## Defaults for the common case

The normal path is intentionally short:

- Omit `width` to follow the chart container.
- Omit `margin` to measure axes, tick labels, rotation, and titles automatically.
- Supply `ariaLabel`; keyboard focus is enabled by default.
- Add the `tooltip` extension when a native value tooltip is enough.
- Let built-in marks infer stable identity from IDs or unique positions; supply
  a stable `key` when that identity is unavailable or can change.
- Let field names, datum types, scales, interaction points, and adapters infer without casts.
- Use inherited `currentColor` and the `--ts-chart-*` CSS variables for automatic theme integration.

Every automatic behavior has an explicit escape hatch. The [Guides](./guides/responsive-charts.md) cover those controls by task rather than repeating the API reference.

## Packages

| Package                         | Use it for                                                       |
| ------------------------------- | ---------------------------------------------------------------- |
| `@tanstack/charts`              | Definitions, marks, scenes, SVG, Canvas, export, and vanilla DOM |
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
- [Installation](./installation.md) — install the core, an adapter, and only the D3 modules your charts import.
- [Quick Start](./quick-start.md) — define, mount, update, and destroy a responsive chart.
- [Grammar of Graphics](./concepts/grammar-of-graphics.md) — understand how data, marks, channels, scales, and layers fit together.
- [Choosing a Chart](./guides/choosing-a-chart.md) — start from the analytical question.
- [Example Gallery](./examples/index.md) — browse complete, embeddable compositions.
- [Migrating](./guides/migrating.md) — preserve semantics and establish parity before removing an existing renderer.
- [AI Authoring](./guides/ai-authoring.md) — give an agent the smallest reliable path from intent to verified output.
