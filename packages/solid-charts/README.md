# `@tanstack/solid-charts`

Solid lifecycle adapter for `@tanstack/charts`.

```sh
pnpm add @tanstack/charts @tanstack/charts-scales @tanstack/solid-charts solid-js
```

```tsx
import { defineChart } from '@tanstack/charts'
import { tooltip } from '@tanstack/charts/tooltip'
import { Chart } from '@tanstack/solid-charts'

const interactiveDefinition = defineChart(definition, { tooltip })

;<Chart definition={interactiveDefinition} ariaLabel="Revenue by month" />
```

The adapter renders SVG during SSR and updates the shared chart host from
Solid's reactive owner.

Read the published
[Solid adapter guide](https://tanstack.com/charts/latest/docs/framework/solid/adapter)
and
[`Chart` reference](https://tanstack.com/charts/latest/docs/framework/solid/reference/chart).
