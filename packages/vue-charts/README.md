# `@tanstack/vue-charts`

Vue lifecycle adapter for `@tanstack/charts`.

```sh
pnpm add @tanstack/charts @tanstack/vue-charts vue d3-scale
```

```vue
<script setup lang="ts">
import { defineChart } from '@tanstack/charts'
import { Chart } from '@tanstack/vue-charts'

const interactiveDefinition = defineChart(definition, { tooltip: true })
</script>

<template>
  <Chart :definition="interactiveDefinition" aria-label="Revenue by month" />
</template>
```

The adapter renders SVG during Vue SSR and adopts it after mount.

Read the published
[Vue adapter guide](https://tanstack.com/charts/latest/docs/framework/vue/adapter)
and
[`Chart` reference](https://tanstack.com/charts/latest/docs/framework/vue/reference/chart).
