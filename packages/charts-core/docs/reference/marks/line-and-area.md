---
title: Line and Area Marks
description: Reference for lineY, areaY, areaX, grouping, null gaps, interval baselines, points, and optional curve bridges.
---

Line and area marks consume an iterable directly. Channels may be compatible
field names or accessors. Rows whose required positional value is null,
undefined, invalid, or nonfinite create gaps instead of connecting across
missing data.

```ts
import { areaX, areaY, defineChart, lineY, stack } from '@tanstack/charts'
```

## `lineY`

`lineY` connects consecutive valid rows within each path group. An explicit
`z` defines the groups. When `z` is omitted and `color` is present, `color`
defines them.

```ts
const mark = lineY(rows, {
  x: 'date',
  y: 'value',
  z: 'series',
  points: true,
})
```

```ts
function lineY<TDatum>(
  source: Iterable<TDatum>,
  options?: LineYOptions<TDatum>,
): ChartMark<TDatum, InferredX, number>
```

### Options

| Option            | Type                            | Default                        | Meaning                                        |
| ----------------- | ------------------------------- | ------------------------------ | ---------------------------------------------- |
| `id`              | `string`                        | Layer-derived                  | Stable mark ID                                 |
| `x`               | `Channel<TDatum, ChartValue?>`  | Row index                      | Horizontal value                               |
| `y`               | `Channel<TDatum, number?>`      | Numeric datum                  | Vertical value                                 |
| `z`               | `Channel<TDatum, ChartKey?>`    | No explicit group              | Path grouping; overrides color grouping        |
| `color`           | `Channel<TDatum, ChartKey?>`    | `z`                            | Color-scale value; groups when `z` is absent   |
| `key`             | `Channel<TDatum, ChartKey>`     | Top/nested `id`, x, then index | Stable interaction and scene identity          |
| `stroke`          | `VisualChannel<TDatum, string>` | Resolved color                 | Final path paint; evaluated from the first row |
| `strokeOpacity`   | `number`                        | SVG default                    | Stroke opacity                                 |
| `strokeWidth`     | `number`                        | `2.25`                         | Stroke width                                   |
| `strokeDasharray` | `string`                        | None                           | SVG dash array                                 |
| `points`          | `boolean`                       | `false`                        | Draws a radius-`2.5` dot at each valid point   |
| `curve`           | `ChartCurve`                    | Straight segments              | Optional path generator                        |
| `states`          | `readonly ChartMarkState[]`     | None                           | Focus-driven presentation overrides            |

Input order is path order. Sort rows before creating the mark when semantic x
order differs from input order. A null row flushes the current segment; later
valid rows begin a new segment in the same group.

Each valid row emits one interaction point at its scaled x/y coordinate.
`groupLabel` is the string form of the effective path group, or the mark ID
without a group.

## `areaY`

`areaY` fills between a numeric upper channel and a numeric lower baseline
along x.

```ts
const mark = areaY(rows, {
  x: 'date',
  y1: 'low',
  y2: 'high',
  z: 'series',
})
```

```ts
function areaY<TDatum>(
  source: Iterable<TDatum>,
  options?: AreaYOptions<TDatum>,
): ChartMark<TDatum, InferredX, number>
```

### Options

| Option        | Type                                 | Default                        | Meaning                                                        |
| ------------- | ------------------------------------ | ------------------------------ | -------------------------------------------------------------- |
| `id`          | `string`                             | Layer-derived                  | Stable mark ID                                                 |
| `x`           | `Channel<TDatum, ChartValue?>`       | Row index                      | Shared horizontal position                                     |
| `y`           | `Channel<TDatum, number?>`           | Numeric datum                  | Layer thickness; implicitly stacked at each x                  |
| `y1`          | `number \| Channel<TDatum, number?>` | Implicit stack start           | Explicit lower boundary                                        |
| `y2`          | `number \| Channel<TDatum, number?>` | Implicit stack end             | Explicit upper boundary; takes precedence over y               |
| `z`           | `Channel<TDatum, ChartKey?>`         | No explicit group              | Area grouping; overrides color grouping                        |
| `color`       | `Channel<TDatum, ChartKey?>`         | `z`                            | Color-scale value; groups when `z` is absent                   |
| `key`         | `Channel<TDatum, ChartKey>`          | Top/nested `id`, x, then index | Stable interaction identity                                    |
| `fill`        | `VisualChannel<TDatum, string>`      | Resolved color                 | Final area paint; evaluated from the group's first row         |
| `fillOpacity` | `number`                             | `0.2`                          | Fill opacity                                                   |
| `stroke`      | `VisualChannel<TDatum, string>`      | None                           | Optional boundary stroke, evaluated from the group's first row |
| `strokeWidth` | `number`                             | SVG default                    | Boundary stroke width                                          |
| `curve`       | `ChartCurve`                         | Straight segments              | Optional path generator                                        |
| `layout`      | `StackLayout`                        | Implicit diverging stack       | Configured stack order or offset                               |
| `states`      | `readonly ChartMarkState[]`          | None                           | Focus-driven presentation overrides                            |

