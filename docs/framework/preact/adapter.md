---
title: Preact Adapter
description: Render and hydrate TanStack Charts with Preact.
---

Install the core, adapter, framework peer, and authored D3 modules:

```sh
pnpm add @tanstack/charts @tanstack/preact-charts preact d3-scale
```

```tsx
import { defineChart } from '@tanstack/charts'
import { tooltip } from '@tanstack/charts/tooltip'
import { Chart } from '@tanstack/preact-charts'

export function RevenueChart() {
  const definition = useMemo(
    () => defineChart(createRevenueChart(rows), { tooltip }),
    [rows],
  )

  return (
    <Chart
      definition={definition}
      ariaLabel="Revenue by month"
      aspectRatio={16 / 9}
    />
  )
}
```

`className` and `style` target the outer host. Preact owns that host; the
shared runtime owns the SVG, measurement, interaction, and cleanup. The
adapter emits the initial SVG during SSR and adopts it after mount.

## Lifecycle

The component creates one shared adapter controller, prerenders its initial
SVG, mounts it from a layout effect, forwards complete prop updates, and
destroys it on unmount. Keep stable definitions at module scope. Memoize the
complete definition when it captures component values.

## SSR and hydration

Preact server rendering emits the complete `.ts-chart-host`,
`.ts-chart-surface`, and accessible SVG. `initialWidth` controls responsive
server geometry. The generated `useId()` prefix remains stable when the server
and browser render the same tree. Keep definitions, formatters, and
dimensions deterministic.

## Presentation and rendering

`className` and `style: JSX.CSSProperties` apply to the outer host and are not
forwarded to the SVG. Custom styles are applied after adapter sizing. The
package exposes the SVG component only; use `renderSvg` to replace SVG
serialization without replacing the shared host.

Exports: `Chart`, `ChartCommonProps`, `ChartPresentationProps`, `ChartProps`,
`ChartTooltipBodyRenderContext`, `ChartDefinition`, and `ChartPoint`.

## Tooltip body composition

```tsx
<Chart
  definition={definition}
  ariaLabel="Revenue"
  renderTooltipBody={({ points, defaultBody, pinned, dismiss }) => (
    <div>
      {defaultBody}
      <SeriesDetail points={points} />
      {pinned ? <button onClick={dismiss}>Close</button> : null}
    </div>
  )}
/>
```

The shared host owns focus, placement, portaling, and dismissal. Preact owns
the returned component lifecycle inside the stable tooltip body target.

See the [`Chart` reference](./reference/chart.md), [SSR and hydration](../../guides/ssr-and-hydration.md),
and [Chart Definition API](../../reference/chart-definitions.md).
