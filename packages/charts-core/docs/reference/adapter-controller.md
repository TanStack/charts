---
title: Adapter Controller
description: Build framework adapters over shared prerender, mount, update, layout, scene access, and cleanup behavior.
---

The adapter controller is the low-level lifecycle used by framework bindings.
Application code normally uses its framework's chart component or
[`mountChart`](./dom-host.md).

## Entry points

```ts
import {
  createChartAdapter,
  resolveChartAdapterLayout,
  type ChartAdapter,
  type ChartAdapterLayout,
  type ChartAdapterLayoutOptions,
} from '@tanstack/charts/adapter'
import { createChartRendererAdapter } from '@tanstack/charts/adapter/renderer'
```

`createChartAdapter` accepts the SVG-oriented `ChartHostOptions`.
`createChartRendererAdapter` accepts `ChartRendererHostOptions`, including an
explicit `renderer`, so a framework can expose a renderer-neutral binding.

## Controller factories

```ts
function createChartAdapter<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(
  initialOptions: ChartHostOptions<TDatum, TXValue, TYValue>,
): ChartAdapter<
  ChartHostOptions<TDatum, TXValue, TYValue>,
  TDatum,
  TXValue,
  TYValue
>
```

```ts
function createChartRendererAdapter<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(
  initialOptions: ChartRendererHostOptions<TDatum, TXValue, TYValue>,
): ChartAdapter<
  ChartRendererHostOptions<TDatum, TXValue, TYValue>,
  TDatum,
  TXValue,
  TYValue
>
```

Both factories preserve the definition's datum and coordinate types from the
host options and return the same lifecycle contract:

```ts
interface ChartAdapter<
  TOptions,
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  prerender: () => string
  mount: (container: HTMLElement) => void
  update: (options: TOptions) => void
  getScene: () => ChartScene<TDatum, TXValue, TYValue> | undefined
  destroy: () => void
}
```

| Method        | Contract                                                                                                                                           |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prerender()` | Compiles the current options at the resolved initial size and returns the selected renderer's deterministic markup.                                |
| `mount()`     | Mounts into one container. Calling it again while mounted throws. A preceding prerender shares the controller's runtime.                           |
| `update()`    | Replaces the complete options object. Before mount it updates later prerender and mount work; after mount it forwards the update to the live host. |
| `getScene()`  | Returns `undefined` before mount, including after prerender, and the current compiled scene after mount.                                           |
| `destroy()`   | Releases the mounted host, runtime, observers, renderer surface, and interaction listeners. Repeated calls after cleanup have no effect.           |

Keep one controller per framework component instance.

## Prerender and mount

```ts
const adapter = createChartAdapter(options)

const initialMarkup = adapter.prerender()

// In the browser lifecycle:
container.innerHTML = initialMarkup
adapter.mount(container)

adapter.update(nextOptions)
adapter.destroy()
```

A server controller and browser controller are separate instances. The
browser's initial render and mount should reuse one browser controller. The
renderer decides which compatible shell or root it adopts. The [SSR and Hydration
guide](../guides/ssr-and-hydration.md) covers framework integration
requirements.

## Initial layout

```ts
interface ChartAdapterLayoutOptions {
  width?: number
  height?: number
  initialWidth?: number
  aspectRatio?: number
}

interface ChartAdapterLayout {
  aspectRatio?: number
  initialWidth: number
  initialHeight: number
}

function resolveChartAdapterLayout(
  options: ChartAdapterLayoutOptions,
): ChartAdapterLayout
```

`resolveChartAdapterLayout` makes server geometry deterministic before browser
measurement:

| Result          | Resolution                                                                      |
| --------------- | ------------------------------------------------------------------------------- |
| `initialWidth`  | `width`, then `initialWidth`, then `640`                                        |
| `aspectRatio`   | The supplied value only when it is finite and greater than zero                 |
| `initialHeight` | `height`, then `initialWidth / aspectRatio` when the ratio is valid, then `320` |

An explicit `width` therefore overrides `initialWidth`, and an explicit
`height` overrides ratio-derived height. Framework adapters can also use the
validated `aspectRatio` to keep the container stable until its measured width
is available.

## Ownership boundary

The controller owns chart runtime and host cleanup. The framework binding owns
component identity, native lifecycle hooks, reactive option assembly, and
container presentation. Use the renderer-neutral factory only when the
framework entry accepts an application-selected
[`ChartRenderer`](./rendering-and-export.md#custom-renderers).
