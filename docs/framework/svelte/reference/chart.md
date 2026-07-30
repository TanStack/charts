---
title: Svelte Chart
description: Complete prop and type reference for the @tanstack/svelte-charts Chart component.
---

```svelte
<script lang="ts">
  import { Chart } from '@tanstack/svelte-charts'
</script>
```

The definition infers datum and coordinate types for every callback. Replace
its identity when captured application values change.

## Props

| Prop                 | Type                                                       | Default               | Meaning                                                |
| -------------------- | ---------------------------------------------------------- | --------------------- | ------------------------------------------------------ |
| `definition`         | `ChartDefinition`                                          | Required              | Framework-neutral chart definition                     |
| `ariaLabel`          | `string`                                                   | Required              | Accessible chart name                                  |
| `ariaDescription`    | `string`                                                   | None                  | Optional accessible description                        |
| `height`             | `number`                                                   | `320` without a ratio | Fixed CSS and scene height                             |
| `aspectRatio`        | `number`                                                   | None                  | Positive width-to-height ratio when height is absent   |
| `width`              | `number`                                                   | Responsive            | Fixed CSS and scene width                              |
| `initialWidth`       | `number`                                                   | `640`                 | Initial and server width before responsive measurement |
| `maxFocusDistance`   | `number`                                                   | `48`                  | Maximum default pointer-focus distance                 |
| `focus`              | `ChartFocusStrategy<TDatum, TXValue, TYValue>`             | Nearest point         | Pointer grouping and keyboard navigation strategy      |
| `spatialIndex`       | `ChartSpatialIndexFactory<TDatum, TXValue, TYValue>`       | Linear scan           | Optional nearest-point index                           |
| `animate`            | `boolean \| ChartAnimationOptions`                         | `false`               | Keyed update animation                                 |
| `keyboard`           | `boolean`                                                  | `true`                | Enables keyboard focus and navigation                  |
| `tabIndex`           | `number`                                                   | `0`                   | Surface tab index; `keyboard: false` forces `-1`       |
| `tooltip`            | `boolean \| ChartTooltipOptions<TDatum, TXValue, TYValue>` | `false`               | Native text tooltip                                    |
| `idPrefix`           | `string`                                                   | Generated             | Prefix for renderer-owned document IDs                 |
| `renderSvg`          | `ChartSvgRenderer<TDatum, TXValue, TYValue>`               | `renderChartSvg`      | Scene-to-SVG renderer                                  |
| `measureText`        | `ChartTextMeasurer`                                        | Host measurer         | Guide text measurement                                 |
| `onFocusChange`      | `(point: ChartPoint \| null) => void`                      | None                  | Primary focus callback                                 |
| `onFocusGroupChange` | `(points: readonly ChartPoint[]) => void`                  | None                  | Grouped focus callback                                 |
| `onSelect`           | `(point: ChartPoint \| null) => void`                      | None                  | Pointer or keyboard activation callback                |
| `onRender`           | `(context: ChartRenderContext) => void`                    | None                  | Live SVG, container, and scene after rendering         |
| `class`              | `string`                                                   | None                  | Extra class on the outer `.ts-chart-host`              |
| `style`              | `string`                                                   | None                  | Outer host declarations applied after adapter sizing   |
| `className`          | `string`                                                   | None                  | Extra class on the rendered SVG surface                |

Interaction hooks are Svelte 5 callback props. They are not component events.

## Exported types

`ChartCommonProps` contains the common host and presentation props.
`ChartProps` adds the definition. `ChartPresentationProps` contains `class`
and the string `style`. The package also re-exports `ChartDefinition` and
`ChartPoint`.

See the [Svelte adapter](../adapter.md) for lifecycle and SSR behavior,
[Focus and interaction](../../../reference/focus-and-interaction.md) for
callback semantics, and [Rendering and export](../../../reference/rendering-and-export.md)
for custom SVG renderers.
