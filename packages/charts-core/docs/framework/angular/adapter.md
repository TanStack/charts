---
title: Angular Adapter
description: Render TanStack Charts with an Angular standalone component.
---

```sh
pnpm add @tanstack/charts @tanstack/angular-charts @angular/common @angular/core @angular/platform-browser d3-scale
```

```ts
import { Component } from '@angular/core'
import { Chart } from '@tanstack/angular-charts'
import { defineChart } from '@tanstack/charts'
import { tooltip } from '@tanstack/charts/tooltip'

@Component({
  imports: [Chart],
  template: `<tanstack-chart [options]="chartOptions" />`,
})
export class RevenueChart {
  chartOptions = {
    definition: defineChart(createRevenueChart(rows), { tooltip }),
    ariaLabel: 'Revenue by month',
    aspectRatio: 16 / 9,
  }
}
```

The single `options` input works with immutable values and signals. The
standalone component ships as a partial-compiled Angular package.

## Lifecycle

`ngOnChanges` creates or updates one shared adapter controller.
`ngAfterViewInit` mounts it into the prerendered surface, and `ngOnDestroy`
cleans it up. Replace the complete `options` value when chart state changes;
mutating the existing object does not produce an `OnPush` input change.
Callbacks such as `onFocusChange` are functions inside `options`, not Angular
outputs.

## Browser and server status

The verified package contract covers browser mount, immutable updates, and
teardown. Angular application SSR and hydration are not yet part of the
adapter's tested public contract.

## Presentation and rendering

`options.class` and the string `options.style` apply to the inner
`.ts-chart-host`; `options.className` applies to the rendered SVG surface. The
package exposes the SVG component only. Use `renderSvg` to replace SVG
serialization without replacing the shared host.

Exports: `Chart`, `ChartCommonOptions`, `ChartOptions`,
`ChartPresentationOptions`, `ChartTooltipBodyDirective`,
`ChartTooltipBodyRenderContext`, `ChartTooltipBodyTemplateContext`,
`ChartDefinition`, and `ChartPoint`.

## Tooltip body composition

Project an `ng-template` with
`[tanstackChartTooltipBody]="chartOptions.definition"` for Angular-owned
content. The definition binding is the generic type witness for strict template
checking; it does not configure behavior a second time. Render
`tooltip.defaultBody` through `NgTemplateOutlet` to retain native rows and
swatches. The shared host owns focus, placement, portaling, inert transient
state, pinning, and dismissal; Angular owns the embedded-view lifecycle.

See the [`Chart` reference](./reference/chart.md) and
[Chart Definition API](../../reference/chart-definitions.md).
