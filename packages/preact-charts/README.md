# `@tanstack/preact-charts`

This compatibility package remains supported for existing applications. New
applications use the Preact adapter from `@tanstack/charts/preact`.

```sh
pnpm add @tanstack/charts preact
```

```tsx
import { defineChart } from '@tanstack/charts'
import { tooltip } from '@tanstack/charts/tooltip'
import { Chart } from '@tanstack/charts/preact'

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
