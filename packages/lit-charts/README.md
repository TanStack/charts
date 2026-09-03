# `@tanstack/lit-charts`

This compatibility package remains supported for existing applications. New
applications use the Lit custom-element adapter from `@tanstack/charts/lit`.

```sh
pnpm add @tanstack/charts lit
```

```ts
import { defineChart } from '@tanstack/charts'
import { tooltip } from '@tanstack/charts/tooltip'
import { defineChartElement } from '@tanstack/charts/lit'

defineChartElement()
```

```ts
html`<tanstack-chart
  .options=${{
    definition: defineChart(definition, { tooltip }),
    ariaLabel: 'Revenue by month',
  }}
></tanstack-chart>`
```

The element renders in light DOM so inherited typography, responsive
measurement, and chart styles behave like the framework-neutral host.

Read the published
[Lit adapter guide](https://tanstack.com/charts/latest/docs/framework/lit/adapter)
and
[`Chart` reference](https://tanstack.com/charts/latest/docs/framework/lit/reference/chart).
