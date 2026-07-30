---
title: Octane Chart
description: Complete prop and type reference for the @tanstack/octane-charts Chart component.
---

```tsx
import { Chart } from '@tanstack/octane-charts'
```

The supplied definition infers the datum, semantic x/y values, and callbacks:

```ts
function Chart<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(props: ChartProps<TDatum, TXValue, TYValue>): unknown
```

The definition owns focus, tooltip, animation, keyboard policy, focus distance,
and spatial indexing.

## Renderer entry points

The default entry uses SVG. The optional entries keep other renderer code
explicit:

```tsx
import { Chart as CanvasChart } from '@tanstack/octane-charts/canvas'
import { Chart as RendererChart } from '@tanstack/octane-charts/core'

const canvasChart = (
  <CanvasChart definition={definition} ariaLabel="Weekly revenue" />
)
const rendererChart = (
  <RendererChart
    definition={definition}
    renderer={myRenderer}
    ariaLabel="Weekly revenue"
  />
)
```

The Canvas `Chart` accepts the common interaction and sizing props except
`renderSvg`. Its `onRender` receives `ChartRendererRenderContext`. The `/core`
`Chart` also requires `renderer: ChartRenderer`. Both entries export
`ChartCommonProps`, `ChartProps`, `ChartTooltipBodyRenderContext`,
`ChartDefinition`, and `ChartPoint`.

## Definition props

| Prop         | Default  | Meaning                                                                       |
| ------------ | -------- | ----------------------------------------------------------------------------- |
| `definition` | Required | Framework-independent definition; identity is the application update boundary |

See [Chart Definition API](../../../reference/chart-definitions.md).

## Accessibility and sizing

| Prop              | Type                                            | Default                    | Meaning                                              |
| ----------------- | ----------------------------------------------- | -------------------------- | ---------------------------------------------------- |
| `ariaLabel`       | `string`                                        | Required                   | Accessible surface name                              |
| `ariaDescription` | `string`                                        | None                       | Optional surface description                         |
| `tabIndex`        | `number`                                        | `0`                        | Surface tab index while keyboard behavior is enabled |
| `height`          | `number`                                        | `320` without aspect ratio | Fixed CSS and scene height                           |
| `aspectRatio`     | `number`                                        | None                       | Positive width-to-height ratio when height is absent |
| `width`           | `number`                                        | Responsive                 | Fixed CSS and scene width                            |
| `initialWidth`    | `number`                                        | `640`                      | Initial and server width                             |
| `class`           | `string`                                        | None                       | Extra class on the outer `ts-chart-host` element     |
| `style`           | `Record<string, string \| number \| undefined>` | None                       | Outer host styles applied after adapter sizing       |

See [Sizing and layout](../adapter.md#sizing-and-layout).

## Focus, tooltip, and callbacks

| Prop                 | Type                                                     | Default | Meaning                                                 |
| -------------------- | -------------------------------------------------------- | ------- | ------------------------------------------------------- |
| `onFocusChange`      | `(point: ChartPoint \| null) => void`                    | None    | Primary focus callback                                  |
| `onFocusGroupChange` | `(points: readonly ChartPoint[]) => void`                | None    | Grouped focus callback                                  |
| `onSelect`           | `(point: ChartPoint \| null) => void`                    | None    | Click and keyboard activation callback                  |
| `onRender`           | `(context: ChartRenderContext) => void`                  | None    | Inner surface, live SVG, and scene after reconciliation |
| `renderTooltipBody`  | `(context: ChartTooltipBodyRenderContext) => OctaneNode` | None    | Composes Octane content inside the native tooltip body  |

```tsx
<Chart
  definition={definition}
  ariaLabel="Revenue"
  renderTooltipBody={({ points, defaultBody, pinned, dismiss }) => (
    <div>
      {defaultBody}
      <SeriesDetail points={points} />
      {pinned ? <button onClick={dismiss}>Close</button> : null}
    </div>
  )}
/>
```

The context also exposes the resolved `content`. Ordering, anchoring,
placement, portaling, and pinning remain in the definition. The prop is
available from the default, `/canvas`, and `/core` entries.

See [Focus and interaction](../../../reference/focus-and-interaction.md).

## Rendering and layout extensions

| Prop          | Type                                         | Default                     | Meaning                                |
| ------------- | -------------------------------------------- | --------------------------- | -------------------------------------- |
| `idPrefix`    | `string`                                     | Generated from `useId()`    | Prefix for renderer-owned resource IDs |
| `renderSvg`   | `ChartSvgRenderer<TDatum, TXValue, TYValue>` | `renderChartSvg`            | Scene-to-SVG renderer                  |
| `measureText` | `ChartTextMeasurer`                          | DOM inherited-font measurer | Guide glyph measurement                |

See [Rendering and export](../../../reference/rendering-and-export.md) and
[Scales, guides, and color](../../../reference/scales-guides-and-color.md).

## Exported prop types

The adapter exports `ChartCommonProps`, `ChartProps`, and
`ChartTooltipBodyRenderContext`.

```ts
interface ChartCommonProps<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  // every common prop listed above
}

type ChartProps<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = ChartCommonProps<TDatum, TXValue, TYValue> & {
  definition: ChartDefinition<TDatum, TXValue, TYValue>
}
```

The package also re-exports `ChartDefinition` and `ChartPoint`. Prefer
inference at the component call site. Memoize definitions that capture
component values; see [Types](../../../reference/types.md).
