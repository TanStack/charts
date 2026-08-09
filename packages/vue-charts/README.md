# `@tanstack/vue-charts`

This compatibility package remains supported for existing applications. New
applications use the Vue adapter from `@tanstack/charts/vue`.

```sh
pnpm add @tanstack/charts vue
```

```vue
<script setup lang="ts">
import { defineChart } from '@tanstack/charts'
import { tooltip } from '@tanstack/charts/tooltip'
import { Chart } from '@tanstack/charts/vue'

const interactiveDefinition = defineChart(definition, { tooltip })
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