Without explicit endpoints, repeated x positions stack by series. `z` defines
series; a discrete `color` channel may infer it when `z` is absent. Use
`layout: stack(options)` for explicit order, reversal, normalization,
centering, or wiggle offset. Supplying `y1` or `y2` opts out and preserves
authored interval boundaries.

Input order and null-gap behavior match `lineY`. Each valid row emits one point
at the upper `y2`/`y` value, not at the lower baseline.

## `areaX`

`areaX` is the transposed interval area: it fills between left and right
numeric x values along y.

```ts
const mark = areaX(rows, {
  y: 'category',
  x1: 'minimum',
  x2: 'maximum',
  z: 'series',
})
```

```ts
function areaX<TDatum>(
  source: Iterable<TDatum>,
  options?: AreaXOptions<TDatum>,
): ChartMark<TDatum, number, InferredY>
```

### Options

| Option        | Type                                 | Default                        | Meaning                                           |
| ------------- | ------------------------------------ | ------------------------------ | ------------------------------------------------- |
| `id`          | `string`                             | Layer-derived                  | Stable mark ID                                    |
| `x`           | `Channel<TDatum, number?>`           | Numeric datum                  | Layer thickness; implicitly stacked at each y     |
| `x1`          | `number \| Channel<TDatum, number?>` | Implicit stack start           | Explicit left boundary                            |
| `x2`          | `number \| Channel<TDatum, number?>` | Implicit stack end             | Explicit right boundary; takes precedence over x  |
| `y`           | `Channel<TDatum, ChartValue?>`       | Row index                      | Shared vertical position                          |
| `z`           | `Channel<TDatum, ChartKey?>`         | No explicit group              | Area grouping; overrides color grouping           |
| `color`       | `Channel<TDatum, ChartKey?>`         | `z`                            | Color-scale value; groups when `z` is absent      |
| `key`         | `Channel<TDatum, ChartKey>`          | Top/nested `id`, y, then index | Stable interaction identity                       |
| `fill`        | `VisualChannel<TDatum, string>`      | Resolved color                 | Final paint, evaluated from the group's first row |
| `fillOpacity` | `number`                             | `0.2`                          | Fill opacity                                      |
| `stroke`      | `VisualChannel<TDatum, string>`      | None                           | Optional boundary stroke                          |
| `strokeWidth` | `number`                             | SVG default                    | Boundary stroke width                             |
| `curve`       | `AreaXCurve`                         | Straight segments              | Optional transposed path generator                |
| `layout`      | `StackLayout`                        | Implicit diverging stack       | Configured stack order or offset                  |
| `states`      | `readonly ChartMarkState[]`          | None                           | Focus-driven presentation overrides               |

Without explicit endpoints, repeated y positions stack by series. Supplying
`x1` or `x2` opts out and preserves authored interval boundaries. Each valid
row emits one point at its right `x2`/`x` value.

Line and area paths have one paint value. When both channels are present,
`z` wins for grouping and `color` may supply a different semantic paint value.
Keep `color` constant within each explicit `z` group; the first row supplies
the path color.

## Curves

Line and area marks accept a small path-generation contract rather than
bundling interpolation algorithms:

```ts
interface ChartCurve {
  line(points: readonly (readonly [number, number])[]): string
  area(
    top: readonly (readonly [number, number])[],
    bottom: readonly (readonly [number, number])[],
  ): string
}

interface AreaXCurve {
  areaX(
    right: readonly (readonly [number, number])[],
    left: readonly (readonly [number, number])[],
  ): string
}
```

Optional adapters are available:

```ts
import { d3AreaXCurve } from '@tanstack/charts/d3/area-x'
import { d3Curve } from '@tanstack/charts/d3/shape'
```

They accept a supplied curve factory and return the corresponding TanStack
contract. Which granular D3 module to install and why these algorithms remain
injected is documented once in
[Scales and D3](../../concepts/scales-and-d3.md).

## Layering area and line

Area marks do not automatically draw their upper line. Compose the layers:

```ts
const definition = defineChart({
  marks: [
    areaY(rows, {
      x: 'date',
      y: 'value',
      z: 'series',
      fillOpacity: 0.16,
    }),
    lineY(rows, {
      x: 'date',
      y: 'value',
      z: 'series',
    }),
  ],
  x: { scale: xScale },
  y: { scale: yScale },
})
```

Use matching channels and scales when the two layers must align. Identity
inference is evaluated independently for every interactive layer; supply a
key only where its automatic candidate is not stable.
