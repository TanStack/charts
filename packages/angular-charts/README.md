# `@tanstack/angular-charts`

Angular standalone-component adapter for `@tanstack/charts`.

```sh
pnpm add @tanstack/charts @tanstack/angular-charts @angular/core @angular/platform-browser d3-scale
```

```ts
import { Chart } from '@tanstack/angular-charts'

@Component({
  imports: [Chart],
  template: `<tanstack-chart [options]="chartOptions" />`,
})
export class RevenueChart {
  chartOptions = {
    definition,
    ariaLabel: 'Revenue by month',
    tooltip: true,
  }
}
```

The component accepts one typed `options` input so Angular can track it as a
single signal or immutable value.

Read the published
[Angular adapter guide](https://tanstack.com/charts/latest/docs/framework/angular/adapter)
and
[`Chart` reference](https://tanstack.com/charts/latest/docs/framework/angular/reference/chart).
