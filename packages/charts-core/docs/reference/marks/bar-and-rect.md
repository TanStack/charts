---
title: Bar and Rect Marks
description: Reference for barY, barX, rect, cell, interval endpoints, band sizing, grouped bars, color, insets, and focus anchors.
---

Bar marks encode a numeric interval against a categorical or positional
channel. Rect marks encode independent x and y intervals and are the general
primitive for heatmaps, interval blocks, and cells.

```ts
import { scaleBand } from 'd3-scale'
import { barX, barY, cell, group, rect, stack } from '@tanstack/charts'
```

## `barY`

`barY` draws vertical bars from `y1` to `y2` at x.

```ts
const mark = barY(rows, {
  x: 'category',
  y: 'value',
})
```

```ts
function barY<TDatum>(
  source: Iterable<TDatum>,
  options?: BarYOptions<TDatum>,
): ChartMark<TDatum, InferredX, number>
```

### Options

| Option        | Type                                 | Default                        | Meaning                                          |
| ------------- | ------------------------------------ | ------------------------------ | ------------------------------------------------ |
| `id`          | `string`                             | Layer-derived                  | Stable mark ID                                   |
| `x`           | `Channel<TDatum, ChartValue?>`       | Row index                      | Bar category or center                           |
| `y`           | `Channel<TDatum, number?>`           | Numeric datum                  | Length; implicitly stacked at each x             |
| `y1`          | `number \| Channel<TDatum, number?>` | Implicit stack start           | Explicit baseline endpoint                       |
| `y2`          | `number \| Channel<TDatum, number?>` | Implicit stack end             | Explicit value endpoint; takes precedence over y |
| `z`           | `Channel<TDatum, ChartKey?>`         | No group                       | Group identity; color fallback when omitted      |
| `color`       | `Channel<TDatum, ChartKey?>`         | `z`                            | Independent value sent to the chart color scale  |
| `key`         | `Channel<TDatum, ChartKey>`          | Top/nested `id`, x, then index | Stable scene and interaction identity            |
| `fill`        | `VisualChannel<TDatum, string>`      | Resolved `color`               | Final bar paint override                         |
| `fillOpacity` | `number`                             | SVG default                    | Fill opacity                                     |
| `layout`      | `GroupLayout \| StackLayout`         | Implicit diverging stack       | Configures grouping or stack order/offset        |
| `inset`       | `number`                             | `0`                            | Pixels removed from both categorical edges       |
| `radius`      | `number`                             | None                           | SVG rectangle corner radius                      |
| `states`      | `readonly ChartMarkState[]`          | None                           | Focus-driven presentation overrides              |

The interaction point is at the group-band center and the `y2`/`y` endpoint.
Its semantic `xValue` is x and its `yValue` is the value endpoint.

## `barX`

`barX` draws horizontal bars from `x1` to `x2` at y.

```ts
const mark = barX(rows, {
  x: 'value',
  y: 'category',
})
```

```ts
function barX<TDatum>(
  source: Iterable<TDatum>,
  options?: BarXOptions<TDatum>,
): ChartMark<TDatum, number, InferredY>
```

Its options transpose `barY`:

| Option        | Type                                 | Default                        | Meaning                                     |
| ------------- | ------------------------------------ | ------------------------------ | ------------------------------------------- |
| `id`          | `string`                             | Layer-derived                  | Stable mark ID                              |
| `x`           | `Channel<TDatum, number?>`           | Numeric datum                  | Length; implicitly stacked at each y        |
| `x1`          | `number \| Channel<TDatum, number?>` | Implicit stack start           | Explicit baseline endpoint                  |
| `x2`          | `number \| Channel<TDatum, number?>` | Implicit stack end             | Explicit value endpoint; takes precedence   |
| `y`           | `Channel<TDatum, ChartValue?>`       | Row index                      | Bar category or center                      |
| `z`           | `Channel<TDatum, ChartKey?>`         | No group                       | Group identity; color fallback when omitted |
| `color`       | `Channel<TDatum, ChartKey?>`         | `z`                            | Independent color-scale value               |
| `key`         | `Channel<TDatum, ChartKey>`          | Top/nested `id`, y, then index | Stable identity                             |
| `fill`        | `VisualChannel<TDatum, string>`      | Resolved `color`               | Final bar paint override                    |
| `fillOpacity` | `number`                             | SVG default                    | Fill opacity                                |
| `layout`      | `GroupLayout \| StackLayout`         | Implicit diverging stack       | Configures grouping or stack order/offset   |
| `inset`       | `number`                             | `0`                            | Pixels removed from both categorical edges  |
| `radius`      | `number`                             | None                           | Corner radius                               |
| `states`      | `readonly ChartMarkState[]`          | None                           | Focus-driven presentation overrides         |

