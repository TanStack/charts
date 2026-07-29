---
title: Vue Adapter
description: Render and hydrate TanStack Charts with Vue 3.
---

```sh
pnpm add @tanstack/charts @tanstack/vue-charts vue d3-scale
```

```vue
<script setup lang="ts">
import { Chart } from '@tanstack/vue-charts'
</script>

<template>
  <Chart
    :definition="definition"
    :input="{ rows }"
    aria-label="Revenue by month"
    :aspect-ratio="16 / 9"
    :tooltip="true"
    @focus-change="focused = $event"
  />
</template>
```

Vue prop updates call the shared host after each component update. `class` and
`style` target the outer host. Vue SSR renders the initial SVG.

Exports: `Chart`, `ChartCommonProps`, `ChartPresentationProps`, `ChartProps`,
`DynamicChartProps`, `StaticChartProps`, `ChartDefinition`, and `ChartPoint`.
