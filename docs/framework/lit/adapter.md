---
title: Lit Adapter
description: Render TanStack Charts with a light-DOM Lit custom element.
---

```sh
pnpm add @tanstack/charts @tanstack/lit-charts lit d3-scale
```

Register the element once:

```ts
import { defineChartElement } from '@tanstack/lit-charts'

defineChartElement()
```

Pass chart options as a property:

```ts
import { defineChart } from '@tanstack/charts'
import { tooltip } from '@tanstack/charts/tooltip'

html`<tanstack-chart
  .options=${{
    definition: defineChart(createRevenueChart(rows), { tooltip }),
    ariaLabel: 'Revenue by month',
  }}
></tanstack-chart>`
```

The element uses light DOM so it inherits application fonts and chart theme
variables. Use a custom tag name with `defineChartElement('revenue-chart')`.

## Lifecycle

The element prerenders through one shared adapter controller, mounts after its
first update, forwards replacement `options` values, and destroys the mounted
host when disconnected. Reconnecting the same element mounts the controller
again. Assign options as a property; chart configuration is not reflected to
HTML attributes.

## Browser and server status

The verified package contract covers browser registration, update,
disconnect, and reconnect behavior. Lit SSR and hydration are not yet part of
the adapter's tested public contract. Call `defineChartElement` only where
`customElements` is available.

## Presentation and rendering

`options.class` and the string `options.style` apply to the inner
`.ts-chart-host`; `options.className` applies to the rendered SVG surface. The
package exposes the SVG custom element only. Use `renderSvg` to replace SVG
serialization without replacing the shared host.

Exports: `Chart`, `defineChartElement`, `ChartCommonProps`,
`ChartPresentationProps`, `ChartProps`, `ChartTooltipBodyRenderContext`,
`ChartDefinition`, and `ChartPoint`.

## Tooltip body composition

Set `options.renderTooltipBody` to return any Lit-renderable value. Include its
`defaultBody` `TemplateResult` to retain native rows and swatches. The shared
host owns focus, placement, portaling, inert transient state, pinning, and
dismissal; Lit owns the rendered template lifecycle.

See the [`Chart` reference](./reference/chart.md) and
[Chart Definition API](../../reference/chart-definitions.md).
