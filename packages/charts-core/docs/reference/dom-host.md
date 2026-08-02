---
title: DOM Host
description: Mount, update, size, interact with, and destroy a TanStack Chart in a browser DOM container.
---

`mountChart` is the framework-neutral default SVG browser host. It owns
responsive measurement, scene updates, keyed SVG reconciliation, animation,
pointer and keyboard interaction, native tooltips, font relayout, and cleanup.

```ts
import { defineChart } from '@tanstack/charts'
import { mountChart } from '@tanstack/charts/dom'
import { tooltip } from '@tanstack/charts/tooltip'
```

## Signature

```ts
function mountChart<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(
  container: HTMLElement,
  initialOptions: ChartHostOptions<TDatum, TXValue, TYValue>,
  runtime?: ChartRuntime<TDatum, TXValue, TYValue>,
): ChartHost<TDatum, TXValue, TYValue>
```

The optional runtime is for adapters or advanced applications that already
rendered an initial scene. Ownership transfers to the host: `host.destroy()`
also destroys that runtime. In ordinary vanilla use, omit it.

## Basic use

```ts
const options = {
  definition: defineChart(definition, { tooltip }),
  height: 320,
  ariaLabel: 'Weekly revenue',
}

const host = mountChart(container, options)

host.update({
  ...options,
  height: 400,
})

host.destroy()
```

Application changes use a new definition:

```ts
const host = mountChart(container, {
  definition: createDefinition(rows, 'revenue'),
  ariaLabel: 'Revenue by month',
})
```

The definition identity is the application update boundary. Responsive
definitions still rebuild when their resolved surface size changes.

## Renderer-neutral and Canvas hosts

Use the lower-level host when the surface is not necessarily SVG:

```ts
import { canvasChartRenderer } from '@tanstack/charts/canvas'
import { mountChartRenderer } from '@tanstack/charts/renderer'

const host = mountChartRenderer(container, {
  definition: defineChart(definition, { tooltip }),
  renderer: canvasChartRenderer,
  ariaLabel: 'Weekly revenue',
})
```

`mountChartRenderer` accepts `ChartRendererHostOptions` and returns a
`ChartRendererHost`. Its host lifecycle matches `mountChart`, but `renderer`
is required and `onRender` receives a
`ChartRendererRenderContext` containing the live `ChartSurface`.

For the built-in Canvas renderer, `mountCanvasChart` from
`@tanstack/charts/canvas` removes the explicit `renderer` option and returns a
`CanvasChartHost`. Both hosts preserve the same `update`, `getScene`, and
`destroy` interaction model.

## Host options

The default SVG host requires `definition` and `ariaLabel`.

| Option               | Default           | Meaning                                                                                                |
| -------------------- | ----------------- | ------------------------------------------------------------------------------------------------------ |
| `definition`         | Required          | [Chart definition](./chart-definitions.md). Its identity is the application update boundary.           |
| `ariaLabel`          | Required          | Accessible chart name placed on the SVG.                                                               |
| `ariaDescription`    | None              | Optional SVG description.                                                                              |
| `height`             | `320`             | Fixed scene height in CSS pixels.                                                                      |
| `aspectRatio`        | None              | Computes height as `width / aspectRatio` when `height` is absent and the ratio is positive and finite. |
| `width`              | Container width   | Fixed scene width. Supplying it disables resize observation.                                           |
| `initialWidth`       | `640`             | Width used when a responsive container has not produced a positive measurement.                        |
| `className`          | None              | Extra class on the rendered SVG, not the container.                                                    |
| `idPrefix`           | Empty             | Prefix for renderer-owned resource IDs. Use a unique value for resource-aware charts.                  |
| `tabIndex`           | `0`               | SVG tab index while keyboard behavior is enabled.                                                      |
| `onFocusChange`      | None              | Receives the primary focused point or `null`.                                                          |
| `onFocusGroupChange` | None              | Receives all points selected by the current focus strategy.                                            |
| `onSelect`           | None              | Receives the clicked or keyboard-activated point, or `null` for an empty click.                        |
| `onRender`           | None              | Runs after reconciliation with the container, live SVG, and current scene.                             |
| `renderSvg`          | `renderChartSvg`  | Replaces the scene-to-SVG renderer.                                                                    |
| `measureText`        | DOM font measurer | Replaces guide text measurement.                                                                       |

