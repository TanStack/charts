---
title: Vue Adapter
description: Render and hydrate TanStack Charts with Vue 3.
---

```sh
pnpm add @tanstack/charts @tanstack/vue-charts vue d3-scale
```

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { Chart } from '@tanstack/vue-charts'

const definition = computed(() => createRevenueChart(rows.value))
</script>

<template>
  <Chart
    :definition="definition"
    aria-label="Revenue by month"
    :aspect-ratio="16 / 9"
    :tooltip="true"
    @focus-change="focused = $event"
  />
</template>
```

Vue prop updates call the shared host after each component update. `class` and
`style` target the outer host. Vue SSR renders the initial SVG.

## Lifecycle

The component prerenders through one shared adapter controller, mounts it in
`onMounted`, forwards the latest complete props in `onUpdated`, and destroys it
in `onBeforeUnmount`. Keep stable definitions at module scope. Use `computed`
for definitions that capture reactive values.

## SSR and hydration

Vue SSR emits the complete `.ts-chart-host`, `.ts-chart-surface`, and
accessible SVG. `initialWidth` controls responsive server geometry. Vue's
`useId()` provides a stable generated resource prefix when server and browser
render the same tree. Keep definitions, formatters, and dimensions
deterministic.

## Presentation and rendering

`class` and `style: StyleValue` apply to the outer host. `className` applies to
the rendered SVG surface. The component disables general attribute
inheritance; unrelated attributes are not forwarded. The package exposes the
SVG component only; use `renderSvg` to replace SVG serialization without
replacing the shared host.

Exports: `Chart`, `ChartCommonProps`, `ChartPresentationProps`, `ChartProps`,
`ChartDefinition`, and `ChartPoint`.

See the [`Chart` reference](./reference/chart.md), [SSR and hydration](../../guides/ssr-and-hydration.md),
and [Chart Definition API](../../reference/chart-definitions.md).
