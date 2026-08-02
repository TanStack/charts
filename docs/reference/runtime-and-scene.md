---
title: Runtime and Scene
description: Compile object and responsive chart definitions into renderer-neutral scenes.
---

TanStack Charts separates semantic chart construction from rendering:

1. a definition produces a [chart spec](./chart-spec.md)
2. marks materialize channels
3. scales and guide layout resolve against the current size
4. marks emit a keyed `ChartScene`
5. the selected SVG, Canvas, or custom renderer consumes that scene

Use `createChartRuntime` for repeated renders of object or responsive
definitions.
Use `createChartScene` for one static compilation.

## `createChartRuntime`

```ts
import { createChartRuntime } from '@tanstack/charts/runtime'

const runtime = createChartRuntime<Row, Date, number>()
const scene = runtime.render(definition, {
  width: 800,
  height: 400,
})

runtime.destroy()
```

```ts
function createChartRuntime<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(): ChartRuntime<TDatum, TXValue, TYValue>
```

`ChartRuntime.render` accepts a definition, size, and optional layout:

```ts
interface RuntimeRenderSignature {
  render(
    definition,
    size: { width: number; height: number },
    layout?: { measureText?: ChartTextMeasurer },
  ): ChartScene
}
```

Because a standalone runtime is created before its first `render` call, direct
use can supply datum, x-value, and y-value generics at the factory. DOM and
framework adapter hosts infer them from the definition.

### Runtime behavior

The runtime does not cache application data. A responsive builder receives the
current surface size on every direct render. Framework adapters and application
code own definition memoization and asynchronous cleanup.

## `createChartScene`

```ts
import { createChartScene } from '@tanstack/charts/scene'

const scene = createChartScene(
  staticDefinition,
  { width: 800, height: 400 },
  { measureText },
)
```

```ts
function createChartScene<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  definition: StaticChartDefinition<TDatum, TXValue, TYValue>,
  size: ChartSize,
  layout?: ChartLayoutOptions,
): ChartScene<TDatum, TXValue, TYValue>
```

`createChartScene` accepts static definitions only. It normalizes each scene
dimension to at least `1`, using `1` for a nonfinite value, resolves the theme,
initializes every mark, collects x, y, and color channels, resolves configured
scales, measures guides and legends, renders each mark once into the final
chart bounds, and returns a scene value.

It throws when a materialized positional channel has no scale. Omit dimensions
that no mark uses; explicit `null` is accepted only for an unused dimension.

## `defaultChartTheme`

```ts
import { defaultChartTheme } from '@tanstack/charts/scene'
```

The exported theme contains:

- `foreground: 'currentColor'`
- `muted: 'currentColor'`
- `grid: 'currentColor'`
- `background: 'transparent'`
- six CSS-variable-backed palette entries

Definitions merge partial overrides into this value. A supplied palette
replaces the default palette. See [Chart spec](./chart-spec.md#theme).

## `findNearestPoint`

```ts
import { findNearestPoint } from '@tanstack/charts/scene'

const point = findNearestPoint(scene, x, y, 48)
```

```ts
function findNearestPoint<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  scene: ChartScene<TDatum, TXValue, TYValue>,
  x: number,
  y: number,
  maxDistance?: number,
): ChartPoint<TDatum, TXValue, TYValue> | null
```

Coordinates are in scene pixels. `maxDistance` defaults to `Infinity`.
The function caches a paint-ordered interaction target list for the scene,
checks primitive containment first, and then applies each target's natural
axis or geometric affinity. Scene traversal accumulates group translation and
clipping, so the resolver and renderer consume the same post-layout tree.
Semantic points not attached to primitives retain legacy anchor distance. For
a large point set, supply a spatial index to the DOM or framework host; see
[Focus and interaction](./focus-and-interaction.md#spatial-indexes).

## `ChartScene`

```ts
interface ChartScene<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  width: number
  height: number
  margin: ChartMargin
  chart: ChartBounds
  nodes: readonly SceneNode[]
  points: readonly ChartPoint<TDatum, TXValue, TYValue>[]
  scales: Readonly<Record<string, ResolvedScale>>
  colors: ResolvedColorScale
  gradients: readonly ChartLinearGradient[]
  theme: ChartTheme
}
```

| Property          | Meaning                                                   |
| ----------------- | --------------------------------------------------------- |
| `width`, `height` | Full scene dimensions                                     |
| `margin`          | Resolved outer margins after guide and legend measurement |
| `chart`           | Inner plot bounds with `x`, `y`, `width`, and `height`    |
| `nodes`           | Ordered renderer-neutral display tree                     |
| `points`          | Interaction targets emitted by marks                      |
| `scales`          | Resolved positional scales, normally under `x` and `y`    |
| `colors`          | Resolved chart color scale                                |
| `gradients`       | Declared linear-gradient resources                        |
| `theme`           | Fully resolved theme                                      |

## Scene nodes

Every scene node has a stable `key`, optional `className`, optional
`SceneStyle`, and optional `ariaHidden`. Geometric primitives may also attach
a `SceneInteraction`; groups and labels cannot.

| `kind`     | Geometry                                                   |
| ---------- | ---------------------------------------------------------- |
| `group`    | `children`, optional translation and clip bounds           |
| `rule`     | `x1`, `y1`, `x2`, `y2`                                     |
| `polyline` | point pairs and optional precomputed path data             |
| `area`     | closed point pairs and optional precomputed path data      |
| `dot`      | center and radius                                          |
| `rect`     | origin, dimensions, and optional radius                    |
| `label`    | origin, text, anchor, baseline, rotation, size, and weight |

`SceneStyle` supports fill, fill opacity, stroke, stroke opacity, stroke width,
overall opacity, line cap, line join, and dash array.

`SceneRect.inset` retains the resolved inset for absolute inline-state
overrides. Its optional `insetAxis` is `x`, `y`, or `xy`; vertical and
horizontal bars use only their categorical axis, while ordinary rectangles use
both axes. Renderers consume the already-resolved rectangle geometry.

```ts
type SceneInteraction =
  | {
      point: ChartPoint
      points?: never
      affinity?: 'x' | 'y' | 'xy' | 'geometry'
    }
  | {
      point?: never
      points: readonly ChartPoint[]
      affinity?: 'x' | 'y' | 'xy' | 'geometry'
    }
```

Attach the exact point object returned in `MarkScene.points`. A continuous
primitive can attach several points, allowing one rendered line or area to
choose its nearest semantic sample without duplicating the primitive geometry.

Custom marks should return the smallest honest scene tree and stable keys. The
full initialization and render contracts are in
[Custom extensions](./custom-extensions.md#custom-marks).

## Interaction points

```ts
interface ChartPoint<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  key: string
  markId: string
  group: string | number | null
  groupLabel: string
  datum: TDatum
  datumIndex: number
  xValue: TXValue
  yValue: TYValue
  x1Value?: ChartValue
  x2Value?: ChartValue
  y1Value?: ChartValue
  y2Value?: ChartValue
  xInterval?: 'range' | 'difference'
  yInterval?: 'range' | 'difference'
  x: number
  y: number
  color: string
}
```

`xValue` and `yValue` are semantic values inferred from mark channels. `x` and
`y` are scene-pixel interaction coordinates. Interval marks also retain their
endpoints and whether the presented value is a range or endpoint difference.
The interaction coordinate need not describe every piece of a mark's geometry:
an interval rect may focus at its center, a link at its midpoint, and an arrow
at its endpoint.
