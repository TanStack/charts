<div align="center">
  <picture>
    <source
      media="(prefers-color-scheme: dark)"
      srcset="https://tanstack.com/api/readme/charts.png?title=TanStack%20Octane%20Charts&theme=dark"
    />
    <source
      media="(prefers-color-scheme: light)"
      srcset="https://tanstack.com/api/readme/charts.png?title=TanStack%20Octane%20Charts"
    />
    <img
      src="https://tanstack.com/api/readme/charts.png?title=TanStack%20Octane%20Charts"
      alt="TanStack Octane Charts"
      width="900"
    />
  </picture>
</div>

# `@tanstack/octane-charts`

This compatibility package remains supported for existing applications. New
applications use the native TSRX adapter from `@tanstack/charts/octane`.

Install Charts and the Octane peer:

```sh
pnpm add @tanstack/charts octane
```

Add granular `d3-*` modules and their matching type packages only when the
chart needs scale or algorithm semantics outside the compact set.

```tsx
import { defineChart } from '@tanstack/charts'
import { tooltip } from '@tanstack/charts/tooltip'
import { Chart } from '@tanstack/charts/octane'

const interactiveDefinition = defineChart(definition, {
  svgAnimation: true,
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
import { Chart } from '@tanstack/charts/octane/canvas'
```

The default entry remains SVG-based.
`@tanstack/charts/octane/core` accepts an explicit `renderer` for
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
