---
title: React Chart
description: Complete prop and type reference for the @tanstack/react-charts Chart component.
---

```tsx
import { Chart } from '@tanstack/react-charts'
```

`Chart` has separate static and dynamic overloads. The supplied definition
infers the datum, semantic x/y values, dynamic input, and callbacks.

```ts
function Chart<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(props: StaticChartProps<TDatum, TXValue, TYValue>): React.JSX.Element

function Chart<
  TDatum,
  TInput,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(props: DynamicChartProps<TDatum, TInput, TXValue, TYValue>): React.JSX.Element
```

## Definition props

| Prop         | Static                     | Dynamic                     | Meaning                                         |
| ------------ | -------------------------- | --------------------------- | ----------------------------------------------- |
| `definition` | Required static definition | Required dynamic definition | Framework-independent chart definition          |
| `input`      | Rejected                   | Required `TInput`           | Exact input declared by `defineChart<TInput>()` |

See [Chart Definition API](../../../reference/chart-definitions.md).

## Accessibility and sizing

| Prop              | Type                  | Default                    | Meaning                                                |
| ----------------- | --------------------- | -------------------------- | ------------------------------------------------------ |
| `ariaLabel`       | `string`              | Required                   | Accessible SVG name                                    |
| `ariaDescription` | `string`              | None                       | Optional SVG description                               |
| `tabIndex`        | `number`              | `0`                        | SVG tab index while keyboard behavior is enabled       |
| `height`          | `number`              | `320` without aspect ratio | Fixed CSS and scene height                             |
| `aspectRatio`     | `number`              | None                       | Positive width-to-height ratio when height is absent   |
| `width`           | `number`              | Responsive                 | Fixed CSS and scene width                              |
| `initialWidth`    | `number`              | `640`                      | Initial and server width before responsive measurement |
| `className`       | `string`              | None                       | Extra class on the outer `ts-chart-host` div           |
| `style`           | `React.CSSProperties` | None                       | Outer host styles, applied after adapter sizing styles |

See [Sizing and layout](../adapter.md#sizing-and-layout).

## Focus, tooltip, and callbacks

| Prop                 | Type                                                       | Default       | Meaning                                                 |
| -------------------- | ---------------------------------------------------------- | ------------- | ------------------------------------------------------- |
| `maxFocusDistance`   | `number`                                                   | `48`          | Maximum default pointer-focus distance in scene pixels  |
| `focus`              | `ChartFocusMode<TDatum, TXValue, TYValue>`                 | Nearest point | Pointer grouping and keyboard strategy                  |
| `spatialIndex`       | `ChartSpatialIndexFactory<TDatum, TXValue, TYValue>`       | Linear scan   | Dense nearest-point index                               |
| `keyboard`           | `boolean`                                                  | `true`        | Enables keyboard focus and navigation                   |
| `tooltip`            | `boolean \| ChartTooltipOptions<TDatum, TXValue, TYValue>` | `false`       | Native tooltip                                          |
| `onFocusChange`      | `(point: ChartPoint \| null) => void`                      | None          | Primary focus callback                                  |
| `onFocusGroupChange` | `(points: readonly ChartPoint[]) => void`                  | None          | Grouped focus callback                                  |
| `onSelect`           | `(point: ChartPoint \| null) => void`                      | None          | Click and keyboard activation callback                  |
| `onRender`           | `(context: ChartRenderContext) => void`                    | None          | Inner surface, live SVG, and scene after reconciliation |

See [Focus and interaction](../../../reference/focus-and-interaction.md) for
the behavior and complete callback values.

## Rendering and layout extensions

| Prop          | Type                                         | Default                     | Meaning                                      |
| ------------- | -------------------------------------------- | --------------------------- | -------------------------------------------- |
| `animate`     | `boolean \| ChartAnimationOptions`           | `false`                     | Keyed update animation                       |
| `idPrefix`    | `string`                                     | Generated from `useId()`    | Prefix for renderer-owned document resources |
| `renderSvg`   | `ChartSvgRenderer<TDatum, TXValue, TYValue>` | `renderChartSvg`            | Scene-to-SVG renderer                        |
| `measureText` | `ChartTextMeasurer`                          | DOM inherited-font measurer | Guide glyph measurement                      |

See [Rendering and export](../../../reference/rendering-and-export.md) and
[Scales, guides, and color](../../../reference/scales-guides-and-color.md).

## Exported prop types

The adapter exports `ChartCommonProps`, `ChartProps`, `StaticChartProps`, and
`DynamicChartProps`.

```ts
interface ChartCommonProps<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  // every common prop listed above
}

type StaticChartProps<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = ChartCommonProps<TDatum, TXValue, TYValue> & {
  definition: StaticChartDefinition<TDatum, TXValue, TYValue>
  input?: never
}

type DynamicChartProps<
  TDatum = unknown,
  TInput = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = ChartCommonProps<TDatum, TXValue, TYValue> & {
  definition: DynamicChartDefinition<TInput, any, TDatum, TXValue, TYValue>
  input: TInput
}

type ChartProps<
  TDatum = unknown,
  TInput = undefined,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> =
  | StaticChartProps<TDatum, TXValue, TYValue>
  | DynamicChartProps<TDatum, TInput, TXValue, TYValue>
```

The package also re-exports `ChartDefinition` and `ChartPoint`. Prefer
inference at the component call site; see [Types](../../../reference/types.md).