The definition owns these chart behaviors:

| Option             | Default                   | Meaning                                                  |
| ------------------ | ------------------------- | -------------------------------------------------------- |
| `maxFocusDistance` | `48`                      | Maximum scene-pixel distance for default pointer focus   |
| `focus`            | Nearest point             | Pointer grouping and keyboard navigation strategy        |
| `focusRing`        | `true`                    | Built-in primary-point focus indicator                   |
| `spatialIndex`     | Linear nearest-point scan | Dense-data nearest-point index                           |
| `animate`          | `false`                   | Keyed attribute, enter, and exit animation               |
| `keyboard`         | `true`                    | Keyboard focus and navigation                            |
| `tooltip`          | `false`                   | Native tooltip content, placement, layering, and pinning |

Definition `keyboard: false` takes precedence over host `tabIndex`. A negative
custom tab index can keep chart keyboard behavior available for programmatic
focus without placing the chart in the normal tab order.

Interaction options are detailed in
[Focus and interaction](./focus-and-interaction.md). Renderer and animation
options are detailed in [Rendering and export](./rendering-and-export.md).

## Responsive sizing

When `width` is absent, the host reads the container's bounding width and
observes it with the container document's `ResizeObserver`.

```ts
mountChart(container, {
  definition,
  aspectRatio: 16 / 9,
  initialWidth: 720,
  ariaLabel: 'Traffic over time',
})
```

The fallback order is:

1. explicit `width`
2. positive container width
3. `initialWidth`
4. `640`

Height is explicit `height`, then a positive finite `aspectRatio`, then `320`.
The host schedules responsive relayout on the document's animation frame and
skips renders when the measured width has not changed. Resize relayout commits
immediately by default; set `animate.resize` to `true` to animate it.

The host temporarily assigns `position: relative` when the container's
computed position is static, because local native tooltips are absolutely
positioned inside it. Adding the `portal` extension to the tooltip options
instead places the tooltip in the browser top layer through a manual Popover,
or directly under the `ownerDocument` body as a fixed fallback, and positions
it against the viewport. `destroy` restores the previous inline position when
the host owned that change and removes its tooltip.

## Font measurement

The default DOM measurer inherits the container's computed font family, style,
stretch, weight, direction, and letter spacing. Measurements are cached. The
host clears that cache and relayouts when:

- the inherited font signature changes during `update`
- the document font set emits `loadingdone`

Pass `measureText` to own the geometry or to make browser and nonbrowser output
use the same metrics. See
[Scales, guides, and color](./scales-guides-and-color.md#automatic-guide-layout)
for the function contract.

## `ChartHost`

```ts
interface ChartHost<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  update(options: ChartHostOptions<TDatum, TXValue, TYValue>): void
  getScene(): ChartScene<TDatum, TXValue, TYValue>
  destroy(): void
}
```

### `update`

`update` replaces the complete option set. Keep required options in every call.
It renders synchronously when definition identity, size, accessibility,
renderer, keyboard, ID, or text measurement changes. Interaction callbacks,
tooltip formatting, focus strategy, animation settings, and the spatial index
can update without rebuilding the scene.

An interrupted animated render is canceled before the next reconciliation.
When the focused observation can be restored after a scene rebuild, focus and
grouped focus are repainted against its new coordinates.

### `getScene`

Returns the current compiled scene. It is useful for aligned application UI,
diagnostics, or custom interaction. Treat it as immutable.

### `destroy`

`destroy` is idempotent. It disconnects resize and font listeners, cancels
scheduled work and animation, removes interaction listeners, clears the
container, and releases an inline positioning change owned by the host. A
destroyed host ignores later updates.

## Browser ownership

The DOM host requires a live `HTMLElement` and its owning document. For static
or server rendering, compile a scene and render SVG without mounting; see
[Runtime and scene](./runtime-and-scene.md) and
[Rendering and export](./rendering-and-export.md).
