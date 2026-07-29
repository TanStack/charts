---
title: Rendering and Export
description: Render chart scenes through the default SVG renderer, the optional Canvas renderer, or a custom surface, then export supported output.
---

TanStack Charts compiles a renderer-neutral scene. The default renderer turns
that scene into accessible SVG markup; an optional Canvas renderer paints the
same scene through Canvas 2D. Both use the shared responsive, interaction,
tooltip, keyboard, and runtime host.

Use the task-oriented [Exporting guide](../guides/exporting.md) to choose
between static scene rendering, mounted SVG serialization, and raster output.

## Choose a renderer

Renderer code stays behind explicit entry points:

| Use                              | Import                                                |
| -------------------------------- | ----------------------------------------------------- |
| Default vanilla SVG host         | `mountChart` from `@tanstack/charts/dom`              |
| Vanilla Canvas host              | `mountCanvasChart` from `@tanstack/charts/canvas`     |
| Renderer-neutral host            | `mountChartRenderer` from `@tanstack/charts/renderer` |
| Default React SVG component      | `Chart` from `@tanstack/react-charts`                 |
| React Canvas component           | `Chart` from `@tanstack/react-charts/canvas`          |
| React custom-renderer component  | `Chart` from `@tanstack/react-charts/core`            |
| Default Octane SVG component     | `Chart` from `@tanstack/octane-charts`                |
| Octane Canvas component          | `Chart` from `@tanstack/octane-charts/canvas`         |
| Octane custom-renderer component | `Chart` from `@tanstack/octane-charts/core`           |

The default package and adapter entries do not import Canvas. Applications pay
for it only when they import a Canvas entry. The `/core` adapter entries accept
an explicit `renderer` without choosing one for the application.

## `renderChartSvg`

```ts
import { renderChartSvg } from '@tanstack/charts/svg'

const markup = renderChartSvg(scene, {
  ariaLabel: 'Weekly revenue',
  ariaDescription: 'Revenue increased through the second quarter.',
  idPrefix: 'revenue',
})
```

```ts
function renderChartSvg(
  scene: ChartScene,
  options: RenderChartSvgOptions,
): string

interface RenderChartSvgOptions {
  ariaLabel: string
  ariaDescription?: string
  className?: string
  tabIndex?: number
  idPrefix?: string
}
```

| Option            | Default  | Meaning                                               |
| ----------------- | -------- | ----------------------------------------------------- |
| `ariaLabel`       | Required | Accessible SVG name                                   |
| `ariaDescription` | None     | Escaped SVG `<desc>` content                          |
| `className`       | None     | Added after the `ts-chart` class                      |
| `tabIndex`        | `0`      | SVG tab index for direct static rendering             |
| `idPrefix`        | Empty    | Prefix passed to renderers that generate document IDs |

The SVG uses `role="img"`, `aria-roledescription="chart"`, a responsive
`width="100%"` and `height="100%"`, the scene's dimensions as its `viewBox`,
and an overflow-visible display style. A nontransparent scene background
renders as the first rect. All labels escape text and inherit the document
font.

The renderer includes one hidden focus circle controlled by the DOM host.
Scene keys become `data-ts-key` attributes for reconciliation.

## Canvas renderer

```ts
import { mountCanvasChart } from '@tanstack/charts/canvas'

const host = mountCanvasChart(container, {
  definition,
  ariaLabel: 'Weekly revenue',
  tooltip: true,
})
```

`mountCanvasChart` has the same definition, sizing, focus, spatial-index,
keyboard, tooltip, selection, update, and destroy behavior as `mountChart`.
The renderer paints the base scene and focus indicator on separate canvases,
uses the browser device-pixel ratio by default, and maps pointer coordinates
back into the scene.

`@tanstack/charts/canvas` exports `createCanvasChartRenderer`,
`canvasChartRenderer`, and `mountCanvasChart`, plus the
`CanvasChartRendererOptions`, `CanvasChartRenderer`, `CanvasChartSurface`,
`CanvasChartHostOptions`, and `CanvasChartHost` types. Supply
`pixelRatio` to `createCanvasChartRenderer` only when the application needs a
fixed backing-store ratio.

The server-facing `prerender` step emits a deterministic, named chart shell
with two `aria-hidden` canvases. It does not attempt server-side pixel
painting. The browser adopts that shell, sizes the backing stores, paints the
scene, and attaches the shared interaction host. See
[SSR and Hydration](../guides/ssr-and-hydration.md).

