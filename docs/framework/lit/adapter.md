---
title: Lit Adapter
description: Render TanStack Charts with a light-DOM Lit custom element.
---

```sh
pnpm add @tanstack/charts @tanstack/lit-charts lit d3-scale
```

Register the element once:

```ts
import { defineChartElement } from '@tanstack/lit-charts'

defineChartElement()
```

Pass chart options as a property:

```ts
html`<tanstack-chart
  .options=${{
    definition,
    input: { rows },
    ariaLabel: 'Revenue by month',
    tooltip: true,
  }}
></tanstack-chart>`
```

The element uses light DOM so it inherits application fonts and chart theme
variables. Use a custom tag name with `defineChartElement('revenue-chart')`.

Exports: `Chart`, `defineChartElement`, `ChartCommonProps`,
`ChartPresentationProps`, `ChartProps`, `DynamicChartProps`,
`StaticChartProps`, `ChartDefinition`, and `ChartPoint`.
