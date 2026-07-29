# `@tanstack/svelte-charts`

Svelte 5 lifecycle adapter for `@tanstack/charts`.

```sh
pnpm add @tanstack/charts @tanstack/svelte-charts svelte d3-scale
```

```svelte
<script lang="ts">
  import { Chart } from '@tanstack/svelte-charts'
</script>

<Chart {definition} ariaLabel="Revenue by month" tooltip />
```

The adapter renders SVG during SSR and adopts it after mount.
