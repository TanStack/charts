# `@tanstack/svelte-charts`

Svelte 5 lifecycle adapter for `@tanstack/charts`.

```sh
pnpm add @tanstack/charts @tanstack/svelte-charts svelte d3-scale
```

```svelte
<script lang="ts">
  import { defineChart } from '@tanstack/charts'
  import { tooltip } from '@tanstack/charts/tooltip'
  import { Chart } from '@tanstack/svelte-charts'

  const interactiveDefinition = defineChart(definition, { tooltip })
</script>

<Chart definition={interactiveDefinition} ariaLabel="Revenue by month" />
```

The adapter renders SVG during SSR and adopts it after mount.

Read the published
[Svelte adapter guide](https://tanstack.com/charts/latest/docs/framework/svelte/adapter)
and
[`Chart` reference](https://tanstack.com/charts/latest/docs/framework/svelte/reference/chart).