Canvas is an escape hatch for paint-heavy SVG output, not an unbounded-data
mode. Scene compilation, channel arrays, scene nodes, and interaction points
still exist. A default nearest-point lookup remains linear unless the chart
supplies a `spatialIndex`; measure the complete pipeline and bound or aggregate
output when pixels cannot distinguish the observations.

Renderer-specific tradeoffs:

- Canvas updates raster pixels instead of retaining one DOM element per scene
  node.
- Canvas animation crossfades complete frames; SVG animation reconciles and
  interpolates keyed elements.
- Curved, polar, and geographic `path` geometry requires browser `Path2D`.
- Scene-node `className` values do not create styleable Canvas descendants.
- Gradients require geometry with measurable bounds.

## Resource-aware SVG

```ts
import { mountChart } from '@tanstack/charts'
import { renderChartSvgWithResources } from '@tanstack/charts/svg/resources'
```

`renderChartSvgWithResources(scene, options)` has the same signature as
`renderChartSvg` and additionally:

- emits declared linear gradients in `<defs>`
- scopes gradient IDs with sanitized `idPrefix`
- rewrites matching `url(#gradient-id)` paints
- emits clip paths for scene groups with `clip` bounds

Select it on a vanilla or framework host:

```ts
const host = mountChart(container, {
  definition,
  renderSvg: renderChartSvgWithResources,
  idPrefix: 'orders',
  ariaLabel: 'Orders',
})
```

Use a stable, document-unique `idPrefix`. Gradient coordinates and stop offsets
are clamped to `0..1` and emitted as percentages.

## `reconcileChartSvg`

```ts
import { reconcileChartSvg } from '@tanstack/charts/reconcile'

const cancel = reconcileChartSvg(container, nextMarkup, {
  duration: 240,
  easing: 'ease-out',
})

cancel()
```

```ts
function reconcileChartSvg(
  container: HTMLElement,
  markup: string,
  animation?: ChartAnimationOptions,
): () => void
```

The reconciler adopts a compatible existing root, matches children by
`data-ts-key`, moves retained nodes into their new order, inserts entries, and
removes exits. When a node has no explicit key, same-tag sibling order is a
fallback identity.

Without animation, changed attributes and structure commit synchronously.
With animation:

- numeric attributes with compatible string structure interpolate
- entries fade from zero opacity
- exits fade to zero and are then removed
- noninterpolable values commit immediately
- a returned cancellation function stops the current frame loop

The DOM host calls reconciliation and cancellation for you.

## Animation options

```ts
interface ChartAnimationOptions {
  duration?: number
  easing?:
    | 'linear'
    | 'ease'
    | 'ease-in'
    | 'ease-out'
    | 'ease-in-out'
    | ((progress: number) => number)
  respectReducedMotion?: boolean
}
```

| Option                 | Default      | Meaning                                                |
| ---------------------- | ------------ | ------------------------------------------------------ |
| `duration`             | `240`        | Animation length in milliseconds, clamped to zero      |
| `easing`               | `'ease-out'` | Named built-in easing or a progress-mapping function   |
| `respectReducedMotion` | `true`       | Lets a host suppress animation for reduced-motion mode |

On a host, `animate: true` uses `240` milliseconds, `ease-out`, and respects
`prefers-reduced-motion: reduce`. A numeric duration is clamped to at least
zero. A custom easing receives raw progress from `0` to `1`.

`respectReducedMotion` is a host policy. Direct
`reconcileChartSvg(container, markup, animation)` calls run the supplied
animation without consulting media queries.

Host animation begins only after the initial render. Updates without a scene
render do not start an animation; the current animation options apply to the
next reconciliation.

Stable mark IDs and datum keys are essential for meaningful transitions.

## SVG serialization

```ts
import { downloadChartSvg, serializeChartSvg } from '@tanstack/charts/export'

const source = serializeChartSvg(container, {
  width: 1200,
  height: 600,
  includeFocus: false,
})

downloadChartSvg(container, 'revenue.svg')
```

The subpath exports `serializeChartSvg`, `downloadChartSvg`, and the
`SerializeChartSvgOptions` type.

