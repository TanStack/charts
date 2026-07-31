---
title: Scales, Guides, and Color
description: Reference for injected positional scales, automatic axes and margins, color scales, legends, themes, and gradients.
---

Pass a D3 scale factory when its domain should come from mark channels. Pass a
scale instance when the domain is fixed application state. TanStack Charts
copies the resolved scale, assigns its responsive pixel range, and uses that
copy for marks, ticks, and interaction. A supplied instance is never mutated.

For the architectural boundary and guidance on selecting granular D3 modules,
read [Scales and D3](../concepts/scales-and-d3.md). This page documents only
the TanStack Charts contract around those primitives.

## Compact scale package

`@tanstack/charts-scales` supplies four exact, tree-shakeable entries:

| Entry                             | Runtime export | Type contract  |
| --------------------------------- | -------------- | -------------- |
| `@tanstack/charts-scales/linear`  | `scaleLinear`  | `LinearScale`  |
| `@tanstack/charts-scales/band`    | `scaleBand`    | `BandScale`    |
| `@tanstack/charts-scales/point`   | `scalePoint`   | `PointScale`   |
| `@tanstack/charts-scales/ordinal` | `scaleOrdinal` | `OrdinalScale` |

`LinearScale` supports numeric two-stop domains and ranges, `invert`, `clamp`,
`ticks`, basic `tickFormat`, `nice`, and `copy`. `BandScale` supports
`padding`, `paddingInner`, `paddingOuter`, `align`, `round`, `rangeRound`,
`bandwidth`, `step`, and `copy`. `PointScale` exposes the corresponding point
operations with zero bandwidth. `OrdinalScale` supports explicit or implicit
domains, cyclic ranges, `unknown`, and `copy`.

```ts
import { scaleLinear } from '@tanstack/charts-scales/linear'

const y = {
  scale: scaleLinear().domain([0, 100]),
}
```

These factories satisfy `ConfiguredScaleLike` and `ChartScaleInput` directly.
They are a documented subset, not a complete `d3-scale` compatibility claim.
Use D3 for temporal or transformed domains, piecewise and nonnumeric
interpolation, and full formatting semantics.

## Positional scale factories

The common path passes the D3 factory directly:

```ts
import { scaleLinear, scaleUtc } from 'd3-scale'

const x = {
  scale: scaleUtc,
  nice: true,
  axis: { label: 'Date' },
}

const y = {
  scale: scaleLinear,
  nice: true,
  grid: true,
  axis: { label: 'Revenue' },
}
```

The chart creates a fresh scale for each layout, derives its domain from every
materialized channel bound to that axis, applies `nice`, and assigns the
responsive range. Bar and area baselines contribute zero when their baseline
is implicit. Empty channels retain the D3 factory's native domain.

Return a configured scale from a zero-argument factory for options that should
be applied before domain inference:

```ts
const x = {
  scale: () => scaleBand<string>().padding(0.2),
}
```

`nice` is an axis option because it must run after the inferred domain exists.

## Fixed domains

Pass a scale instance when the domain is semantic application state:

```ts
const y = {
  scale: scaleLinear().domain([0, 100]),
}
```

Instances retain:

- its semantic domain
- continuous, temporal, logarithmic, ordinal, or band mapping behavior
- tick generation and default tick formatting
- clamping, unknown values, interpolation, and padding configured by the caller

TanStack Charts owns:

- factory-domain inference
- the responsive pixel range
- y-range orientation and optional axis reversal
- centering values within a band
- guide placement, label measurement, and margins

Scale copies make one configured scale safe to reuse across responsive scenes.

## Axis options

```ts
interface ChartAxisOptions<TValue extends ChartValue> {
  scale: ChartScale | ConfiguredScaleLike<TValue> | ChartScaleFactory<TValue>
  nice?: boolean | number
  reverse?: boolean
  grid?: boolean
  axis?:
    | false
    | {
        line?: boolean
        ticks?:
          | false
          | {
              count?: number
              spacing?: number
              values?: readonly TValue[]
              size?: number
              padding?: number
              format?: (value: TValue) => string
            }
        tickLabels?:
          | false
          | {
              rotate?: number
              thin?:
                | boolean
                | {
                    minGap?: number
                    priority?: 'ends'
                    keep?: readonly TValue[]
                  }
            }
        label?: string | { text: string; offset?: number | 'auto' }
      }
}
```

| Option    | Default                     | Meaning                                                                  |
| --------- | --------------------------- | ------------------------------------------------------------------------ |
| `scale`   | Required                    | D3 factory, configured instance, or advanced `ChartScale`.               |
| `nice`    | `false`                     | Nice the resolved domain using the responsive or supplied tick count.    |
| `reverse` | `false`                     | Reverses the responsive pixel range without changing the caller's scale. |
| `grid`    | `false` for x; `true` for y | Draws grid rules from semantic tick candidates.                          |
| `axis`    | Inferred axis               | Axis line, tick candidates, labels, and title; `false` hides the axis.   |

Set an axis to `null` only when no mark uses that positional scale. To keep the
scale while hiding its axis, use `axis: false`. Grid visibility remains
independent.

