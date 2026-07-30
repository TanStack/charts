---
title: Dot and Hexagon Marks
description: Reference for dot and hexagon channels, pixel radius, injected radius scales, color, grouping, keys, and interaction points.
---

`dot` and `hexagon` place fixed-pixel symbols at scaled x/y values. Their
radius does not change when a positional scale zooms or a chart resizes unless
the application changes `r` or `rScale`.

```ts
import { scaleSqrt } from 'd3-scale'
import { dot, hexagon } from '@tanstack/charts'
```

## `dot`

```ts
const mark = dot(rows, {
  x: 'date',
  y: 'value',
  z: 'series',
  r: 'population',
  rScale: radiusScale,
  key: 'id',
})
```

```ts
function dot<TDatum>(
  source: Iterable<TDatum>,
  options?: DotOptions<TDatum>,
): ChartMark<TDatum, InferredX, InferredY>
```

### Options

| Option          | Type                                 | Default                 | Meaning                                  |
| --------------- | ------------------------------------ | ----------------------- | ---------------------------------------- |
| `id`            | `string`                             | Layer-derived           | Stable mark ID                           |
| `x`             | `Channel<TDatum, ChartValue?>`       | Row index               | Horizontal value                         |
| `y`             | `Channel<TDatum, ChartValue?>`       | Numeric datum           | Vertical value                           |
| `z`             | `Channel<TDatum, ChartKey?>`         | No group                | Interaction group and default fill color |
| `key`           | `Channel<TDatum, ChartKey>`          | Unique `id`, then index | Stable scene and interaction identity    |
| `r`             | `number \| Channel<TDatum, number?>` | `3.5`                   | Raw radius value                         |
| `rScale`        | `(value: number) => number`          | Identity                | Maps each valid raw radius to pixels     |
| `fill`          | `string`                             | Resolved `z` color      | Constant fill                            |
| `fillOpacity`   | `number`                             | SVG default             | Fill opacity                             |
| `stroke`        | `string`                             | None                    | Constant stroke                          |
| `strokeOpacity` | `number`                             | SVG default             | Stroke opacity                           |
| `strokeWidth`   | `number`                             | SVG default             | Stroke width                             |

`rScale` is called only for finite, nonnegative raw radii. The mapped result
must also be finite and nonnegative or the row is skipped.

Unlike `hexagon`, `dot.fill` and `dot.stroke` are constants. Use `z` and the
chart color scale for data-driven dot color, or split data into multiple marks
for independently styled layers.

## `hexagon`

`hexagon` draws a pointy-topped six-sided symbol.

```ts
const mark = hexagon(bins, {
  x: 'x',
  y: 'y',
  z: 'densityBand',
  r: 'count',
  rScale: radiusScale,
  fill: (bin) => densityColor(bin.count),
  key: 'id',
})
```

```ts
function hexagon<TDatum>(
  source: Iterable<TDatum>,
  options?: HexagonOptions<TDatum>,
): ChartMark<TDatum, InferredX, InferredY>
```

### Options

| Option          | Type                                 | Default                 | Meaning                             |
| --------------- | ------------------------------------ | ----------------------- | ----------------------------------- |
| `id`            | `string`                             | Layer-derived           | Stable mark ID                      |
| `x`             | `Channel<TDatum, ChartValue?>`       | Row index               | Horizontal center                   |
| `y`             | `Channel<TDatum, ChartValue?>`       | Numeric datum           | Vertical center                     |
| `z`             | `Channel<TDatum, ChartKey?>`         | No group                | Interaction group and default paint |
| `key`           | `Channel<TDatum, ChartKey>`          | Unique `id`, then index | Stable identity                     |
| `r`             | `number \| Channel<TDatum, number?>` | `6`                     | Raw circumradius                    |
| `rScale`        | `(value: number) => number`          | Identity                | Maps radius values to pixels        |
| `fill`          | `VisualChannel<TDatum, string>`      | Resolved `z` color      | Fill per mark or row                |
| `fillOpacity`   | `number`                             | SVG default             | Fill opacity                        |
| `stroke`        | `VisualChannel<TDatum, string>`      | None                    | Optional stroke per mark or row     |
| `strokeOpacity` | `number`                             | SVG default             | Stroke opacity                      |
| `strokeWidth`   | `number`                             | SVG default             | Stroke width                        |

The generated vertices begin at the top and proceed in 60-degree increments.
The interaction point remains at the scaled center, and its `color` is the
resolved fill.

## Valid rows and points

Both marks skip a row when x or y is not a valid `ChartValue`, or when the
final radius is negative, nonfinite, null, or undefined. A zero radius remains
a valid interaction point even though it has no visible area.

Every valid row emits one `ChartPoint` with:

- the original datum and row index
- semantic channel values in `xValue` and `yValue`
- scaled center coordinates in `x` and `y`
- `z` as its group
- fill paint as its interaction color

## Radius scales

Pass a numeric scale factory to infer `[0, maximum]` from the radius channel.
Configure its semantic pixel range inside the factory:

```ts
const rScale = {
  scale: () => scaleSqrt().range([2, 18]),
}
```

An ordinary numeric mapper or configured scale instance remains valid when
the application owns the complete mapping. The shared integration boundary is documented in
[Scales and D3](../../concepts/scales-and-d3.md).

Radius does not contribute to x/y guide margins. Add an explicit partial
margin when large edge symbols must remain fully inside the SVG viewport.
