---
title: React Adapter
description: Understand the thin React lifecycle, SSR, hydration, update, sizing, class, and style behavior around the shared chart host.
---

`@tanstack/react-charts` is a thin lifecycle and SSR adapter around
`@tanstack/charts`. Chart definitions, scale resolution, guide layout, scenes,
SVG rendering, reconciliation, animation, and interaction remain in the
framework-neutral core.

## Public exports

```ts
export { Chart } from '@tanstack/react-charts'

export type {
  ChartCommonProps,
  ChartProps,
  DynamicChartProps,
  StaticChartProps,
  ChartDefinition,
  ChartPoint,
} from '@tanstack/react-charts'
```

Use the re-exported definition and point types only when an application API
needs an explicit annotation. Ordinary component use is inferred.

## Render lifecycle

The adapter creates one `ChartRuntime` per mounted component and renders the
initial complete SVG during React render. After commit:

1. a layout effect mounts the shared DOM host into the existing chart surface
2. the same runtime is passed to the host, preserving prepared data
3. a second layout effect forwards the latest complete host options
4. later React commits call `host.update`
5. effect cleanup destroys the host and runtime-owned browser behavior

The chart surface is memoized after its first render. Dynamic changes are
reconciled by the shared host rather than by rebuilding the SVG element tree
through React.

React batching may omit intermediate application states. Every committed prop
set forwarded to the host remains declarative and complete.

## SSR and hydration

Server rendering emits:

- the outer `.ts-chart-host` div
- a `.ts-chart-surface` div
- the complete accessible shared SVG at `initialWidth`

The client renders the same initial structure, then the layout effect adopts
and reconciles that SVG. There is no placeholder-only server mode.

Use deterministic data, scale domains, definitions, dimensions, and custom
renderers on server and client. The adapter generates a sanitized `idPrefix`
from `React.useId()` when one is not supplied, keeping document resources
stable through hydration.

`tabIndex` defaults to `0` on both server and client. `keyboard: false` forces
it to `-1`.

For resource-aware gradients or clipping, pass the same renderer on both
server and client. See
[Rendering and export](../../reference/rendering-and-export.md#resource-aware-svg).

## Sizing and layout

The adapter renders two nested containers:

```text
.ts-chart-host
  .ts-chart-surface
    svg.ts-chart
```

The outer host has `position: relative`.

| Props                               | Outer host behavior             | Scene behavior                  |
| ----------------------------------- | ------------------------------- | ------------------------------- |
| no `width`, fixed `height`          | `width: 100%`; fixed height     | container width × fixed height  |
| fixed `width` and `height`          | fixed CSS width and height      | same fixed scene dimensions     |
| fixed `width` and `aspectRatio`     | fixed width and CSS ratio       | fixed width divided by ratio    |
| positive `aspectRatio`, no `height` | `width: 100%`; CSS aspect ratio | measured width divided by ratio |
| neither `height` nor `aspectRatio`  | `width: 100%`; `height: 320px`  | measured width × 320            |

`initialWidth` defaults to `640` and controls the initial/server scene when
`width` is absent. A fixed `height` takes precedence over `aspectRatio`.
Nonpositive and nonfinite ratios fall back to the default height.

The DOM host observes responsive width and measures the inherited container
font. Its exact fallback and relayout behavior is documented in
[DOM host](../../reference/dom-host.md#responsive-sizing).

## `className` and `style`

React-specific presentation props apply to the outer `.ts-chart-host`:

```tsx
<Chart
  definition={definition}
  ariaLabel="Revenue"
  className="dashboard-chart"
  style={{ minHeight: 240, color: 'var(--foreground)' }}
/>
```

- `className` is appended after `ts-chart-host`.
- `style` is `React.CSSProperties`.
- custom style fields override the adapter's computed position, width, height,
  and aspect ratio because they are spread last.

Do not give `style.width` a value that conflicts with a fixed `width` prop. The
style controls the outer CSS box, while the prop continues to lock the scene
width.

Core `RenderChartSvgOptions.className` applies to an SVG when calling the
renderer directly. The React adapter's `className` intentionally owns the
outer element instead.

## Definition and input identity

Define a fixed chart outside component render:

```tsx
import { defineChart } from '@tanstack/charts'

const definition = defineChart({
  marks: [],
  x: null,
  y: null,
})
```

For live state, keep one dynamic definition stable and pass changing values in
`input`. Creating a new definition each render clears runtime preparation
state. Input equality and preparation caching are core definition concerns;
see [Chart Definition API](../../reference/chart-definitions.md).

## Callback freshness

Every committed prop set is forwarded to the host. Focus, grouped focus,
selection, and render callbacks therefore use the latest committed functions.
Callback types are inferred from the definition's marks.

## Core boundary

The adapter does not redefine:

- marks or chart specs
- D3 scale and transform ownership
- tooltip and focus semantics
- animation and reconciliation
- custom marks or renderers

Use [Scales and D3](../../concepts/scales-and-d3.md) for the injected primitive
boundary and the [core reference](../../reference/index.md) for those APIs.
