# `@tanstack/svelte-charts`

This compatibility package remains supported for existing applications. New
applications use the Svelte adapter from `@tanstack/charts/svelte`.

```sh
pnpm add @tanstack/charts svelte
```

```svelte
<script lang="ts">
  import { defineChart } from '@tanstack/charts'
  import { tooltip } from '@tanstack/charts/tooltip'
  import { Chart } from '@tanstack/charts/svelte'

  const interactiveDefinition = defineChart(definition, { tooltip })
</script>

<Chart definition={interactiveDefinition} ariaLabel="Revenue by month" />
```

The adapter renders SVG during SSR and adopts it after mount.

Read the published
[Svelte adapter guide](https://tanstack.com/charts/latest/docs/framework/svelte/adapter)
and
[`Chart` reference](https://tanstack.com/charts/latest/docs/framework/svelte/reference/chart).
