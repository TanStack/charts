# `@tanstack/octane-charts`

Native TSRX lifecycle adapter for `@tanstack/charts`.

Declare the adapter, core grammar, framework peer, and each D3 module used by
your chart directly:

```sh
pnpm add @tanstack/charts @tanstack/octane-charts octane d3-scale
pnpm add -D @types/d3-scale
```

Add or omit granular `d3-*` modules and their matching type packages with the
chart's actual imports.

```tsx
import { Chart } from '@tanstack/octane-charts'

;<Chart
  definition={definition}
  input={{ rows, metric }}
  aspectRatio={16 / 9}
  initialWidth={640}
  ariaLabel="Revenue by month"
  animate
  tooltip
  onSelect={setSelectedPoint}
/>
```

Octane and React consume the same definitions, scene renderer, responsive host,
SSR output, interaction values, and theme tokens.

The definition drives all prop inference. Dynamic definitions require their
exact `input` shape, and focus, group, selection, and render callbacks infer the
original datum. Do not add `Chart<Row, Input>` generics or cast adapter props;
fix the definition, channel, or scale that TypeScript rejects.

Use `height` for a fixed-height chart or `aspectRatio` for proportional
container sizing.

Read the installed `@tanstack/charts/llms.txt` documentation map, the published
[Octane Quick Start](https://tanstack.com/charts/latest/docs/framework/octane/quick-start),
or the
[Octane Adapter guide](https://tanstack.com/charts/latest/docs/framework/octane/adapter).

Licensed under [MIT](./LICENSE). Project credits are in the repository
[`ACKNOWLEDGEMENTS.md`](https://github.com/TanStack/charts/blob/main/ACKNOWLEDGEMENTS.md).
