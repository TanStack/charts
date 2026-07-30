---
title: Alpine Chart
description: Complete option and type reference for the @tanstack/alpine-charts x-chart directive.
---

```ts
import { charts } from '@tanstack/alpine-charts'
```

Register `charts` with `Alpine.plugin`, then make `x-chart` evaluate to a
complete `ChartOptions` value. Replace the definition identity when captured
application values change.
The definition also owns focus, tooltip, animation, keyboard policy, focus
distance, and spatial indexing.

## Directive options

| Option               | Type                                                                 | Default                                  | Meaning                                              |
| -------------------- | -------------------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------- |
| `definition`         | `ChartDefinition`                                                    | Required                                 | Framework-neutral chart definition                   |
| `ariaLabel`          | `string`                                                             | Required                                 | Accessible chart name                                |
| `ariaDescription`    | `string`                                                             | None                                     | Optional accessible description                      |
| `height`             | `number`                                                             | Existing height or `320` without a ratio | Fixed CSS and scene height                           |
| `aspectRatio`        | `number`                                                             | None                                     | Positive width-to-height ratio when height is absent |
| `width`              | `number`                                                             | Existing width or `100%`                 | Fixed CSS and scene width                            |
| `initialWidth`       | `number`                                                             | `640`                                    | Initial width before responsive measurement          |
| `tabIndex`           | `number`                                                             | `0`                                      | Surface tab index; `keyboard: false` forces `-1`     |
| `idPrefix`           | `string`                                                             | Generated                                | Prefix for renderer-owned document IDs               |
| `className`          | `string`                                                             | None                                     | Extra class on the rendered SVG surface              |
| `renderSvg`          | `ChartSvgRenderer<TDatum, TXValue, TYValue>`                         | `renderChartSvg`                         | Scene-to-SVG renderer                                |
| `measureText`        | `ChartTextMeasurer`                                                  | Host measurer                            | Guide text measurement                               |
| `onFocusChange`      | `(point: ChartPoint \| null) => void`                                | None                                     | Primary focus callback                               |
| `onFocusGroupChange` | `(points: readonly ChartPoint[]) => void`                            | None                                     | Grouped focus callback                               |
| `onSelect`           | `(point: ChartPoint \| null) => void`                                | None                                     | Pointer or keyboard activation callback              |
| `onRender`           | `(context: ChartRenderContext) => void`                              | None                                     | Live SVG, container, and scene after rendering       |
| `renderTooltipBody`  | `(context: ChartTooltipBodyRenderContext) => AlpineChartTooltipBody` | None                                     | Returns DOM content for the native tooltip body      |

The directive element becomes `.ts-chart-host`; use its normal HTML class and
style attributes for outer presentation. Directive cleanup removes the chart
surface and restores the element's prior inline layout and host class.

`renderTooltipBody` receives `points`, `content`, a `DocumentFragment`
`defaultBody`, `pinned`, and `dismiss`. Return a DOM node, text, number, nested
array, or `null`. Include `defaultBody` to retain the native title, rows,
formatting, and swatches. The directive replaces returned content when focus
changes and removes it when the tooltip closes.

## Exported types

`ChartOptions` includes the definition and host options.
`ChartTooltipBodyRenderContext` and `AlpineChartTooltipBody` describe custom
body composition. The package also re-exports `ChartDefinition` and
`ChartPoint`.

See the [Alpine adapter](../adapter.md) for lifecycle and browser requirements,
[Focus and interaction](../../../reference/focus-and-interaction.md) for
callback semantics, and [Rendering and export](../../../reference/rendering-and-export.md)
for custom SVG renderers.
