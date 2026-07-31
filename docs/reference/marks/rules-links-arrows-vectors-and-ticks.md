---
title: Rules, Links, Arrows, Vectors, and Ticks
description: Reference for ruleX, ruleY, link, arrow, vector, tickX, and tickY geometry, channels, defaults, curves, and focus anchors.
---

These marks cover reference lines, independent segments, directed
relationships, fixed-pixel vectors, and compact glyphs. They compose with any
other mark and use the chart's shared positional and color scales.

```ts
import {
  arrow,
  link,
  ruleX,
  ruleY,
  tickX,
  tickY,
  vector,
} from '@tanstack/charts'
```

## `ruleX` and `ruleY`

`ruleX` draws a vertical rule through the complete inner chart height.
`ruleY` draws a horizontal rule through the complete inner chart width.

```ts
ruleX(events, { x: 'date', stroke: '#dc2626' })
ruleY([0], { strokeOpacity: 0.7, strokeDasharray: '4 2' })
```

```ts
function ruleX<TDatum>(
  source: Iterable<TDatum>,
  options?: RuleXOptions<TDatum>,
): ChartMark<never, InferredX, never>

function ruleY<TDatum>(
  source: Iterable<TDatum>,
  options?: RuleYOptions<TDatum>,
): ChartMark<never, never, InferredY>
```

Options are orientation-specific:

| Option            | Type                            | Default                               | Meaning                             |
| ----------------- | ------------------------------- | ------------------------------------- | ----------------------------------- |
| `id`              | `string`                        | Layer-derived                         | Stable mark ID                      |
| `x`               | `Channel<TDatum, ChartValue?>`  | Datum itself when it is a chart value | `ruleX` position                    |
| `y`               | `Channel<TDatum, ChartValue?>`  | Datum itself when it is a chart value | `ruleY` position                    |
| `color`           | `Channel<TDatum, ChartKey?>`    | No value                              | Value sent to the chart color scale |
| `stroke`          | `VisualChannel<TDatum, string>` | Resolved color or theme foreground    | Final rule paint override           |
| `strokeOpacity`   | `number`                        | `0.5`                                 | Stroke opacity                      |
| `strokeWidth`     | `number`                        | SVG default                           | Stroke width                        |
| `strokeDasharray` | `string`                        | None                                  | SVG dash array                      |

Rules emit no interaction points and therefore do not participate in native
focus or tooltips. Their datum type is intentionally absent from the chart's
interaction union.

## `link`

`link` draws one independent segment per row. It is appropriate for networks,
slopegraphs, error intervals, and annotations. Use `lineY` when consecutive
rows form one path.

```ts
link(edges, {
  x1: 'sourceX',
  y1: 'sourceY',
  x2: 'targetX',
  y2: 'targetY',
  z: 'kind',
  strokeWidth: (edge) => edge.weight,
  lineCap: 'butt',
})
```

```ts
function link<TDatum>(
  source: Iterable<TDatum>,
  options: LinkOptions<TDatum>,
): ChartMark<TDatum, InferredEndpointX, InferredEndpointY>
```

| Option            | Type                            | Default                | Meaning                             |
| ----------------- | ------------------------------- | ---------------------- | ----------------------------------- |
| `id`              | `string`                        | Layer-derived          | Stable mark ID                      |
| `x1`, `y1`        | required channels               | —                      | First endpoint                      |
| `x2`, `y2`        | required channels               | —                      | Second endpoint                     |
| `z`               | `Channel<TDatum, ChartKey?>`    | No group               | Interaction group                   |
| `color`           | `Channel<TDatum, ChartKey?>`    | `z`                    | Value sent to the chart color scale |
| `key`             | `Channel<TDatum, ChartKey>`     | Top/nested `id`, index | Stable identity                     |
| `stroke`          | `VisualChannel<TDatum, string>` | Resolved color         | Final segment paint override        |
| `strokeOpacity`   | `VisualChannel<TDatum, number>` | SVG default            | Stroke opacity                      |
| `strokeWidth`     | `VisualChannel<TDatum, number>` | `1.5`                  | Stroke width                        |
| `strokeDasharray` | `string`                        | None                   | SVG dash array                      |
| `lineCap`         | `"butt" \| "round" \| "square"` | `"round"`              | Stroke cap                          |
| `curve`           | `ChartCurve`                    | Straight rule          | Optional path generator             |

With no curve, the scene contains a rule. With a curve, it contains a
two-point polyline with the generated path. The interaction coordinate is the
pixel midpoint; semantic `xValue` and `yValue` are the second endpoint.

