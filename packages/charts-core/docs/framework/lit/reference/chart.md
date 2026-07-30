---
title: Lit Chart
description: Complete option and type reference for the @tanstack/lit-charts custom element.
---

```ts
import { Chart, defineChartElement } from '@tanstack/lit-charts'
```

`defineChartElement()` registers `Chart` as `tanstack-chart`. Pass the complete
chart value through the element's `options` property, not HTML attributes.
Replace the definition identity when captured application values change.
The definition also owns focus, tooltip, animation, keyboard policy, focus
distance, and spatial indexing.

## `options`

| Option               | Type                                                  | Default               | Meaning                                              |
| -------------------- | ----------------------------------------------------- | --------------------- | ---------------------------------------------------- |
| `definition`         | `ChartDefinition`                                     | Required              | Framework-neutral chart definition                   |
| `ariaLabel`          | `string`                                              | Required              | Accessible chart name                                |
| `ariaDescription`    | `string`                                              | None                  | Optional accessible description                      |
| `height`             | `number`                                              | `320` without a ratio | Fixed CSS and scene height                           |
| `aspectRatio`        | `number`                                              | None                  | Positive width-to-height ratio when height is absent |
| `width`              | `number`                                              | Responsive            | Fixed CSS and scene width                            |
| `initialWidth`       | `number`                                              | `640`                 | Initial width before responsive measurement          |
| `tabIndex`           | `number`                                              | `0`                   | Surface tab index; `keyboard: false` forces `-1`     |
| `idPrefix`           | `string`                                              | Generated             | Prefix for renderer-owned document IDs               |
| `renderSvg`          | `ChartSvgRenderer<TDatum, TXValue, TYValue>`          | `renderChartSvg`      | Scene-to-SVG renderer                                |
| `measureText`        | `ChartTextMeasurer`                                   | Host measurer         | Guide text measurement                               |
| `onFocusChange`      | `(point: ChartPoint \| null) => void`                 | None                  | Primary focus callback                               |
| `onFocusGroupChange` | `(points: readonly ChartPoint[]) => void`             | None                  | Grouped focus callback                               |
| `onSelect`           | `(point: ChartPoint \| null) => void`                 | None                  | Pointer or keyboard activation callback              |
| `onRender`           | `(context: ChartRenderContext) => void`               | None                  | Live SVG, container, and scene after rendering       |
| `renderTooltipBody`  | `(context: ChartTooltipBodyRenderContext) => unknown` | None                  | Composes Lit content inside the native tooltip body  |
| `class`              | `string`                                              | None                  | Extra class on the inner `.ts-chart-host`            |
| `style`              | `string`                                              | None                  | Inner host declarations applied after adapter sizing |
| `className`          | `string`                                              | None                  | Extra class on the rendered SVG surface              |

```ts
const options = {
  definition,
  ariaLabel: 'Revenue',
  renderTooltipBody: ({ points, defaultBody, pinned, dismiss }) => html`
    ${defaultBody}
    <series-detail .points=${points}></series-detail>
    ${pinned ? html`<button @click=${dismiss}>Close</button>` : nothing}
  `,
}
```

The context also exposes resolved `content`. `defaultBody` is a
`TemplateResult`. Ordering, anchoring, placement, portaling, and pinning remain
in the definition.

## Registration and exported types

`defineChartElement(tagName = 'tanstack-chart')` is idempotent for an already
registered tag. Importing `Chart` directly supports explicit custom-element
registration.

`ChartCommonProps` contains common host and presentation props. `ChartProps`
adds the definition. `ChartPresentationProps` contains `class` and `style`.
`ChartTooltipBodyRenderContext` describes composed tooltip content. The
package also re-exports `ChartDefinition` and `ChartPoint`.

See the [Lit adapter](../adapter.md) for lifecycle and browser behavior,
[Focus and interaction](../../../reference/focus-and-interaction.md) for
callback semantics, and [Rendering and export](../../../reference/rendering-and-export.md)
for custom SVG renderers.
