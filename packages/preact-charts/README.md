# `@tanstack/preact-charts`

Preact lifecycle adapter for `@tanstack/charts`.

```sh
pnpm add @tanstack/charts @tanstack/preact-charts preact d3-scale
```

```tsx
import { defineChart } from '@tanstack/charts'
import { Chart } from '@tanstack/preact-charts'

const interactiveDefinition = defineChart(definition, { tooltip: true })

;<Chart definition={interactiveDefinition} ariaLabel="Revenue by month" />
```

The adapter renders SVG on the server and adopts it on the client. Chart
definitions, rendering, interaction, and animation remain in
`@tanstack/charts`.

Read the published
[Preact adapter guide](https://tanstack.com/charts/latest/docs/framework/preact/adapter)
and
[`Chart` reference](https://tanstack.com/charts/latest/docs/framework/preact/reference/chart).
