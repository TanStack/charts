---
title: Solid Adapter
description: Render and hydrate TanStack Charts with Solid.
---

```sh
pnpm add @tanstack/charts @tanstack/solid-charts solid-js d3-scale
```

```tsx
import { Chart } from '@tanstack/solid-charts'

;<Chart
  definition={definition}
  input={{ rows }}
  ariaLabel="Revenue by month"
  aspectRatio={16 / 9}
  tooltip
/>
```

Reactive props update the shared host without replacing its SVG. `class` and
`style` target the outer host. The component renders the initial SVG during
Solid SSR.

Exports: `Chart`, `ChartCommonProps`, `ChartPresentationProps`, `ChartProps`,
`DynamicChartProps`, `StaticChartProps`, `ChartDefinition`, and `ChartPoint`.