```ts
interface SerializeChartSvgOptions {
  width?: number
  height?: number
  includeFocus?: boolean
}
```

`target` may be the SVG or an ancestor containing `svg.ts-chart`. The serializer
clones the SVG, adds the XML namespace, removes the focus circle unless
`includeFocus` is true, and resolves dimensions from options, then the
`viewBox`, then client dimensions.

The serializer can inline computed `color`, fill, fill opacity, font family,
font size, font weight, opacity, stroke, stroke opacity, stroke width, and
stroke dash array when they depend on inherited font, `currentColor`, or CSS
custom properties. Gradient stop color and opacity receive the same treatment.
Keep other CSS-dependent resource styling explicit until it is part of that
serialization contract.

`downloadChartSvg(target, filename?, options?)` defaults to `chart.svg` and
downloads an SVG blob through the target's document.

## Browser image export

```ts
import { downloadChartImage, renderChartImage } from '@tanstack/charts/export'

const blob = await renderChartImage(container, {
  type: 'image/webp',
  scale: 2,
  background: '#fff',
  quality: 0.9,
})

await downloadChartImage(container, 'revenue.png', {
  scale: 2,
})
```

The browser image functions are `renderChartImage` and
`downloadChartImage`.

```ts
interface RenderChartPngOptions extends SerializeChartSvgOptions {
  scale?: number
  background?: string
  type?: 'image/png' | 'image/jpeg' | 'image/webp'
  quality?: number
}
```

Despite its historical name, `RenderChartPngOptions` supports PNG, JPEG, and
WebP. `scale` defaults to `2` and is clamped to at least `0.1`. `type` defaults
to `image/png`.

Raster export requires:

- a browser document and window
- nonzero chart dimensions
- Canvas 2D
- successful browser decoding when the source is SVG

The promise rejects when any requirement fails or Canvas encoding returns no
blob. `downloadChartImage` defaults to `chart.png`; keep the filename extension
consistent with the selected MIME type.

The raster helpers accept a mounted SVG or Canvas chart root, or an ancestor
containing one. SVG is serialized, decoded, and drawn into the export canvas.
Canvas uses its base scene layer directly and composites the separate focus
layer only when `includeFocus` is true. `serializeChartSvg` and
`downloadChartSvg` remain SVG-only.

## Custom renderers

The renderer-neutral boundary is `ChartRenderer`:

```ts
interface ChartRenderer<TDatum, TXValue, TYValue> {
  readonly id: string
  prerender(
    scene: ChartScene<TDatum, TXValue, TYValue>,
    options: RenderChartOptions,
  ): string
  mount(
    container: HTMLElement,
    requestRender: (force?: boolean) => void,
  ): ChartSurface<TDatum, TXValue, TYValue>
}
```

The returned `ChartSurface` owns its root `element`, scene painting,
client-to-scene coordinate conversion, focus painting, and cleanup. The shared
host continues to own runtime updates, responsive sizing, text measurement,
focus resolution, keyboard behavior, native tooltips, selection, and
callbacks. `ChartRendererRenderContext` reports the live `surface` instead of
assuming an SVG element.

Use `mountChartRenderer` from `@tanstack/charts/renderer`, or the React and
Octane `/core` entries, to mount a custom renderer. `RenderChartOptions`,
`ChartSurfaceRenderOptions`, `ChartSurface`, `ChartRenderer`,
`ChartRendererRenderContext`, `ChartRendererHostCommonOptions`,
`StaticChartRendererHostOptions`, `DynamicChartRendererHostOptions`,
`ChartRendererHostOptions`, and `ChartRendererHost` describe the complete
boundary.

SVG remains available as a renderer implementation:

```ts
import {
  createSvgChartRenderer,
  svgChartRenderer,
} from '@tanstack/charts/svg/renderer'
```

`createSvgChartRenderer` adapts a `ChartSvgRenderer` into a `ChartRenderer`.
Pass a `ChartSvgRenderer` as `renderSvg` to the compatibility SVG host or
default framework adapter when only SVG serialization needs to change. Such a
renderer should preserve:

- an SVG root discoverable by the host
- stable `data-ts-key` identities for reconciliation
- a `[data-ts-chart-focus]` element when native focus paint is desired
- the scene coordinate system and accessible name

See [Custom extensions](./custom-extensions.md#custom-renderers) before
replacing the shared renderer.
