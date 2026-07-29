# `@tanstack/vue-charts`

Vue lifecycle adapter for `@tanstack/charts`.

```sh
pnpm add @tanstack/charts @tanstack/vue-charts vue d3-scale
```

```vue
<script setup lang="ts">
import { Chart } from '@tanstack/vue-charts'
</script>

<template>
  <Chart :definition="definition" aria-label="Revenue by month" tooltip />
</template>
```

The adapter renders SVG during Vue SSR and adopts it after mount.