The optional `d3Curve` bridge and granular algorithm boundary are documented in
[Line and area](./line-and-area.md#curves) and
[Scales and D3](../../concepts/scales-and-d3.md).

## `arrow`

`arrow` draws one straight directed segment with a fixed-pixel head:

```ts
arrow(edges, {
  x1: 'sourceX',
  y1: 'sourceY',
  x2: 'targetX',
  y2: 'targetY',
  headLength: 10,
  headAngle: 28,
})
```

```ts
function arrow<TDatum>(
  source: Iterable<TDatum>,
  options: ArrowOptions<TDatum>,
): ChartMark<TDatum, InferredEndpointX, InferredEndpointY>
```

| Option          | Type                            | Default                | Meaning                                         |
| --------------- | ------------------------------- | ---------------------- | ----------------------------------------------- |
| `id`            | `string`                        | Layer-derived          | Stable mark ID                                  |
| `x1`, `y1`      | required channels               | —                      | Tail endpoint                                   |
| `x2`, `y2`      | required channels               | —                      | Head endpoint                                   |
| `z`             | `Channel<TDatum, ChartKey?>`    | No group               | Interaction group                               |
| `color`         | `Channel<TDatum, ChartKey?>`    | `z`                    | Value sent to the chart color scale             |
| `key`           | `Channel<TDatum, ChartKey>`     | Top/nested `id`, index | Stable identity                                 |
| `stroke`        | `VisualChannel<TDatum, string>` | Resolved color         | Final arrow paint override                      |
| `strokeOpacity` | `number`                        | SVG default            | Stroke opacity                                  |
| `strokeWidth`   | `number`                        | `1.5`                  | Stroke width                                    |
| `headLength`    | `number`                        | `8`                    | Head length in pixels, clamped to at least zero |
| `headAngle`     | `number`                        | `30`                   | Half-angle in degrees                           |

The arrowhead stays the same pixel size as scales and container dimensions
change. The interaction coordinate and semantic x/y values are the head
endpoint.

## `vector`

`vector` places a fixed-pixel directed vector at a scaled anchor:

```ts
vector(wind, {
  x: 'longitude',
  y: 'latitude',
  length: 'speed',
  rotate: 'bearing',
  anchor: 'middle',
  z: 'region',
})
```

```ts
function vector<TDatum>(
  source: Iterable<TDatum>,
  options: VectorOptions<TDatum>,
): ChartMark<TDatum, InferredX, InferredY>
```

| Option          | Type                                 | Default                | Meaning                                         |
| --------------- | ------------------------------------ | ---------------------- | ----------------------------------------------- |
| `id`            | `string`                             | Layer-derived          | Stable mark ID                                  |
| `x`, `y`        | required channels                    | —                      | Scaled anchor                                   |
| `length`        | `number \| Channel<TDatum, number?>` | `12`                   | Vector length in pixels                         |
| `rotate`        | `number \| Channel<TDatum, number?>` | `0`                    | Clockwise degrees; zero points up               |
| `anchor`        | `'start' \| 'middle' \| 'end'`       | `'middle'`             | Which vector position stays at x/y              |
| `z`             | `Channel<TDatum, ChartKey?>`         | No group               | Interaction group                               |
| `color`         | `Channel<TDatum, ChartKey?>`         | `z`                    | Value sent to the chart color scale             |
| `key`           | `Channel<TDatum, ChartKey>`          | Top/nested `id`, index | Stable identity                                 |
| `stroke`        | `VisualChannel<TDatum, string>`      | Resolved color         | Final stroke override                           |
| `strokeOpacity` | `number`                             | SVG default            | Stroke opacity                                  |
| `strokeWidth`   | `number`                             | `1.5`                  | Stroke width                                    |
| `headLength`    | `number`                             | `5`                    | Head length in pixels, clamped to at least zero |
| `headAngle`     | `number`                             | `30`                   | Head half-angle in degrees                      |

Length and rotation must be finite. Negative length reverses the body direction
while preserving the rotation convention. The interaction point remains the
scaled x/y anchor for every anchor mode.

## `tickX` and `tickY`

Ticks draw a short rule centered at a scaled point:

- `tickX` draws a vertical rule, so its length spans the y direction.
- `tickY` draws a horizontal rule, so its length spans the x direction.

```ts
tickX(rows, { x: 'category', y: 'value', z: 'series' })
tickY(rows, { x: 'value', y: 'category', length: 16 })
```

```ts
function tickX<TDatum>(
  source: Iterable<TDatum>,
  options: TickXOptions<TDatum>,
): ChartMark<TDatum, InferredX, InferredY>

function tickY<TDatum>(
  source: Iterable<TDatum>,
  options: TickYOptions<TDatum>,
): ChartMark<TDatum, InferredX, InferredY>
```

Both share:

| Option          | Type                            | Default                                      | Meaning                             |
| --------------- | ------------------------------- | -------------------------------------------- | ----------------------------------- |
| `id`            | `string`                        | Layer-derived                                | Stable mark ID                      |
| `x`, `y`        | required channels               | —                                            | Tick center                         |
| `z`             | `Channel<TDatum, ChartKey?>`    | No group                                     | Interaction group                   |
| `color`         | `Channel<TDatum, ChartKey?>`    | `z`                                          | Value sent to the chart color scale |
| `key`           | `Channel<TDatum, ChartKey>`     | Top/nested `id`, then index                  | Stable identity                     |
| `stroke`        | `VisualChannel<TDatum, string>` | Resolved color                               | Final tick paint override           |
| `strokeOpacity` | `number`                        | SVG default                                  | Stroke opacity                      |
| `strokeWidth`   | `number`                        | `1.5`                                        | Stroke width                        |
| `length`        | `number`                        | Perpendicular scale bandwidth, otherwise `6` | Total length before inset           |
| `inset`         | `number`                        | `0`                                          | Pixels removed from both ends       |

Available length is clamped to at least zero after subtracting twice the inset.
Each valid row emits one interaction point at the tick center.

## Invalid rows and identity

Links, arrows, vectors, and ticks skip rows with any invalid required
positional value. Links and arrows require all four endpoints. Stable `key`
channels are especially important for independent segments because keyed
reconciliation otherwise falls back to row index.
