---
title: Svelte Adapter
description: Render and hydrate TanStack Charts with Svelte 5.
---

```sh
pnpm add @tanstack/charts @tanstack/svelte-charts svelte d3-scale
```

```svelte
<script lang="ts">
  import { Chart } from '@tanstack/svelte-charts'
</script>

<Chart
  {definition}
  input={{ rows }}
  ariaLabel="Revenue by month"
  aspectRatio={16 / 9}
  tooltip
/>
```

The component uses Svelte 5 callback props and hydration-stable IDs. `class`
and the string `style` prop target the outer host.

Exports: `Chart`, `ChartCommonProps`, `ChartPresentationProps`, `ChartProps`,
`DynamicChartProps`, `StaticChartProps`, `ChartDefinition`, and `ChartPoint`.
