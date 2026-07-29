---
title: Preact Adapter
description: Render and hydrate TanStack Charts with Preact.
---

Install the core, adapter, framework peer, and authored D3 modules:

```sh
pnpm add @tanstack/charts @tanstack/preact-charts preact d3-scale
```

```tsx
import { Chart } from '@tanstack/preact-charts'

export function RevenueChart() {
  return (
    <Chart
      definition={definition}
      input={{ rows }}
      ariaLabel="Revenue by month"
      aspectRatio={16 / 9}
      tooltip
    />
  )
}
```

`className` and `style` target the outer host. Preact owns that host; the
shared runtime owns the SVG, measurement, interaction, and cleanup. The
adapter emits the initial SVG during SSR and adopts it after mount.

Exports: `Chart`, `ChartCommonProps`, `ChartPresentationProps`, `ChartProps`,
`DynamicChartProps`, `StaticChartProps`, `ChartDefinition`, and `ChartPoint`.
