<div align="center">
  <picture>
    <source
      media="(prefers-color-scheme: dark)"
      srcset="https://tanstack.com/api/readme/charts.png?title=TanStack%20Solid%20Charts&theme=dark"
    />
    <source
      media="(prefers-color-scheme: light)"
      srcset="https://tanstack.com/api/readme/charts.png?title=TanStack%20Solid%20Charts"
    />
    <img
      src="https://tanstack.com/api/readme/charts.png?title=TanStack%20Solid%20Charts"
      alt="TanStack Solid Charts"
      width="900"
    />
  </picture>
</div>

# `@tanstack/solid-charts`

This compatibility package remains supported for existing applications. New
applications use the Solid adapter from `@tanstack/charts/solid`.

```sh
pnpm add @tanstack/charts solid-js
```

```tsx
import { defineChart } from '@tanstack/charts'
import { tooltip } from '@tanstack/charts/tooltip'
import { Chart } from '@tanstack/charts/solid'

const interactiveDefinition = defineChart(definition, { tooltip })

;<Chart definition={interactiveDefinition} ariaLabel="Revenue by month" />
```

The adapter renders SVG during SSR and updates the shared chart host from
Solid's reactive owner.

Read the published
[Solid adapter guide](https://tanstack.com/charts/latest/docs/framework/solid/adapter)
and
[`Chart` reference](https://tanstack.com/charts/latest/docs/framework/solid/reference/chart).
