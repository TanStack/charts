# `@tanstack/react-charts`

React lifecycle adapter for `@tanstack/charts`.

> [!IMPORTANT]
> This README describes unreleased source after `0.0.0`. The API below is not
> available in the public `0.0.0` package.

After the next package release, declare the adapter, core grammar, framework
peer, and each D3 module used by your chart directly:

```sh
pnpm add @tanstack/charts @tanstack/react-charts react d3-scale
pnpm add -D @types/d3-scale @types/react
```

Add or omit granular `d3-*` modules and their matching type packages with the
chart's actual imports.

```tsx
import { defineChart } from '@tanstack/charts'
import { Chart } from '@tanstack/react-charts'

const interactiveDefinition = defineChart(definition, {
  animate: true,
  tooltip: true,
})

;<Chart
  definition={interactiveDefinition}
  aspectRatio={16 / 9}
  initialWidth={640}
  ariaLabel="Revenue by month"
  ariaDescription="Monthly revenue for the current fiscal year."
  onFocusChange={setFocusedPoint}
  onSelect={setSelectedPoint}
/>
```

Switch only the import to opt into Canvas:

```tsx
import { Chart } from '@tanstack/react-charts/canvas'
```

The default entry remains SVG-based. `@tanstack/react-charts/core` accepts an
explicit `renderer` for application-owned surfaces, and neither optional path
pulls Canvas into the default bundle.

The adapter server-renders the complete shared SVG. On the client, React owns
only the outer host; the framework-neutral chart host owns measurement,
reconciliation, animation, and interaction. Reuse the definition while its
captured values are unchanged; a new definition updates the mounted surface
without replacing it.

The definition drives all prop inference. Focus, group, selection, and render
callbacks infer the original datum. Do not add adapter generics or cast adapter
props; fix the definition, channel, or scale that TypeScript rejects.

Use `height` for a fixed-height chart or `aspectRatio` for proportional
container sizing.

Read the installed `@tanstack/charts/llms.txt` documentation map, the published
[React Quick Start](https://tanstack.com/charts/latest/docs/framework/react/quick-start),
or the
[React Adapter guide](https://tanstack.com/charts/latest/docs/framework/react/adapter).

Licensed under [MIT](./LICENSE). Project credits are in the repository
[`ACKNOWLEDGEMENTS.md`](https://github.com/TanStack/charts/blob/main/ACKNOWLEDGEMENTS.md).
