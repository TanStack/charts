---
title: SSR and Hydration
description: Render deterministic chart markup on the server, preserve runtime work through hydration, and handle responsive dimensions without mismatches.
---

TanStack Charts builds a platform-neutral scene before the selected renderer
produces output. React, Preact, Vue, Solid, Svelte, and Octane use the same
runtime and renderer on the server and in the browser.

## Adapter support

| Adapter                                    | Server output                       | Browser contract                                    |
| ------------------------------------------ | ----------------------------------- | --------------------------------------------------- |
| [React](../framework/react/adapter.md)     | Complete SVG; Canvas shell          | Hydrates and adopts the existing surface            |
| [Preact](../framework/preact/adapter.md)   | Complete SVG                        | Hydrates before the shared host mounts              |
| [Vue](../framework/vue/adapter.md)         | Complete SVG                        | Hydrates before the shared host mounts              |
| [Solid](../framework/solid/adapter.md)     | Complete SVG                        | Hydrates before the shared host mounts              |
| [Svelte](../framework/svelte/adapter.md)   | Complete SVG                        | Hydrates before the shared host mounts              |
| [Octane](../framework/octane/adapter.md)   | Complete SVG; Canvas shell          | Hydrates and adopts the existing surface            |
| [Angular](../framework/angular/adapter.md) | Not yet a verified adapter contract | Browser mount, immutable update, and teardown       |
| [Lit](../framework/lit/adapter.md)         | Not yet a verified adapter contract | Browser registration, update, disconnect, reconnect |
| [Alpine](../framework/alpine/adapter.md)   | None                                | Browser-only directive                              |

For adapters with server output, the browser must render the same definition,
dimensions, formatters, and component tree. Angular and Lit may run
inside applications with their own server infrastructure, but this library
does not yet promise or test adapter hydration for them.

## Give the server a real size

The server cannot measure a container. Supply one of these policies:

- `width` and `height` for a fixed-size chart;
- `width` and `aspectRatio` for a fixed-width proportional chart;
- `initialWidth` and `height` for a responsive chart;
- `initialWidth` and `aspectRatio` when height should follow width.

```tsx
<Chart
  definition={trafficChart}
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

Server and first-client output must agree for the same definition, size, and
options. In particular:

- keep fixed definitions at module scope and recreate captured-data definitions
  from the same resolved data;
- sort unordered collections before creating marks;
- do not read `window`, layout, time, locale, or random values while building a
  definition;
- pass locale-sensitive formatters explicitly;
- rely on inferred IDs or unique positions, and supply explicit keys when the
  data has no stable identity;
- provide `idPrefix` when multiple render roots need coordinated resource IDs.

Responsive chart functions are synchronous. Fetch and transform data in the
application's server/data layer, then capture the resolved data in the
definition.

## Hydration ownership

Server and browser executions create separate runtime instances. Within the
browser adapter's own initial render and layout-effect mount, the DOM host
receives the already created browser runtime.

Do not conditionally replace a chart with a different component only because
the code is executing on the server. That creates a different tree and gives
up the shared render path.

## Canvas server shell

`@tanstack/react-charts/canvas` and `@tanstack/octane-charts/canvas` render a
deterministic accessible shell on the server: a named chart root and two
`aria-hidden` canvas elements with the initial scene dimensions. No server
Canvas API or pixel painting is required.

The client renders the same shell, adopts its existing root and canvases, sizes
their backing stores for the device-pixel ratio, paints the scene, and attaches
the shared interaction host. The first image appears after client mount; use
the default SVG adapter when visible server-rendered geometry is required.

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

const runtime = createChartRuntime<TrafficRow, Date, number>()
const scene = runtime.render(definition, { width: 720, height: 400 })

const svg = renderChartSvg(scene, {
  ariaLabel: 'Daily traffic',
  idPrefix: 'traffic',
})

runtime.destroy()
```

`renderChartSvg` returns a string and does not require a DOM. A custom
`ChartRenderer.prerender` may produce another deterministic shell. Browser-only
focus, tooltip, reconciliation or paint, animation, and export begin when its
surface mounts.

## Hydration checklist

- Server data is fully resolved before chart rendering.
- Initial dimensions are explicit and representative.
- Definition, transformed data, and formatting are deterministic.
- Keys and `idPrefix` are stable.
- The same adapter and definition render on both sides.
- Browser-only work lives in host callbacks or application effects.
- Font-driven relayout is expected or a text measurer is supplied.

See the selected framework adapter page and
[Runtime and Scene](../reference/runtime-and-scene.md) for the exact contracts.
