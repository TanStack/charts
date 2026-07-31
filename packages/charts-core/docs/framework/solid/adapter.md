---
title: Solid Adapter
description: Render and hydrate TanStack Charts with Solid.
---

```sh
pnpm add @tanstack/charts @tanstack/solid-charts solid-js d3-scale
```

```tsx
import { defineChart } from '@tanstack/charts'
import { tooltip } from '@tanstack/charts/tooltip'
import { Chart } from '@tanstack/solid-charts'

const definition = createMemo(() =>
  defineChart(createRevenueChart(rows()), { tooltip }),
)

;<Chart
  definition={definition()}
  ariaLabel="Revenue by month"
  aspectRatio={16 / 9}
/>
```

Reactive props update the shared host without replacing its SVG. `class` and
`style` target the outer host. The component renders the initial SVG during
Solid SSR.

## Lifecycle

The component creates one shared adapter controller, forwards reactive props
from `createEffect`, mounts it in `onMount`, and destroys it in `onCleanup`.
Keep stable definitions at module scope. Use `createMemo` for definitions that
capture reactive values.

## SSR and hydration

Solid SSR emits the complete `.ts-chart-host`, `.ts-chart-surface`, and
accessible SVG. `initialWidth` controls responsive server geometry.
`createUniqueId()` supplies the generated resource prefix. Keep server and
browser definitions, formatters, and dimensions deterministic.

## Presentation and rendering

`class` and `style: JSX.CSSProperties` apply to the outer host. `className`
applies to the rendered SVG surface. Custom outer styles are spread after
adapter sizing. The package exposes the SVG component only; use `renderSvg` to
replace SVG serialization without replacing the shared host.

Exports: `Chart`, `ChartCommonProps`, `ChartPresentationProps`, `ChartProps`,
`ChartTooltipBodyRenderContext`, `ChartDefinition`, and `ChartPoint`.

## Tooltip body composition

```tsx
<Chart
  definition={definition()}
  ariaLabel="Revenue"
  renderTooltipBody={(tooltip) => (
    <div>
      {tooltip.defaultBody}
      <SeriesDetail points={tooltip.points} />
      <Show when={tooltip.pinned}>
        <button onClick={tooltip.dismiss}>Close</button>
      </Show>
    </div>
  )}
/>
```

Read the context through `tooltip` instead of destructuring it so Solid tracks
focused points and pinned state. The shared host owns focus, placement,
portaling, and dismissal; Solid owns the returned component lifecycle.

See the [`Chart` reference](./reference/chart.md), [SSR and hydration](../../guides/ssr-and-hydration.md),
and [Chart Definition API](../../reference/chart-definitions.md).
