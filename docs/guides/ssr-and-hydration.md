---
title: SSR and Hydration
description: Render deterministic chart markup on the server, preserve runtime work through hydration, and handle responsive dimensions without mismatches.
---

TanStack Charts builds a platform-neutral scene before it renders SVG. React
and Octane use the same runtime implementation and SVG path on the server and
in the browser, so a chart does not need a browser-only substitute during
server rendering.

## Give the server a real size

The server cannot measure a container. Supply one of these policies:

- `width` and `height` for a fixed-size chart;
- `width` and `aspectRatio` for a fixed-width proportional chart;
- `initialWidth` and `height` for a responsive chart;
- `initialWidth` and `aspectRatio` when height should follow width.

```tsx
<Chart
  definition={trafficChart}
  input={{ rows }}
  ariaLabel="Daily traffic"
  initialWidth={720}
  aspectRatio={16 / 9}
/>
```

The adapter uses an explicit `width` before `initialWidth` when deriving the
server height. After mounting, a responsive host observes the container and
renders at its measured width. Pick an `initialWidth` close to the layout's
common size to minimize the first responsive adjustment.

See [Responsive Charts](./responsive-charts.md) for the complete size policy.

## Keep output deterministic

Server and first-client output must agree for the same definition, input, size,
and options. In particular:

- create definitions at module scope;
- sort unordered collections before creating marks;
- do not read `window`, layout, time, locale, or random values while building a
  definition;
- pass locale-sensitive formatters explicitly;
- use stable keys derived from data identity;
- provide `idPrefix` when multiple render roots need coordinated resource IDs.

Dynamic `prepare` and `chart` functions are synchronous. Fetch data in the
application's server/data layer, then pass the resolved input to the chart.

## Hydration ownership

Server and browser executions create separate runtime instances; preparation
cache is not serialized across the network. Within the browser adapter's own
initial render and layout-effect mount, the DOM host receives the already
created browser runtime instead of starting a second cache. This avoids
duplicating preparation while the client attaches behavior to its first scene.

Do not conditionally replace a chart with a different component only because
the code is executing on the server. That creates a different tree and gives
up the shared render path.

## Fonts and text measurement

Automatic guide margins depend on text metrics. The server uses deterministic
fallback measurement unless you provide `measureText`. The browser host
remeasures when fonts become available and schedules a new layout.

For strict pixel parity:

1. Use a font available in both environments.
2. Supply a deterministic `ChartTextMeasurer`.
3. Keep font size and weight in chart configuration rather than ambient,
   late-changing CSS.

Most applications should allow the browser's post-font layout correction
instead of shipping a font engine to the server.

## Render without a framework

`createChartRuntime` and `renderChartSvg` form the server boundary:

```ts
import { createChartRuntime, renderChartSvg } from '@tanstack/charts'

const runtime = createChartRuntime<TrafficRow, TrafficInput, Date, number>()
const scene = runtime.render(definition, input, { width: 720, height: 400 })

const svg = renderChartSvg(scene, {
  ariaLabel: 'Daily traffic',
  idPrefix: 'traffic',
})

runtime.destroy()
```

`renderChartSvg` returns a string and does not require a DOM. Browser-only
focus, tooltip, reconciliation, animation, and image export begin at
`mountChart`.

## Hydration checklist

- Server input is fully resolved before chart rendering.
- Initial dimensions are explicit and representative.
- Definition, preparation, and formatting are deterministic.
- Keys and `idPrefix` are stable.
- The same adapter and definition render on both sides.
- Browser-only work lives in host callbacks or application effects.
- Font-driven relayout is expected or a text measurer is supplied.

See [React Adapter](../framework/react/adapter.md),
[Octane Adapter](../framework/octane/adapter.md), and
[Runtime and Scene](../reference/runtime-and-scene.md) for the exact contracts.
