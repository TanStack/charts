# `@tanstack/lit-charts`

Lit custom-element adapter for `@tanstack/charts`.

```sh
pnpm add @tanstack/charts @tanstack/lit-charts lit d3-scale
```

```ts
import { defineChart } from '@tanstack/charts'
import { tooltip } from '@tanstack/charts/tooltip'
import { defineChartElement } from '@tanstack/lit-charts'

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
