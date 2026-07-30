---
title: Preact Chart
description: Complete prop and type reference for the @tanstack/preact-charts Chart component.
---

```tsx
import { Chart } from '@tanstack/preact-charts'
```

The definition infers datum and coordinate types for every callback. Replace
its identity when captured application values change.
It also owns focus, tooltip, animation, keyboard policy, focus distance, and
spatial indexing.

## Props

| Prop                 | Type                                                            | Default               | Meaning                                                |
| -------------------- | --------------------------------------------------------------- | --------------------- | ------------------------------------------------------ |
| `definition`         | `ChartDefinition`                                               | Required              | Framework-neutral chart definition                     |
| `ariaLabel`          | `string`                                                        | Required              | Accessible chart name                                  |
| `ariaDescription`    | `string`                                                        | None                  | Optional accessible description                        |
| `height`             | `number`                                                        | `320` without a ratio | Fixed CSS and scene height                             |
| `aspectRatio`        | `number`                                                        | None                  | Positive width-to-height ratio when height is absent   |
| `width`              | `number`                                                        | Responsive            | Fixed CSS and scene width                              |
| `initialWidth`       | `number`                                                        | `640`                 | Initial and server width before responsive measurement |
| `tabIndex`           | `number`                                                        | `0`                   | Surface tab index; `keyboard: false` forces `-1`       |
| `idPrefix`           | `string`                                                        | Generated             | Prefix for renderer-owned document IDs                 |
| `renderSvg`          | `ChartSvgRenderer<TDatum, TXValue, TYValue>`                    | `renderChartSvg`      | Scene-to-SVG renderer                                  |
| `measureText`        | `ChartTextMeasurer`                                             | Host measurer         | Guide text measurement                                 |
| `onFocusChange`      | `(point: ChartPoint \| null) => void`                           | None                  | Primary focus callback                                 |
| `onFocusGroupChange` | `(points: readonly ChartPoint[]) => void`                       | None                  | Grouped focus callback                                 |
| `onSelect`           | `(point: ChartPoint \| null) => void`                           | None                  | Pointer or keyboard activation callback                |
| `onRender`           | `(context: ChartRenderContext) => void`                         | None                  | Live SVG, container, and scene after rendering         |
| `renderTooltipBody`  | `(context: ChartTooltipBodyRenderContext) => ComponentChildren` | None                  | Composes Preact content inside the native tooltip body |
| `className`          | `string`                                                        | None                  | Extra class on the outer `.ts-chart-host`              |
| `style`              | `JSX.CSSProperties`                                             | None                  | Outer host styles applied after adapter sizing         |

Custom outer styles can override the adapter's computed layout. A fixed
`width` prop still controls scene measurement, so do not give `style.width` a
conflicting value.

`renderTooltipBody` receives `points`, `content`, `defaultBody`, `pinned`, and
`dismiss`. Include `defaultBody` to keep the native title, rows, formatting,
and swatches. Ordering, anchoring, placement, portaling, and pinning remain in
the definition.

## Exported types

`ChartCommonProps` contains the common host and presentation props.
`ChartProps` adds the definition. `ChartPresentationProps` contains
`className` and `style`. `ChartTooltipBodyRenderContext` describes composed
tooltip content. The package also re-exports `ChartDefinition` and `ChartPoint`.

See the [Preact adapter](../adapter.md) for lifecycle and SSR behavior,
[Focus and interaction](../../../reference/focus-and-interaction.md) for
callback semantics, and [Rendering and export](../../../reference/rendering-and-export.md)
for custom SVG renderers.
