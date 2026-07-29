---
title: Angular Chart
description: Complete option and type reference for the @tanstack/angular-charts standalone component.
---

```ts
import { Chart } from '@tanstack/angular-charts'
```

`Chart` is a standalone component with selector `tanstack-chart`. Its required
`options` input accepts a static definition without `input`, or a dynamic
definition with the exact `input` type declared by `defineChart<Input>()`.

## `options`

| Option               | Type                                                       | Default                    | Meaning                                                |
| -------------------- | ---------------------------------------------------------- | -------------------------- | ------------------------------------------------------ |
| `definition`         | `StaticChartDefinition \| DynamicChartDefinition`          | Required                   | Framework-neutral chart definition                     |
| `input`              | Inferred `TInput`                                          | Required only when dynamic | Input accepted by a dynamic definition                 |
| `ariaLabel`          | `string`                                                   | Required                   | Accessible chart name                                  |
| `ariaDescription`    | `string`                                                   | None                       | Optional accessible description                        |
| `height`             | `number`                                                   | `320` without a ratio      | Fixed CSS and scene height                             |
| `aspectRatio`        | `number`                                                   | None                       | Positive width-to-height ratio when height is absent   |
| `width`              | `number`                                                   | Responsive                 | Fixed CSS and scene width                              |
| `initialWidth`       | `number`                                                   | `640`                      | Initial and server width before responsive measurement |
| `maxFocusDistance`   | `number`                                                   | `48`                       | Maximum default pointer-focus distance                 |
| `focus`              | `ChartFocusStrategy<TDatum, TXValue, TYValue>`             | Nearest point              | Pointer grouping and keyboard navigation strategy      |
| `spatialIndex`       | `ChartSpatialIndexFactory<TDatum, TXValue, TYValue>`       | Linear scan                | Optional nearest-point index                           |
| `animate`            | `boolean \| ChartAnimationOptions`                         | `false`                    | Keyed update animation                                 |
| `keyboard`           | `boolean`                                                  | `true`                     | Enables keyboard focus and navigation                  |
| `tabIndex`           | `number`                                                   | `0`                        | Surface tab index; `keyboard: false` forces `-1`       |
| `tooltip`            | `boolean \| ChartTooltipOptions<TDatum, TXValue, TYValue>` | `false`                    | Native text tooltip                                    |
| `idPrefix`           | `string`                                                   | Generated                  | Prefix for renderer-owned document IDs                 |
| `renderSvg`          | `ChartSvgRenderer<TDatum, TXValue, TYValue>`               | `renderChartSvg`           | Scene-to-SVG renderer                                  |
| `measureText`        | `ChartTextMeasurer`                                        | Host measurer              | Guide text measurement                                 |
| `onFocusChange`      | `(point: ChartPoint \| null) => void`                      | None                       | Primary focus callback                                 |
| `onFocusGroupChange` | `(points: readonly ChartPoint[]) => void`                  | None                       | Grouped focus callback                                 |
| `onSelect`           | `(point: ChartPoint \| null) => void`                      | None                       | Pointer or keyboard activation callback                |
| `onRender`           | `(context: ChartRenderContext) => void`                    | None                       | Live SVG, container, and scene after rendering         |
| `class`              | `string`                                                   | None                       | Extra class on the inner `.ts-chart-host`              |
| `style`              | `string`                                                   | None                       | Inner host declarations applied after adapter sizing   |
| `className`          | `string`                                                   | None                       | Extra class on the rendered SVG surface                |

Callbacks are functions inside `options`, not Angular outputs. Replace the
complete `options` value when chart state changes so `OnPush` change detection
delivers an `ngOnChanges` update.

## Exported types

`ChartCommonOptions` contains common host and presentation options.
`StaticChartOptions` rejects `input`; `DynamicChartOptions` requires it;
`ChartOptions` is their union. `ChartPresentationOptions` contains `class` and
`style`. The package also re-exports `ChartDefinition` and `ChartPoint`.

See the [Angular adapter](../adapter.md) for lifecycle and SSR behavior,
[Focus and interaction](../../../reference/focus-and-interaction.md) for
callback semantics, and [Rendering and export](../../../reference/rendering-and-export.md)
for custom SVG renderers.