The interaction point is at the `x2`/`x` endpoint and group-band center.

## Bar bandwidth

With a band scale on the categorical axis, bars use its responsive bandwidth.
With a nonband scale, the mark estimates width from the smallest distance
between distinct mapped positions and uses 80 percent of that distance. A
single-position fallback is capped at 48 pixels.

For predictable categorical bars, use a configured band scale and set its
padding. Scale setup and ownership are documented in
[Scales and D3](../../concepts/scales-and-d3.md).

`inset` is applied after band or inferred layout and is clamped to at least
zero. A sufficiently large inset produces a zero-width or zero-height bar
rather than negative geometry.

## Grouped bars

Grouping is explicit:

```ts
barY(rows, {
  x: 'quarter',
  y: 'revenue',
  color: 'region',
  layout: group(),
})
```

`group()` creates a secondary band scale inside the primary categorical band.
Use `group({ padding: 0.2 })` for the common spacing control, or pass
`group({ scale })` when subgroup order is fixed application state.
`GroupOptions` is the reusable configuration shape for those `padding` and
`scale` controls.

An explicit `z` supplies subgroup identity. If `z` is omitted, a discrete
`color` channel may supply identity after grouped geometry has been selected.
When both are present, `z` controls placement and interaction grouping while
`color` remains independent. A continuous color channel cannot infer series.

The mark throws when:

- the scale has no `bandwidth` method
- a grouped row has a null effective group value
- a group value is outside the group-scale domain or maps to a nonfinite position

Repeated positions stack by default. `layout: group()` is the explicit opt-in
to side-by-side geometry.

## Stacked bars

The single value channel is a length. Repeated categorical positions stack
automatically, with positive and negative values diverging from zero:

```ts
barY(rows, {
  x: 'quarter',
  y: 'revenue',
  color: 'region',
})
```

Use `z` when series identity differs from color. Add `layout: stack()` only
when the default stack needs a configured order or offset:

```ts
barY(rows, {
  x: 'quarter',
  y: 'revenue',
  color: 'segment',
  layout: stack({
    order: ['Core', 'Services'],
    offset: 'normalize',
  }),
})
```

`order` accepts input order, ascending or descending absolute totals, or an
explicit series list. `reverse` reverses the resolved order. `offset` accepts
`diverging` (default), `normalize`, `center`, or `wiggle`.

```ts
type StackOrder = 'input' | 'ascending' | 'descending' | readonly ChartKey[]
type StackOffset = 'diverging' | 'normalize' | 'center' | 'wiggle'

interface StackOptions {
  order?: StackOrder
  offset?: StackOffset
  reverse?: boolean
}

interface StackLayout extends StackOptions {
  readonly type: 'stack'
}
```

Supplying `y1` or `y2` opts out of implicit stacking and treats the channels
as authored endpoints. The same contract is transposed for `barX`.

## Bar baselines and invalid rows

Implicit stacks include zero in inferred quantitative domains. Explicit
endpoints contribute their authored bounds. The configured scale still owns
its semantic domain.

Rows are skipped when their category, baseline, or endpoint is invalid.
Negative and reversed intervals are supported because geometry uses the
minimum mapped endpoint and absolute length.

## `bandX` and `bandY`

`bandX` paints the complete plot height at each x value. `bandY` paints the
complete plot width at each y value. They are ordinary marks used for
categorical backgrounds and focus presentation:

