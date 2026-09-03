<div align="center">
  <picture>
    <source
      media="(prefers-color-scheme: dark)"
      srcset="https://tanstack.com/api/readme/charts.png?title=TanStack%20Svelte%20Charts&theme=dark"
    />
    <source
      media="(prefers-color-scheme: light)"
      srcset="https://tanstack.com/api/readme/charts.png?title=TanStack%20Svelte%20Charts"
    />
    <img
      src="https://tanstack.com/api/readme/charts.png?title=TanStack%20Svelte%20Charts"
      alt="TanStack Svelte Charts"
      width="900"
    />
  </picture>
</div>

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
