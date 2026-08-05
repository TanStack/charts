# `@tanstack/octane-charts`

Native TSRX lifecycle adapter for `@tanstack/charts`.

Declare the adapter, core grammar, compact scales, and framework peer:

```sh
pnpm add @tanstack/charts @tanstack/charts-scales @tanstack/octane-charts octane
```

Add granular `d3-*` modules and their matching type packages only when the
chart needs scale or algorithm semantics outside the compact set.

```tsx
import { defineChart } from '@tanstack/charts'
import { tooltip } from '@tanstack/charts/tooltip'
import { Chart } from '@tanstack/octane-charts'

const interactiveDefinition = defineChart(definition, {
  animate: true,
  tooltip,
})

;<Chart
  definition={interactiveDefinition}
  aspectRatio={16 / 9}
  initialWidth={640}
  ariaLabel="Revenue by month"
  onSelect={setSelectedPoint}
/>
```

Switch only the import to opt into Canvas:

```tsx
import { Chart } from '@tanstack/octane-charts/canvas'
```

The default entry remains SVG-based.
`@tanstack/octane-charts/core` accepts an explicit `renderer` for
application-owned surfaces, and neither optional path pulls Canvas into the
default bundle.

Octane and React consume the same definitions, scene renderer, responsive host,
SSR output, interaction values, and theme tokens.

The definition drives all prop inference. Focus, group, selection, and render
callbacks infer the original datum. Do not add adapter generics or cast adapter
props; fix the definition, channel, or scale that TypeScript rejects.

Use `height` for a fixed-height chart or `aspectRatio` for proportional
container sizing.

Read the installed `@tanstack/charts/llms.txt` documentation map, the published
[Octane Quick Start](https://tanstack.com/charts/latest/docs/framework/octane/quick-start),
or the
[Octane Adapter guide](https://tanstack.com/charts/latest/docs/framework/octane/adapter).

Licensed under [MIT](./LICENSE). Project credits are in the repository
[`ACKNOWLEDGEMENTS.md`](https://github.com/TanStack/charts/blob/main/ACKNOWLEDGEMENTS.md).
