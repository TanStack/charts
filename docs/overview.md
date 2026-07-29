---
title: Overview
description: Learn what TanStack Charts provides, how its grammar works, and where charting responsibilities belong.
---

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

The same definition works with the vanilla DOM host and every framework
adapter. React and Octane also provide optional Canvas entries.

## A chart is a composition

<!-- docs-example: overview typecheck -->

```ts
import { scaleLinear, scaleUtc } from 'd3-scale'
import { areaY, defineChart, lineY, ruleY } from '@tanstack/charts'

const rows = [
  { id: 'jan', date: new Date('2026-01-01T00:00:00Z'), actual: 42, target: 38 },
  { id: 'feb', date: new Date('2026-02-01T00:00:00Z'), actual: 31, target: 35 },
  { id: 'mar', date: new Date('2026-03-01T00:00:00Z'), actual: 48, target: 44 },
  { id: 'apr', date: new Date('2026-04-01T00:00:00Z'), actual: 39, target: 46 },
]

const performanceChart = defineChart({
  marks: [
    ruleY([40], { stroke: '#94a3b8', strokeOpacity: 0.7 }),
    areaY(rows, {
      x: 'date',
      y1: 'target',
      y2: 'actual',
      key: 'id',
      fill: '#2563eb',
      fillOpacity: 0.18,
    }),
    lineY(rows, {
      x: 'date',
      y: 'actual',
      key: 'id',
      stroke: '#2563eb',
    }),
  ],
  x: {
    scale: scaleUtc()
      .domain([
        new Date('2026-01-01T00:00:00Z'),
        new Date('2026-04-01T00:00:00Z'),
      ])
      .nice(),
    label: 'Month',
  },
  y: {
    scale: scaleLinear().domain([0, 50]).nice(),
    label: 'Score',
    grid: true,
  },
})
```

The direct `d3-scale` imports in this example are application dependencies. Install `d3-scale` and `@types/d3-scale` alongside TanStack Charts. [Installation](./installation.md) lists the exact packages, and [Scales and D3](./concepts/scales-and-d3.md) explains the ownership boundary.

<iframe
  src="https://tanstack.com/charts/catalog/embed/33-difference-chart/?theme=system&height=380"
  title="Actual versus forecast difference chart built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="380"
  style="width:100%;height:380px;border:0;"
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

TanStack Charts deliberately does not hide data or spatial algorithms behind a second abstraction.

| Responsibility                                                                                     | Owner                                                   |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Scale domains, scale semantics, binning, stacking, grouping, interpolation, and spatial algorithms | Your application using the granular D3 modules it needs |
| Fetching, cleaning, profiling, and exploratory analysis                                            | Your data layer, server, or AI workflow                 |
| Marks, channels, responsive ranges, guide layout, scenes, rendering, and chart lifecycle           | TanStack Charts                                         |
| Page controls, queries, filters, persistence, and application state                                | Your application                                        |

This division keeps the core small and makes advanced work explicit. Prepared data can come from D3, SQL, a server, or ordinary TypeScript; marks consume it without requiring a special series container.

## Defaults for the common case

The normal path is intentionally short:

- Omit `width` to follow the chart container.
- Omit `margin` to measure axes, tick labels, rotation, and titles automatically.
- Supply `ariaLabel`; keyboard focus is enabled by default.
- Add `tooltip: true` at the host or adapter when a native value tooltip is enough.
- Use stable `key` channels for rows that can move, enter, or leave.
- Let field names, datum types, scales, interaction points, and adapters infer without casts.
- Use inherited `currentColor` and the `--ts-chart-*` CSS variables for automatic theme integration.

Every automatic behavior has an explicit escape hatch. The [Guides](./guides/responsive-charts.md) cover those controls by task rather than repeating the API reference.

## Packages

| Package                    | Use it for                                                       |
| -------------------------- | ---------------------------------------------------------------- |
| `@tanstack/charts`         | Definitions, marks, scenes, SVG, Canvas, export, and vanilla DOM |
| `@tanstack/react-charts`   | React `<Chart>`                                                  |
| `@tanstack/preact-charts`  | Preact `<Chart>`                                                 |
| `@tanstack/vue-charts`     | Vue `<Chart>`                                                    |
| `@tanstack/solid-charts`   | Solid `<Chart>`                                                  |
| `@tanstack/svelte-charts`  | Svelte `<Chart>`                                                 |
| `@tanstack/angular-charts` | Angular `<tanstack-chart>`                                       |
| `@tanstack/lit-charts`     | Lit `<tanstack-chart>`                                           |
| `@tanstack/alpine-charts`  | Alpine `x-chart`                                                 |
| `@tanstack/octane-charts`  | Octane `<Chart>`                                                 |

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
