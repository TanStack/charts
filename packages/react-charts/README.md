# `@tanstack/react-charts`

React lifecycle adapter for `@tanstack/charts`.

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

The adapter server-renders the complete shared SVG. On the client, React owns
only the outer host; the framework-neutral chart host owns measurement,
reconciliation, animation, and interaction. Structurally equal inline input
does not replace the live SVG.

The definition drives all prop inference. Dynamic definitions require their
exact `input` shape, and focus, group, selection, and render callbacks infer the
original datum. Do not add `<Chart<Row, Input>>` generics or cast adapter props;
fix the definition, channel, or scale that TypeScript rejects.

Use `height` for a fixed-height chart or `aspectRatio` for proportional
container sizing.

Read the main package documentation at
[`../charts-core/llms.txt`](../charts-core/llms.txt).
