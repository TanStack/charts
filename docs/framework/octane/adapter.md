---
title: Octane Adapter
description: Understand the native TSRX lifecycle, conditional SSR target, hydration, sizing, class, and style behavior around the shared chart host.
---

`@tanstack/octane-charts` is the native TSRX lifecycle and SSR adapter around
`@tanstack/charts`. Definitions, scenes, responsive layout, rendering,
interaction, and animation remain framework-neutral.

## Public exports

```ts
export { Chart } from '@tanstack/octane-charts'

export type {
  ChartCommonProps,
  ChartProps,
  ChartTooltipBodyRenderContext,
  ChartDefinition,
  ChartPoint,
} from '@tanstack/octane-charts'
```

Choose Canvas or an application-supplied renderer through an explicit
subpath:

```tsx
import { Chart as CanvasChart } from '@tanstack/octane-charts/canvas'
import { Chart as RendererChart } from '@tanstack/octane-charts/core'
```

The default `Chart` remains SVG-based. `CanvasChart` selects the optional
built-in renderer; `RendererChart` requires a `renderer` prop.

The package export map supplies a browser build for browser bundlers and a
separate Node build for the `node` condition.

## Render lifecycle

The adapter creates one `ChartRuntime` for each component instance and asks the
selected renderer for initial markup in TSRX. After layout:

1. `useLayoutEffect` mounts the shared DOM host into the existing chart surface
2. the initial runtime is passed through
3. a later layout effect forwards memoized host options
4. subsequent Octane updates call `host.update`; a new definition identity
   rebuilds the scene
5. cleanup destroys the host and all browser-owned behavior

The inner chart surface is memoized after its first output. The shared host
paints later scenes directly into the selected surface. Memoize definitions
that capture component values with `useMemo`; module-scope definitions need no
component memoization.

## SSR and hydration

The default Node target renders the complete `.ts-chart-host`,
`.ts-chart-surface`, and accessible SVG at `initialWidth`. The browser target
hydrates the same structure before mounting the host.

The Canvas entry renders a deterministic named root and three `aria-hidden`
canvases on the server. It paints no server pixels. The browser adopts the
elements, paints after mount, and attaches the same focus, keyboard, tooltip,
and selection host.

Keep data, definitions, scale domains, custom renderers, and dimensions
deterministic between server and browser. The adapter generates a sanitized
resource prefix from Octane's `useId()` when `idPrefix` is absent.

`tabIndex` defaults to `0` on both targets. `keyboard: false` forces it to
`-1`.

Pass `renderChartSvgWithResources` on both targets for gradients and clipping;
see [Rendering and export](../../reference/rendering-and-export.md#resource-aware-svg).

## Sizing and layout

The rendered structure is:

```text
.ts-chart-host
  .ts-chart-surface
    svg.ts-chart | div.ts-chart-canvas
```

The outer host uses `position: relative`.

| Props                               | Outer host behavior             | Scene behavior                  |
| ----------------------------------- | ------------------------------- | ------------------------------- |
| no `width`, fixed `height`          | `width: 100%`; fixed height     | container width × fixed height  |
| fixed `width` and `height`          | fixed CSS dimensions            | same fixed scene dimensions     |
| fixed `width` and `aspectRatio`     | fixed width and CSS ratio       | fixed width divided by ratio    |
| positive `aspectRatio`, no `height` | `width: 100%`; CSS aspect ratio | measured width divided by ratio |
| neither `height` nor `aspectRatio`  | `width: 100%`; `height: 320px`  | measured width × 320            |

`initialWidth` defaults to `640`. A fixed `height` takes precedence over
`aspectRatio`; nonpositive and nonfinite ratios fall back to the default
height. Responsive measurement and inherited font relayout are shared with the vanilla
[DOM host](../../reference/dom-host.md#responsive-sizing).

## `class` and `style`

Octane-specific presentation props apply to the outer host:

```tsx
<Chart
  definition={definition}
  ariaLabel="Revenue"
  class="dashboard-chart"
  style={{
    minHeight: 240,
    color: 'var(--foreground)',
  }}
/>
```

- `class` is appended after `ts-chart-host`.
- `style` is `Record<string, string | number | undefined>`.
- styles are spread after adapter sizing, so they can override position,
  width, height, or aspect ratio.

Do not conflict a fixed `width` prop with `style.width`. The style changes the
outer CSS box while the prop continues to lock scene measurement.

The core renderer's `className` option applies to a directly rendered surface,
not the Octane outer host.

## Definition and option identity

Keep fixed definitions outside component execution. Keep one dynamic
definition stable until a captured application value changes.

The adapter memoizes host options from semantic props. Callback functions are
held in refs, so changing only a callback does not rebuild the option object
and the live wrapper still calls the latest function.

Definition identity is core behavior; see
[Chart Definition API](../../reference/chart-definitions.md).

## Tooltip body composition

`renderTooltipBody` portals Octane output into the core-owned tooltip body. Its
context contains `points`, `content`, `defaultBody`, `pinned`, and `dismiss`.
Include `defaultBody` to retain native rows and swatches. The shared host owns
focus, placement, portaling, inert transient state, pinning, and dismissal;
Octane owns the returned component lifecycle.

## Core boundary

The adapter does not redefine chart grammar or data algorithms. Read
[Scales and D3](../../concepts/scales-and-d3.md) for injected primitives and
the [core API reference](../../reference/index.md) for marks, interaction,
renderers, and extension contracts.
