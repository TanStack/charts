# `@tanstack/angular-charts`

This compatibility package remains supported for existing applications. New
applications use the Angular standalone component from
`@tanstack/charts/angular`.

```sh
pnpm add @tanstack/charts @angular/core @angular/platform-browser
```

```ts
import { defineChart } from '@tanstack/charts'
import { tooltip } from '@tanstack/charts/tooltip'
import { Chart } from '@tanstack/charts/angular'

@Component({
  imports: [Chart],
  template: `<tanstack-chart [options]="chartOptions" />`,
})
export class RevenueChart {
  chartOptions = {
    definition: defineChart(definition, { tooltip }),
    ariaLabel: 'Revenue by month',
  }
}
```

The component accepts one typed `options` input so Angular can track it as a
single signal or immutable value.

Read the published
[Angular adapter guide](https://tanstack.com/charts/latest/docs/framework/angular/adapter)
and
[`Chart` reference](https://tanstack.com/charts/latest/docs/framework/angular/reference/chart).
