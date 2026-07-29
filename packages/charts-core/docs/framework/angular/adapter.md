---
title: Angular Adapter
description: Render TanStack Charts with an Angular standalone component.
---

```sh
pnpm add @tanstack/charts @tanstack/angular-charts @angular/core @angular/platform-browser d3-scale
```

```ts
import { Component } from '@angular/core'
import { Chart } from '@tanstack/angular-charts'

@Component({
  imports: [Chart],
  template: `<tanstack-chart [options]="chartOptions" />`,
})
export class RevenueChart {
  chartOptions = {
    definition,
    input: { rows },
    ariaLabel: 'Revenue by month',
    aspectRatio: 16 / 9,
    tooltip: true,
  }
}
```

The single `options` input works with immutable values and signals. The
standalone component ships as a partial-compiled Angular package.

Exports: `Chart`, `ChartCommonOptions`, `ChartOptions`,
`ChartPresentationOptions`, `DynamicChartOptions`, `StaticChartOptions`,
`ChartDefinition`, and `ChartPoint`.
