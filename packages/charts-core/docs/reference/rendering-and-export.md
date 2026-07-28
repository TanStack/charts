---
title: Rendering and Export
description: Render chart scenes to accessible SVG, reconcile keyed updates, enable resources, and export SVG or browser images.
---

TanStack Charts compiles a renderer-neutral scene. The default renderer turns
that scene into accessible SVG markup; the DOM host reconciles the markup by
stable keys. Optional subpaths add gradients, clipping, serialization,
downloads, and raster export.

Use the task-oriented [Exporting guide](../guides/exporting.md) to choose
between static scene rendering, mounted SVG serialization, and raster output.

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
- nonzero SVG dimensions
- Canvas 2D
- successful browser decoding of the serialized SVG

The promise rejects when any requirement fails or canvas encoding returns no
blob. `downloadChartImage` defaults to `chart.png`; keep the filename extension
consistent with the selected MIME type.

## Custom renderers

`ChartSvgRenderer` is:

```ts
type ChartSvgRenderer<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = (
  scene: ChartScene<TDatum, TXValue, TYValue>,
  options: RenderChartSvgOptions,
) => string
```

Pass it as `renderSvg` to the DOM host or framework adapter. A replacement used
with the built-in host should preserve:

- an SVG root discoverable by the host
- stable `data-ts-key` identities for reconciliation
- a `[data-ts-chart-focus]` element when native focus paint is desired
- the scene coordinate system and accessible name

See [Custom extensions](./custom-extensions.md#custom-svg-renderers) before
replacing the shared renderer.
