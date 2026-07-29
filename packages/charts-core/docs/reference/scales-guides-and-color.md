---
title: Scales, Guides, and Color
description: Reference for injected positional scales, automatic axes and margins, color scales, legends, themes, and gradients.
---

TanStack Charts requires positional scales instead of choosing semantic domains
on the application's behalf. The chart copies each supplied scale, assigns its
responsive pixel range, and uses the copy for marks, ticks, and interaction.
The caller's scale is never mutated.

For the architectural boundary and guidance on selecting granular D3 modules,
read [Scales and D3](../concepts/scales-and-d3.md). This page documents only
the TanStack Charts contract around those primitives.

## Configured positional scales

The common path is a callable configured scale:

```ts
interface ConfiguredScaleLike<TValue extends ChartValue> {
  (value: TValue): number | undefined
  copy(): ConfiguredScaleLike<TValue>
  domain(): readonly TValue[]
  range(values: Iterable<number>): ConfiguredScaleLike<TValue>
  bandwidth?(): number
  ticks?(count: number): readonly TValue[]
  tickFormat?(count: number): (value: TValue) => string
}
```

Supply one through each non-null axis:

```ts
import { scaleLinear, scaleUtc } from 'd3-scale'

const x = {
  scale: scaleUtc().domain([start, end]).nice(),
  label: 'Date',
}

const y = {
  scale: scaleLinear().domain([0, maximum]).nice(),
  label: 'Revenue',
  grid: true,
}
```

The configured scale owns:

- its semantic domain
- continuous, temporal, logarithmic, ordinal, or band mapping behavior
- tick generation and default tick formatting
- domain nicening, clamping, unknown values, and padding configured by the
  caller

TanStack Charts owns:

- the responsive pixel range
- y-range orientation and optional axis reversal
- centering values within a band
- guide placement, label measurement, and margins

Scale copies make one configured scale safe to reuse across responsive scenes.

## Axis options

```ts
interface ChartAxisOptions<TValue extends ChartValue> {
  scale: ChartScale | ConfiguredScaleLike<TValue>
  guide?: boolean
  ticks?: number
  format?: (value: TValue) => string
  grid?: boolean
  label?: string
  reverse?: boolean
  tickRotate?: number
  labelOffset?: number
}
```

| Option        | Default                                 | Meaning                                                                  |
| ------------- | --------------------------------------- | ------------------------------------------------------------------------ |
| `scale`       | Required                                | Configured callable scale or advanced `ChartScale`.                      |
| `guide`       | `true` for a non-null axis              | Renders the axis, ticks, title, and requested grid.                      |
| `ticks`       | Responsive target                       | Suggested tick count passed to the scale. It is not a guaranteed count.  |
| `format`      | Scale formatter, then string conversion | Formats tick values. Its value type is inferred from the marks.          |
| `grid`        | `false` for x; `true` for y             | Draws grid rules at tick positions.                                      |
| `label`       | None                                    | Axis title.                                                              |
| `reverse`     | `false`                                 | Reverses the responsive pixel range without changing the caller's scale. |
| `tickRotate`  | `0`                                     | Rotates tick labels in degrees.                                          |
| `labelOffset` | Automatic                               | Overrides the title's distance from the axis.                            |

Set an axis to `null` only when no mark uses that positional scale. To keep the
scale while hiding its guide, use `guide: false`.

Without an explicit `ticks`, the responsive target is
`clamp(2, floor(chart.width / 92), 8)` for x and
`clamp(2, floor(chart.height / 48), 7)` for y. The configured scale may return
a different number of ticks.

## Automatic guide layout

When a margin side is omitted, the scene compiler measures:

- formatted tick glyph bounds
- tick rotation
- first and last label overhang
- axis title bounds and offset
- color legend height

The DOM host measures the inherited container font and relayouts after web
fonts load. Static compilation uses deterministic estimates unless
`measureText` is supplied.

```ts
interface ChartTextMeasurer {
  (
    text: string,
    options: {
      fontSize: number
      fontWeight?: number
      anchor: 'start' | 'middle' | 'end'
      baseline: 'auto' | 'middle' | 'hanging'
    },
  ): {
    x: number
    y: number
    width: number
    height: number
  }
}
```

The returned `x` and `y` locate the painted glyph box relative to the requested
anchor and baseline. Pass the measurer through a host, adapter, runtime render,
or `createChartScene` layout options.

## Advanced custom scales

`ChartScale` is the unchecked extension boundary for a nonstandard positional
mapping:

```ts
interface ChartScale {
  id: string
  resolve(context: ChartScaleResolveContext): ResolvedScale
}

type ChartScaleResolver = (context: ChartScaleResolveContext) => ResolvedScale
```

