---
title: React Chart
description: Complete prop and type reference for the @tanstack/react-charts Chart component.
---

```tsx
import { Chart } from '@tanstack/react-charts'
```

The supplied definition infers the datum, semantic x/y values, and callbacks.

```ts
function Chart<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(props: ChartProps<TDatum, TXValue, TYValue>): React.JSX.Element
```

## Renderer entry points

The default entry uses SVG. The optional entries keep other renderer code
explicit:

```tsx
import { Chart as CanvasChart } from '@tanstack/react-charts/canvas'
import { Chart as RendererChart } from '@tanstack/react-charts/core'

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

The Canvas `Chart` accepts the same adapter props except `renderSvg`. Its
`onRender` receives `ChartRendererRenderContext`. The `/core`
`Chart` also requires `renderer: ChartRenderer`; use it for application-owned
surfaces. Both entries export `ChartCommonProps`, `ChartProps`,
`ChartDefinition`, and `ChartPoint`.

These base entries render the native tooltip without React tooltip-body
composition.

## Definition props

| Prop         | Default  | Meaning                                                                       |
| ------------ | -------- | ----------------------------------------------------------------------------- |
| `definition` | Required | Framework-independent definition; identity is the application update boundary |

See [Chart Definition API](../../../reference/chart-definitions.md).

The definition owns `focus`, `maxFocusDistance`, `spatialIndex`, `animate`,
`keyboard`, and `tooltip`. Adapters do not override them.

Add the `portal` extension to the definition's tooltip options to escape
clipping and local stacking contexts. The adapter still receives no portal
override.

## Accessibility and sizing

| Prop              | Type                  | Default                    | Meaning                                                |
| ----------------- | --------------------- | -------------------------- | ------------------------------------------------------ |
| `ariaLabel`       | `string`              | Required                   | Accessible surface name                                |
| `ariaDescription` | `string`              | None                       | Optional surface description                           |
| `tabIndex`        | `number`              | `0`                        | Surface tab index while keyboard behavior is enabled   |
| `height`          | `number`              | `320` without aspect ratio | Fixed CSS and scene height                             |
| `aspectRatio`     | `number`              | None                       | Positive width-to-height ratio when height is absent   |
| `width`           | `number`              | Responsive                 | Fixed CSS and scene width                              |
| `initialWidth`    | `number`              | `640`                      | Initial and server width before responsive measurement |
| `className`       | `string`              | None                       | Extra class on the outer `ts-chart-host` div           |
| `style`           | `React.CSSProperties` | None                       | Outer host styles, applied after adapter sizing styles |

See [Sizing and layout](../adapter.md#sizing-and-layout).

## Callbacks

| Prop                 | Type                                      | Default | Meaning                                                 |
| -------------------- | ----------------------------------------- | ------- | ------------------------------------------------------- |
| `onFocusChange`      | `(point: ChartPoint \| null) => void`     | None    | Primary focus callback                                  |
| `onFocusGroupChange` | `(points: readonly ChartPoint[]) => void` | None    | Grouped focus callback                                  |
| `onSelect`           | `(point: ChartPoint \| null) => void`     | None    | Click and keyboard activation callback                  |
| `onRender`           | `(context: ChartRenderContext) => void`   | None    | Inner surface, live SVG, and scene after reconciliation |

See [Focus and interaction](../../../reference/focus-and-interaction.md) for
the behavior and complete callback values.

## Tooltip body

Import the drop-in component from the optional tooltip entry to use
`renderTooltipBody`:

```tsx
import {
  Chart,
  CanvasChart,
  RendererChart,
} from '@tanstack/react-charts/tooltip'
```

| Prop                | Type                                                    | Default | Meaning                                          |
| ------------------- | ------------------------------------------------------- | ------- | ------------------------------------------------ |
| `renderTooltipBody` | `(context: ChartTooltipBodyRenderContext) => ReactNode` | None    | Composes React content inside the native surface |

```ts
interface ChartTooltipBodyRenderContext<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
> {
  points: readonly ChartPoint<TDatum, TXValue, TYValue>[]
  content: ChartTooltipContent | string
  defaultBody: React.ReactNode
  pinned: boolean
  dismiss: () => void
}
```

`defaultBody` preserves native headings, rows, formatting, and swatches.
`points` follows the definition's focus and tooltip sort policy. Render
interactive content only when `pinned` is true; transient tooltips do not
accept pointer input. `dismiss()` clears the tooltip and restores chart focus
when focus was inside its body.

Existing users of this prop should move `Chart` from
`@tanstack/react-charts` to `@tanstack/react-charts/tooltip`. Replace
`Chart as CanvasChart` from `/canvas` or `Chart as RendererChart` from `/core`
with the corresponding named component from `/tooltip`. Ordering, anchoring,
placement, portaling, and sticky behavior remain in the chart definition.

## Rendering and layout extensions

| Prop          | Type                                         | Default                     | Meaning                                      |
| ------------- | -------------------------------------------- | --------------------------- | -------------------------------------------- |
| `idPrefix`    | `string`                                     | Generated from `useId()`    | Prefix for renderer-owned document resources |
| `renderSvg`   | `ChartSvgRenderer<TDatum, TXValue, TYValue>` | `renderChartSvg`            | Scene-to-SVG renderer                        |
| `measureText` | `ChartTextMeasurer`                          | DOM inherited-font measurer | Guide glyph measurement                      |

See [Rendering and export](../../../reference/rendering-and-export.md) and
[Scales, guides, and color](../../../reference/scales-guides-and-color.md).

## Exported prop types

The base entries export `ChartCommonProps` and `ChartProps`. The `/tooltip`
entry exports its extended `ChartCommonProps`, `ChartProps`,
`RendererChartCommonProps`, `RendererChartProps`, `CanvasChartCommonProps`,
`CanvasChartProps`, `ChartTooltipBodyRenderProps`, and
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
