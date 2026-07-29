# `@tanstack/react-charts`

React lifecycle adapter for `@tanstack/charts`.

Declare the adapter, core grammar, framework peer, and each D3 module used by
your chart directly:

```sh
pnpm add @tanstack/charts @tanstack/react-charts react d3-scale
pnpm add -D @types/d3-scale @types/react
```

Add or omit granular `d3-*` modules and their matching type packages with the
chart's actual imports.

```tsx
import { Chart } from '@tanstack/react-charts'

;<Chart
  definition={definition}
  input={{ rows, metric }}
  aspectRatio={16 / 9}
  initialWidth={640}
  ariaLabel="Revenue by month"
  ariaDescription="Monthly revenue for the current fiscal year."
  animate
  tooltip
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
reconciliation, animation, and interaction. Shallow-equal inline plain-object
input does not replace the live SVG.

The definition drives all prop inference. Dynamic definitions require their
exact `input` shape, and focus, group, selection, and render callbacks infer the
original datum. Do not add `<Chart<Row, Input>>` generics or cast adapter props;
fix the definition, channel, or scale that TypeScript rejects.

Use `height` for a fixed-height chart or `aspectRatio` for proportional
container sizing.

Read the installed `@tanstack/charts/llms.txt` documentation map, the published
[React Quick Start](https://tanstack.com/charts/latest/docs/framework/react/quick-start),
or the
[React Adapter guide](https://tanstack.com/charts/latest/docs/framework/react/adapter).

Licensed under [MIT](./LICENSE). Project credits are in the repository
[`ACKNOWLEDGEMENTS.md`](https://github.com/TanStack/charts/blob/main/ACKNOWLEDGEMENTS.md).
