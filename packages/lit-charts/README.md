<div align="center">
  <picture>
    <source
      media="(prefers-color-scheme: dark)"
      srcset="https://tanstack.com/api/readme/charts.png?title=TanStack%20Lit%20Charts&theme=dark"
    />
    <source
      media="(prefers-color-scheme: light)"
      srcset="https://tanstack.com/api/readme/charts.png?title=TanStack%20Lit%20Charts"
    />
    <img
      src="https://tanstack.com/api/readme/charts.png?title=TanStack%20Lit%20Charts"
      alt="TanStack Lit Charts"
      width="900"
    />
  </picture>
</div>

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