The resolver context contains `id`, all materialized `values`, the responsive
`range`, the axis `options`, a target `tickCount`, and `includeZero`. It must
return a complete `ResolvedScale`:

```ts
interface ResolvedScale {
  id: string
  type: string
  domain: readonly ChartValue[]
  map(value: unknown): number
  ticks: readonly { value: ChartValue; label: string; position: number }[]
  bandwidth: number
}
```

Prefer a configured scale when it can express the mapping. A custom scale owns
correct domains, finite mapping, ticks, formatting, bandwidth, and response to
the supplied range.

## Color

Marks with a `z` or `color` channel contribute values to one chart-level color
scale.

```ts
interface ConfiguredColorScaleLike<TValue extends ChartKey, TOutput> {
  (value: TValue): TOutput
  copy: () => ConfiguredColorScaleLike<TValue, TOutput>
  domain?: () => readonly TValue[]
  range?: () => readonly TOutput[]
}

interface ChartColorOptions {
  scale?: ConfiguredColorScaleLike<any, any>
  type?: ChartColorScale
  domain?: readonly ChartKey[]
  range?: readonly string[]
  legend?: ChartColorLegend
}
```

| Option   | Default                 | Meaning                                                      |
| -------- | ----------------------- | ------------------------------------------------------------ |
| `scale`  | None                    | Configured callable color scale, copied before use           |
| `type`   | None                    | Custom color-scale resolver                                  |
| `domain` | Observed channel values | Domain hint for the built-in or custom resolver              |
| `range`  | Resolved theme palette  | Range hint for the built-in or custom resolver               |
| `legend` | None                    | Legend layout and scene renderer shown above the inner chart |

Resolution order:

1. `color.scale`, copied before use
2. custom `color.type`
3. the built-in ordinal scale using `domain` or observed channel values and
   `range` or the theme palette

A supplied configured color scale is callable and copyable. Its outputs are
converted to strings. Optional `domain()` and `range()` methods provide legend
metadata; when either method is absent, supply the corresponding `domain` or
`range` option if a legend needs it. A custom `ChartColorScale` receives
observed values, optional domain and range, and the resolved theme, then
returns:

```ts
interface ResolvedColorScale {
  type: string
  domain: readonly ChartKey[]
  range: readonly string[]
  map(value: ChartKey | null | undefined): string
}
```

`ChartKey` is `string | number`. On the built-in and configured-scale paths, a
null group maps to the first range color or `currentColor`. A custom
`ChartColorScale` owns its null mapping through `ResolvedColorScale.map`.

## Categorical legend

```ts
import { colorLegend } from '@tanstack/charts/legend'

colorLegend({
  label: 'Package',
  itemWidth: 120,
})
```

```ts
interface ColorLegendOptions {
  label?: string
  itemWidth?: number
}
```

`itemWidth` defaults to `110` and is clamped to a minimum of `64`. Items wrap
to responsive columns above the chart. Labels are derived from the color-scale
domain.

## Gradient legend

```ts
import { colorGradientLegend } from '@tanstack/charts/legend'

colorGradientLegend({
  label: 'Density',
  steps: 48,
  width: 240,
  format: (value) => value.toFixed(1),
})
```

```ts
interface ColorGradientLegendOptions {
  label?: string
  steps?: number
  width?: number
  format?: (value: number) => string
}
```

`steps` defaults to `32` and is clamped to at least `2`. `width` defaults to
`240`, uses at least `80` when space permits, and is finally capped by the
inner chart width. The legend requires a numeric first and last color-domain
value and throws for a nonnumeric domain.

## Custom legends

`ChartColorLegend` separates layout from rendering:

```ts
interface ChartColorLegend {
  height(itemCount: number, width: number): number
  render(context: ChartColorLegendContext): SceneNode
}
```

`height` reserves space before chart bounds are finalized. `render` receives
the resolved colors, chart bounds, theme, and full width. Return one keyed
[scene node](./runtime-and-scene.md#scene-nodes).

## Theme and gradients

The built-in theme is described in [Chart spec](./chart-spec.md#theme).
Chart gradients are independent SVG resources:

```ts
interface ChartLinearGradient {
  id: string
  x1?: number
  y1?: number
  x2?: number
  y2?: number
  stops: readonly {
    offset: number
    color: string
    opacity?: number
  }[]
}
```

Coordinates and offsets are normalized from `0` to `1` by the resource-aware
renderer. Omitted coordinates form a vertical gradient from bottom to top.
Use `renderChartSvgWithResources` and an `idPrefix`; see
[Rendering and export](./rendering-and-export.md#resource-aware-svg).