Without an explicit `axis.ticks` policy, the responsive target is
`clamp(2, floor(chart.width / 92), 8)` for x and
`clamp(2, floor(chart.height / 48), 7)` for y. The configured scale may return
a different number of ticks.

`count`, `spacing`, and `values` are mutually exclusive candidate policies.
`count` is a scale hint, `spacing` derives that hint from the final axis length,
and `values` supplies exact semantic candidates. Grid lines and tick stubs use
these candidates before label thinning.

Tick labels are horizontal and collision-thinned by default. Rotation is
explicit and independent:

```ts
const x = {
  scale: scaleUtc,
  axis: {
    ticks: { spacing: 80, size: 0 },
    tickLabels: {
      rotate: -35,
      thin: {
        minGap: 8,
        priority: 'ends',
        keep: [launchDate],
      },
    },
  },
}
```

`thin: false` renders every candidate label. `keep` is a hard guarantee:
kept values render even if they collide with one another. A kept value outside
the candidate set adds only a label, not a tick stub or grid line.

## Automatic guide layout

When a margin side is omitted, the scene compiler measures:

- formatted tick glyph bounds
- tick rotation
- first and last label overhang
- axis title bounds and offset
- Cartesian `text`-mark anchors, pixel offsets, and rotation
- color legend height

The DOM host measures the inherited container font and relayouts after web
fonts load. Static compilation uses deterministic estimates unless
`measureText` is supplied. Explicit margin sides remain locked, and
`clip: true` prevents clipped mark labels from expanding the plot.

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

Data-paint marks accept a semantic `color` channel. On marks that also expose
`z`, grouping remains independent and supplies the color value only when
`color` is omitted. `fill` and `stroke` are final paint overrides, so they do
not contribute to the scale or legend.

```ts
interface ConfiguredColorScaleLike<TValue extends ChartKey, TOutput> {
  (value: TValue): TOutput
  copy: () => ConfiguredColorScaleLike<TValue, TOutput>
  domain?: () => readonly TValue[]
  range?: () => readonly TOutput[]
}

interface ChartColorOptions {
  scale?: ConfiguredColorScaleLike<any, any> | ChartColorScaleFactory<any, any>
  type?: ChartColorScale
  domain?: readonly ChartKey[]
  range?: readonly string[]
  nice?: boolean | number
  legend?: ChartColorLegend
}
```

| Option   | Default                 | Meaning                                                              |
| -------- | ----------------------- | -------------------------------------------------------------------- |
| `scale`  | None                    | D3 factory with inference or configured instance with a fixed domain |
| `type`   | None                    | Custom color-scale resolver                                          |
| `domain` | Observed channel values | Domain hint for factory, built-in, or custom resolution              |
| `range`  | See below               | Range for a factory, the built-in scale, or a custom resolver        |
| `nice`   | `false`                 | Nice a factory or configured continuous color scale                  |
| `legend` | None                    | Legend layout and scene renderer shown above the inner chart         |

Resolution order:

1. `color.scale`, created or copied before use
2. custom `color.type`
3. the built-in ordinal scale using `domain` or observed channel values and
   `range` or the theme palette

A color-scale factory is classified by D3 capabilities:

- ordinal factories infer first-seen distinct values;
- continuous and quantize factories infer the finite extent;
- quantile factories receive the complete numeric population;
- threshold factories require an explicit domain of authored cuts.

The theme palette is the range default only for the built-in ordinal scale.
A D3 factory must receive `color.range` or return a scale already configured
with a non-empty string range or interpolator; bare D3 factories retain
numeric or empty defaults that are not valid paint. Multi-stop continuous
ranges receive evenly spaced domain stops across the extent. A supplied scale
instance retains its domain and range. Outputs are converted to strings. A
custom `ChartColorScale` receives observed values, optional domain and range,
and the resolved theme, then returns:

```ts
interface ResolvedColorScale {
  type: string
  kind?: 'categorical' | 'continuous' | 'quantile' | 'quantize' | 'threshold'
  domain: readonly ChartKey[]
  range: readonly string[]
  thresholds?: readonly number[]
  map(value: ChartKey | null | undefined): string
}
```

`ChartKey` is `string | number`. On the built-in and configured-scale paths, a
null color value maps to the first range color or `currentColor`. A custom
`ChartColorScale` owns its null mapping through `ResolvedColorScale.map`. A
custom stepped scale supplies exact interior legend boundaries with
`thresholds`; D3 quantile, quantize, and threshold scales derive them
automatically.

## Automatic color legend

```ts
import { colorLegend } from '@tanstack/charts/legend'

colorLegend({
  label: 'Package',
  itemWidth: 120,
  width: 240,
  format: (value) => value.toFixed(0),
})
```

```ts
interface ColorLegendOptions {
  label?: string
  itemWidth?: number
  width?: number
  format?: (value: number) => string
}
```

`itemWidth` defaults to `110` and is clamped to a minimum of `64`. Items wrap
to responsive columns for categorical scales. Continuous scales render a
sampled ramp. Quantize, quantile, and threshold scales render exact range bins
at their resolved thresholds. `width` and `format` configure the quantitative
forms.

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
  height(itemCount: number, width: number, colors?: ResolvedColorScale): number
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
