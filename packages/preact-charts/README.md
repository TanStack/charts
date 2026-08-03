<div align="center">
  <picture>
    <source
      media="(prefers-color-scheme: dark)"
      srcset="https://tanstack.com/api/readme/charts.png?title=TanStack%20Preact%20Charts&theme=dark"
    />
    <source
      media="(prefers-color-scheme: light)"
      srcset="https://tanstack.com/api/readme/charts.png?title=TanStack%20Preact%20Charts"
    />
    <img
      src="https://tanstack.com/api/readme/charts.png?title=TanStack%20Preact%20Charts"
      alt="TanStack Preact Charts"
      width="900"
    />
  </picture>
</div>

# `@tanstack/preact-charts`

Preact lifecycle adapter for `@tanstack/charts`.

```sh
pnpm add @tanstack/charts @tanstack/preact-charts preact d3-scale
```

```tsx
import { defineChart } from '@tanstack/charts'
import { tooltip } from '@tanstack/charts/tooltip'
import { Chart } from '@tanstack/preact-charts'

const interactiveDefinition = defineChart(definition, { tooltip })

;<Chart definition={interactiveDefinition} ariaLabel="Revenue by month" />
```

The adapter renders SVG on the server and adopts it on the client. Chart
definitions, rendering, interaction, and animation remain in
`@tanstack/charts`.

Read the published
[Preact adapter guide](https://tanstack.com/charts/latest/docs/framework/preact/adapter)
and
[`Chart` reference](https://tanstack.com/charts/latest/docs/framework/preact/reference/chart).
