---
title: Custom Extensions
description: Extend TanStack Charts with custom marks, distinct scale values, curves, scales, color, legends, text measurement, spatial indexes, and SVG renderers.
---

TanStack Charts exposes narrow inversion-of-control boundaries around its
scene compiler. Prefer composition with built-in marks first. Add an extension
when the chart requires geometry or behavior that cannot be expressed without
distorting its data model.

## Custom marks

```ts
import { createMark } from '@tanstack/charts'
```

```ts
function createMark<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(
  initialize: (
    context: MarkInitializeContext,
  ) => InitializedMark<TDatum, TXValue, TYValue>,
): ChartMark<TDatum, TXValue, TYValue>
```

Initialization runs once per scene compilation and receives the mark's layer
index:

```ts
interface MarkInitializeContext {
  markIndex: number
}

interface InitializedMark<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  id: string
  channels: Readonly<Record<string, MaterializedChannel>>
  render(context: MarkRenderContext): MarkScene<TDatum, TXValue, TYValue>
}
```

Materialized channels declare semantic values before scale resolution:

```ts
interface MaterializedChannel {
  scale?: string
  values: readonly unknown[]
  includeZero?: boolean
}
```

Use `scale: 'x'`, `scale: 'y'`, or `scale: 'color'` for shared chart scales.
`includeZero` is a hint available to a custom scale resolver. Filter invalid
values before materializing them.

The render context provides final geometry and shared presentation:

```ts
interface MarkRenderContext {
  markIndex: number
  chart: ChartBounds
  scales: Readonly<Record<string, ResolvedScale>>
  theme: ChartTheme
  color(value: ChartKey | null | undefined): string
  layout: ChartLayoutOptions
}
```

Return keyed scene nodes and, when the mark participates in native
interaction, typed points:

```ts
interface MarkScene<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  nodes: readonly SceneNode[]
  points?: readonly ChartPoint<TDatum, TXValue, TYValue>[]
}
```

### Mark requirements

- Give the mark a stable ID. Derive a fallback from `markIndex` only when layer
  order is stable.
- Materialize every value needed to establish scale domains before rendering.
- Map through `context.scales`; do not recalculate responsive ranges.
- Give each scene node and point a deterministic key.
- Emit finite geometry only.
- Preserve the original datum and index in every interaction point.
- Use one honest focus coordinate and semantic x/y pair per point.
- Keep preprocessing outside `render`, or in a dynamic definition's
  `prepare`.

The scene node and point shapes are documented in
[Runtime and scene](./runtime-and-scene.md).

## Distinct point and scale values

Interval geometry may materialize endpoint value types that differ from its
interaction anchor types. Use the exceptional subpath:

```ts
import { createMarkWithScaleValues } from '@tanstack/charts/mark/scale-values'
```

```ts
function createMarkWithScaleValues<
  TDatum,
  TXPointValue extends ChartValue,
  TYPointValue extends ChartValue,
  TXScaleValue extends ChartValue,
  TYScaleValue extends ChartValue,
>(
  initialize: (
    context: MarkInitializeContext,
  ) => InitializedMark<TDatum, TXPointValue, TYPointValue>,
): ChartMark<TDatum, TXPointValue, TYPointValue, TXScaleValue, TYScaleValue>
```

The subpath also exports `ChartMarkPointX`, `ChartMarkPointY`,
`ChartMarkScaleX`, and `ChartMarkScaleY`. Use it only when the distinction is
real; ordinary custom marks should use `createMark`.

## Curves

`ChartCurve` supplies precomputed SVG paths for line and y-oriented area marks:

```ts
interface ChartCurve {
  line(points: readonly (readonly [number, number])[]): string
  area(
    top: readonly (readonly [number, number])[],
    bottom: readonly (readonly [number, number])[],
  ): string
}
```

`AreaXCurve` has the transposed contract:

```ts
interface AreaXCurve {
  areaX(
    right: readonly (readonly [number, number])[],
    left: readonly (readonly [number, number])[],
  ): string
}
```

The optional bridges `d3Curve` from `@tanstack/charts/d3/shape` and
`d3AreaXCurve` from `@tanstack/charts/d3/area-x` adapt a supplied curve factory
to these contracts. D3 module ownership and granular imports are documented in
[Scales and D3](../concepts/scales-and-d3.md).

## Custom positional scales

A custom `ChartScale` resolves semantic values and the responsive range into a
complete mapping and tick set. This is an unchecked math boundary; prefer a
configured callable scale when possible.

See [Advanced custom scales](./scales-guides-and-color.md#advanced-custom-scales)
for the exact context and return type.

## Custom color scales and legends

`ChartColorScale` maps observed values, domain/range hints, and theme tokens to
a `ResolvedColorScale`. `ChartColorLegend` independently reserves layout height
and emits a scene node.

See [Color](./scales-guides-and-color.md#color) and
[Custom legends](./scales-guides-and-color.md#custom-legends).

## Custom text measurement

`ChartTextMeasurer` lets nonbrowser rendering, special fonts, or an
application-owned typography engine provide painted glyph bounds. It affects
guide geometry, not mark text rendering.

See [Automatic guide layout](./scales-guides-and-color.md#automatic-guide-layout)
for the contract.

## Spatial indexes

`ChartSpatialIndexFactory` replaces the default linear pointer lookup without
changing scene compilation. Build the index from supplied points and return
the nearest point within the requested distance. The host recreates it when
the scene or factory changes.

See [Spatial indexes](./focus-and-interaction.md#spatial-indexes). The
appropriate granular spatial primitive can be brought through the boundary
described in [Scales and D3](../concepts/scales-and-d3.md).

## Custom focus and gestures

`ChartFocusStrategy` owns pointer resolution, focus grouping, and keyboard task
order. Rich gestures can instead disable chart-owned focus and maintain
selection or viewport state in the application.

See [Focus and interaction](./focus-and-interaction.md).

## Custom SVG renderers

Pass a `ChartSvgRenderer` as `renderSvg` to a host or adapter. It receives the
complete scene and static SVG render options and returns markup.

The built-in DOM host expects an SVG root, uses stable DOM keys for updates,
queries `svg.ts-chart` for `onRender`, and paints a
`[data-ts-chart-focus]` element. Preserve those contracts for built-in host
behavior. If the renderer uses its own DOM tree or canvas, own the lifecycle
outside `mountChart` and consume `ChartScene` directly.

Resource-aware SVG is already available through
`renderChartSvgWithResources`; see
[Rendering and export](./rendering-and-export.md#resource-aware-svg).
