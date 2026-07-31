---
title: Svelte Adapter
description: Render and hydrate TanStack Charts with Svelte 5.
---

```sh
pnpm add @tanstack/charts @tanstack/svelte-charts svelte d3-scale
```

```svelte
<script lang="ts">
  import { defineChart } from '@tanstack/charts'
  import { tooltip } from '@tanstack/charts/tooltip'
  import { Chart } from '@tanstack/svelte-charts'

  const definition = $derived(
    defineChart(createRevenueChart(rows), { tooltip }),
  )
</script>

<Chart
  {definition}
  ariaLabel="Revenue by month"
  aspectRatio={16 / 9}
/>
```

The component uses Svelte 5 callback props and hydration-stable IDs. `class`
and the string `style` prop target the outer host.

## Lifecycle

The component creates one shared adapter controller, forwards reactive props
from an effect, mounts it in `onMount`, and destroys it through the mount
cleanup. Keep stable definitions at module scope. Derive the complete
definition when it captures reactive values.

## SSR and hydration

Svelte server rendering emits the complete `.ts-chart-host`,
`.ts-chart-surface`, and accessible SVG. `initialWidth` controls responsive
server geometry. `$props.id()` supplies the hydration-stable generated
resource prefix. Keep server and browser definitions, formatters, and
dimensions deterministic.

## Presentation and rendering

`class` and the string `style` prop apply to the outer host. `className`
applies to the rendered SVG surface. Interaction hooks such as
`onFocusChange` are callback props, not dispatched Svelte events. The package
exposes the SVG component only; use `renderSvg` to replace SVG serialization
without replacing the shared host.

Exports: `Chart`, `ChartCommonProps`, `ChartPresentationProps`, `ChartProps`,
`ChartTooltipBodySnippetContext`, `ChartDefinition`, and `ChartPoint`.

## Tooltip body composition

Pass a Svelte 5 `tooltipBody` snippet to render framework-owned content. Call
`defaultBody()` to retain native rows and swatches. The shared host owns focus,
placement, portaling, inert transient state, pinning, and dismissal; Svelte
owns the snippet lifecycle inside the body target.

See the [`Chart` reference](./reference/chart.md), [SSR and hydration](../../guides/ssr-and-hydration.md),
and [Chart Definition API](../../reference/chart-definitions.md).
