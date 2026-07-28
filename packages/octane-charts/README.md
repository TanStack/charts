# `@tanstack/octane-charts`

Native TSRX lifecycle adapter for `@tanstack/charts`.

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

Read the main package documentation at
[`../charts-core/llms.txt`](../charts-core/llms.txt).
