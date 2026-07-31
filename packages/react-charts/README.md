# `@tanstack/react-charts`

React lifecycle adapter for `@tanstack/charts`.

Declare the adapter, core grammar, framework peers, and each D3 module used by
your chart directly:

```sh
pnpm add @tanstack/charts @tanstack/react-charts react react-dom d3-scale
pnpm add -D @types/d3-scale @types/react @types/react-dom
```

Add or omit granular `d3-*` modules and their matching type packages with the
chart's actual imports.

```tsx
import { defineChart } from '@tanstack/charts'
import { tooltip } from '@tanstack/charts/tooltip'
import { Chart } from '@tanstack/react-charts'

const interactiveDefinition = defineChart(definition, {
  animate: true,
  tooltip,
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

The base `Chart` renders the core native tooltip without including React
tooltip-body composition. Import the drop-in component from `/tooltip` only
when passing `renderTooltipBody`:

```tsx
import { Chart } from '@tanstack/react-charts/tooltip'

;<Chart
  definition={interactiveDefinition}
  ariaLabel="Revenue by month"
  renderTooltipBody={({ defaultBody, pinned, dismiss }) => (
    <>
      {defaultBody}
      {pinned ? <button onClick={dismiss}>Close</button> : null}
    </>
  )}
/>
```

Existing `renderTooltipBody` users should move their component import from
`@tanstack/react-charts` to `@tanstack/react-charts/tooltip`. That entry also
exports `CanvasChart` and `RendererChart` for the same opt-in with those
renderers.

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