```ts
whenFocused(
  bandX(rows, {
    x: 'category',
    fill: '#64748b',
    fillOpacity: 0.14,
    inset: -6,
  }),
  { match: 'x' },
)
```

`BandXOptions` and `BandYOptions` provide the positional channel, `z`, `color`,
`key`, `fill`, `fillOpacity`, `inset`, and `radius`. A negative inset expands
the resolved band. The helpers are also available from
`@tanstack/charts/band`.

## `rect`

`rect` draws one independent x/y interval per valid row:

```ts
const mark = rect(events, {
  x1: 'start',
  x2: 'end',
  y: 'lane',
  z: 'status',
})
```

```ts
function rect<TDatum>(
  source: Iterable<TDatum>,
  options: RectOptions<TDatum>,
): ChartMark<
  TDatum,
  InferredPointX,
  InferredPointY,
  InferredScaleX,
  InferredScaleY
>
```

### Options

| Option        | Type                           | Default                                | Meaning                                              |
| ------------- | ------------------------------ | -------------------------------------- | ---------------------------------------------------- |
| `id`          | `string`                       | Layer-derived                          | Stable mark ID                                       |
| `x`           | `Channel<TDatum, ChartValue?>` | Row index                              | X center/category and preferred semantic focus value |
| `x1`          | `Channel<TDatum, ChartValue?>` | `x`, or row index when x is absent     | First x endpoint                                     |
| `x2`          | `Channel<TDatum, ChartValue?>` | `x`                                    | Second x endpoint                                    |
| `y`           | `Channel<TDatum, ChartValue?>` | Numeric datum                          | Y center/category and preferred semantic focus value |
| `y1`          | `Channel<TDatum, ChartValue?>` | `y`                                    | First y endpoint                                     |
| `y2`          | `Channel<TDatum, ChartValue?>` | `y`                                    | Second y endpoint                                    |
| `z`           | `Channel<TDatum, ChartKey?>`   | No group                               | Interaction group                                    |
| `color`       | `Channel<TDatum, ChartKey?>`   | `z`                                    | Value sent to the chart color scale                  |
| `key`         | `Channel<TDatum, ChartKey>`    | Top/nested `id`, x/y tuple, then index | Stable identity                                      |
| `fill`        | `string`                       | Resolved color                         | Final constant fill override                         |
| `fillOpacity` | `number`                       | SVG default                            | Fill opacity                                         |
| `stroke`      | `string`                       | None                                   | Constant stroke                                      |
| `strokeWidth` | `number`                       | SVG default                            | Stroke width                                         |
| `inset`       | `number`                       | `0.75`                                 | Pixels removed from all four edges                   |
| `radius`      | `number`                       | None                                   | Corner radius                                        |
| `states`      | `readonly ChartMarkState[]`    | None                                   | Focus-driven presentation overrides                  |

Both endpoints must be valid chart values. Endpoint order may be reversed.

When two semantic endpoints are equal and the resolved scale has bandwidth,
the rect spans that complete band. Otherwise it spans the mapped endpoint
distance. This lets `x: 'column', y: 'row'` create a heatmap cell without
manually deriving boundaries.

The interaction coordinate is the geometric center before inset. Semantic
point values use a valid `x` and `y`. An omitted `x` defaults to the row index;
an invalid x falls back to `x2`. An omitted or invalid y falls back to `y2`
unless the datum itself is numeric. Scale typing still includes all interval
endpoints, so a heterogeneous interval remains honest without widening
interaction callbacks unnecessarily.

## `cell`

`cell` is `rect` without explicit endpoint options:

```ts
const mark = cell(rows, {
  x: 'weekday',
  y: 'week',
  z: 'bucket',
  fillOpacity: 0.9,
})
```

```ts
type CellOptions<TDatum> = Omit<RectOptions<TDatum>, 'x1' | 'x2' | 'y1' | 'y2'>
```

Both axes normally use band scales. `cell` shares rect rendering, defaults,
focus behavior, and class names.
