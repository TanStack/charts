---
title: Custom Extensions
description: Extend TanStack Charts with custom marks, distinct scale values, curves, scales, color, legends, text measurement, spatial indexes, and renderers.
---

TanStack Charts exposes narrow inversion-of-control boundaries around its
scene compiler. Prefer composition with built-in marks first. Add an extension
when the chart requires geometry or behavior that cannot be expressed without
distorting its data model.

## Composite marks

`compositeMark` groups ordinary marks behind one stable parent identity:

```ts
import { compositeMark } from '@tanstack/charts/mark/composite'

function compositeMark<
  TMarks extends readonly ChartMark<any, any, any, any, any>[],
>(
  marks: TMarks,
  options?: CompositeMarkOptions<ChartMarkDatum<TMarks[number]>>,
): ChartMark<
  ChartMarkDatum<TMarks[number]>,
  ChartMarkPointX<TMarks[number]>,
  ChartMarkPointY<TMarks[number]>,
  ChartMarkScaleX<TMarks[number]>,
  ChartMarkScaleY<TMarks[number]>
>
```

`CompositeMarkOptions` contains optional `id`, `motion`, and `renderer` fields.
The result preserves the union of child datum and positional types. Initialization merges
the children's semantic channels under parent and child namespaces. Rendering
keeps child order, namespaces scene keys and mark IDs, and retains each child
point as a separate interaction target. Parent and child motion definitions
merge under the resolved child namespace, with child fields taking precedence.

Every child must have a unique ID and an ordinary initialized `render` method.
A child that owns `resolveLayout` is rejected; keep one resolved-layout owner
instead of nesting scheduling lifecycles. See
[Custom Marks and Renderers](../guides/custom-marks-and-renderers.md#group-reusable-child-marks)
for composition guidance.

## Custom marks

```ts
import { createMark } from '@tanstack/charts'
```

```ts
function createMark<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
  TXScaleId extends string = 'x',
  TYScaleId extends string = 'y',
>(
  initialize: (
    context: MarkInitializeContext,
  ) => MarkInitialization<TDatum, TXValue, TYValue>,
  motion?: ChartMotionDefinition<TDatum>,
  renderer?: ChartMarkRenderer,
): ChartMark<TDatum, TXValue, TYValue, TXValue, TYValue, TXScaleId, TYScaleId>
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
  motion?: ChartMotionDefinition<any>
  viewport?: Readonly<Partial<Record<'x' | 'y', 'content' | 'fixed'>>>
  focusGuideOnly?: boolean
  layoutLabels?(context: MarkRenderContext): readonly SceneLabel[]
  render(context: MarkRenderContext): MarkScene<TDatum, TXValue, TYValue>
  resolveLayout?(
    context: MarkResolvedLayoutContext,
  ): ResolvedMarkLayout<TDatum, TXValue, TYValue>
}
```

`MarkInitialization` also accepts a `ResolvedLayoutMarkInitialization`, which
has `resolveLayout` instead of an initial `render`. `createMark` normalizes both
forms to `InitializedMark`, so wrappers around ordinary marks retain a callable
`render`.

The optional factory `motion` is copied onto each initialized mark. An
initializer may return its own `motion` when a composite or resolved layout
needs a scene-local policy; that value takes precedence over the factory
fallback.

The optional third `renderer` argument is copied onto the nodes returned by
both direct `render` and resolved-layout render paths. It does not replace or
shift the motion argument. Use a stable `ChartMarkRenderer` instance so an
update can reuse its existing surface composition.

Materialized channels declare semantic values before scale resolution:

```ts
interface MaterializedChannel {
  scale?: string
  values: readonly unknown[]
  includeZero?: boolean
}
```

Use a `ChartSpec.scales` ID for a positional channel. The reserved `x` and `y`
IDs are the defaults; additional IDs select named scales. Use `scale: 'color'`
for the shared color scale, and do not reuse `color` as a positional scale ID.
Pass named position IDs through the `createMark` scale ID type parameters so
their values do not widen the reserved scale types. `includeZero` is a hint
available to a custom scale resolver. Filter invalid values before
materializing them.

`viewport` overrides presentation ownership independently for x and y. Without
an override, a mark is viewport content on an axis when one of its materialized
channels uses that axis. `'content'` forces the mark into that axis's clipped,
translated layer even when no channel establishes the relationship. `'fixed'`
keeps the mark stationary on that axis even when a channel contributes to its
domain. This ownership does not change scale-domain contribution.

The exported `ChartContinuousDomain<TValue>` type represents viewport state as
either `readonly [number, number]` or `readonly [Date, Date]`, narrowed by the
mark and axis value type. Numeric and temporal endpoints cannot be mixed.

Render nodes and points with `context.scales[axis].map`. The scene compiler
applies the mark's viewport translation and remaps its interaction-point
references. `scale.viewport?.map` is for consumers that need the final
presented coordinate outside mark rendering.

The render context provides final geometry and shared presentation:

```ts
interface MarkRenderContext {
  markIndex: number
  surface: ChartBounds
  chart: ChartBounds
  scales: Readonly<Record<string, ResolvedScale>>
  theme: ChartTheme
  color(value: ChartKey | null | undefined): string
  colors: ResolvedColorScale
  layout: ChartLayoutOptions
}
```

### Final-screen mark layout

Use `resolveLayout` when binning, collision avoidance, topology, or responsive
packing depends on final positional scales and inner bounds:

```ts
interface MarkResolvedLayoutContext {
  markIndex: number
  chart: ChartBounds
  scales: Readonly<Record<string, ResolvedScale>>
  theme: ChartTheme
  layout: ChartLayoutOptions
}

interface ResolvedMarkLayout<TDatum, TXValue, TYValue> {
  channels?: Readonly<Record<string, MaterializedChannel>>
  states?: InitializedMark<TDatum, TXValue, TYValue>['states']
  layoutLabels?(context: MarkRenderContext): readonly SceneLabel[]
  render(context: MarkRenderContext): MarkScene<TDatum, TXValue, TYValue>
}
```

The margin solver may call `resolveLayout` more than once. Keep it synchronous,
pure, deterministic, and free of application state. Initial channels alone
establish x/y domains. Resolved channels replace them for final
non-positional inference, including color; resolved x/y values never re-domain
the positional scales. Derived rows stay inside the returned render closure
instead of becoming a cross-mark transform graph.

If a custom mark emits labels that should participate in automatic margins,
return the same positioned labels from `layoutLabels`. The solver may call it
more than once with different responsive ranges; keep it pure. `render` still
runs once with the final layout. The built-in Cartesian `text` mark provides
this hook.

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
  focusAnchors?: readonly ChartFocusAnchor[]
  focusGuides?: readonly MarkFocusGuide[]
}

type MarkFocusGuide = Omit<SceneFocusGuide, 'placement'> & {
  placement?: SceneFocusGuide['placement']
}
```

`focusAnchors` let `whenFocused` reveal decorative geometry without making it
a pointer or keyboard target. `focusGuides` describe data-less presentation
resolved from current focus or cursor state. `MarkFocusGuide` has the final
`SceneFocusGuide` fields except that `placement` is optional. Omit it to let
mark order place a guide under or over the first ordinary mark. Supply it only
when a composed nested scene must preserve an already resolved placement.
Every focus guide supplies a `resolve` callback that receives
`SceneFocusGuideResolveContext` and returns one transient `SceneNode` or
`undefined`. The callback stays attached to the optional guide instead of
becoming unconditional renderer policy. Import `resolveCrosshairGuide` from
`@tanstack/charts/crosshair` to reuse the built-in rule, band, label, and marker
behavior.

Set `focusGuideOnly: true` on an initialized mark that contributes only these
dynamic guides and no ordinary base-scene content. This explicit
classification keeps the mark out of the first-ordinary-mark boundary used by
default placement. `surface` is the required full-surface bounds; `chart` is
the inner plot. Guide rules normally clip to `chart`, while labels may use
`surface` for clamping.

The practical contracts are in
[Custom Marks and Renderers](../guides/custom-marks-and-renderers.md).

### Mark requirements

- Give the mark a stable ID. Derive a fallback from `markIndex` only when layer
  order is stable.
- Materialize every value needed to establish positional domains during
  initialization.
- Map through `context.scales`; do not recalculate responsive ranges.
- Declare `viewport` ownership when channel inference does not match the
  mark's content or fixed annotation behavior.
- Give each scene node and point a deterministic key.
- Keep presentation-only focus anchors keyed to the nodes they reveal.
- Emit finite geometry only.
- Preserve the original datum and index in every interaction point.
- Use one honest focus coordinate and semantic x/y pair per point.
- Keep semantic row transforms eager and outside `render`; use
  `resolveLayout` only for work that requires final screen geometry.

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
  TXScaleId extends string = 'x',
  TYScaleId extends string = 'y',
>(
  initialize: (
    context: MarkInitializeContext,
  ) => MarkInitialization<TDatum, TXPointValue, TYPointValue>,
  motion?: ChartMotionDefinition<TDatum>,
  renderer?: ChartMarkRenderer,
): ChartMark<
  TDatum,
  TXPointValue,
  TYPointValue,
  TXScaleValue,
  TYScaleValue,
  TXScaleId,
  TYScaleId
>
```

The subpath also exports `ChartMarkPointX`, `ChartMarkPointY`,
`ChartMarkScaleX`, and `ChartMarkScaleY`. Use it only when the distinction is
real; ordinary custom marks should use `createMark`. Pass named scale IDs in
the last two type parameters when the mark does not use reserved `x` or `y`.

## Curves

`ChartCurve` supplies precomputed path data for line and y-oriented area marks:

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
[Scales](../concepts/scales-and-d3.md).

## Custom positional scales

A custom `ChartScale` resolves semantic values and the responsive range into a
complete mapping and tick set. This is an unchecked math boundary; prefer a
configured callable scale when possible.

See [Custom scales](./scales-guides-and-color.md#custom-scales)
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
guide geometry, not mark text rendering. It is synchronous and receives the
complete resolved `ChartTextTypography`; hosts re-render after asynchronous
font readiness changes.

See [Automatic guide layout](./scales-guides-and-color.md#automatic-guide-layout)
for the contract.

## Spatial indexes

`ChartSpatialIndexFactory` replaces the default linear pointer lookup without
changing scene compilation. Build a point-only index from its first argument,
or use `context.scene` from its second argument to index resolved primitive
bounds. Return the nearest original point within the requested distance. The
host recreates the index when the scene or factory changes.

See [Spatial indexes](./focus-and-interaction.md#spatial-indexes). The
appropriate granular spatial primitive can be brought through the boundary
described in [Scales](../concepts/scales-and-d3.md).

## Custom focus and gestures

`ChartFocusStrategy` owns pointer resolution, focus grouping, and keyboard task
order. Its `resolve(points, context)` and `group(points, context)` methods keep
coordinates and the active point in named context bags. Rich gestures can
instead disable chart-owned focus and maintain selection or viewport state in
the application.

See [Focus and interaction](./focus-and-interaction.md).

## Custom renderers

A `ChartRenderer` owns both deterministic server markup and one mounted
`ChartSurface`. The surface renders scenes, converts browser coordinates to
scene coordinates, paints focus, and releases renderer-owned resources.
`mountChartRenderer` keeps responsive sizing, runtime updates, focus,
keyboard, tooltip, and selection behavior shared across renderers.

Custom surfaces should resolve authored focus layers and data-less guides with
`resolveFocusPresentation(scene, focus, pointer, cursor)`, then paint its
`under` nodes, the base scene, and its `over` nodes in that order.

The scene compiler has already converted every mark-emitted `MarkFocusGuide`
to a `SceneFocusGuide` with required `placement` before a renderer receives the
scene. `resolveFocusPresentation` calls each guide's resolver with its local
focus, pointer, and cursor context. A custom renderer should consume those
resolved nodes and final placement through that helper; it should not call
guide resolvers or infer mark order again.

Use `@tanstack/charts/renderer` directly or the framework `/core` entries.
The optional built-in implementation at `@tanstack/charts/canvas` demonstrates
the boundary without changing the default SVG imports.

`ChartMarkRenderer` is the small renderer-selection token stored in universal
mark and scene types. A DOM implementation uses `ChartLayerRenderer`, which
extends `ChartRenderer` and `ChartMarkRenderer` with
`compose(defaultRenderer)`. `UniversalChartLayerRenderer` provides the same
contract for a definition-agnostic renderer. The returned compositor owns the
ordered child surfaces and exposes them through `ChartSurface.layers`.

Built-in marks accept a `ChartMarkRenderer` through their shared
`ChartMarkOptions`. Custom marks pass it as the third factory argument, after
the optional motion definition. See
[Mark-level renderers](./rendering-and-export.md#mark-level-renderers).

For an SVG-only serialization change, pass a `ChartSvgRenderer` as `renderSvg`
to the compatibility host or adapt it with `createSvgChartRenderer` from
`@tanstack/charts/svg/renderer`. Preserve the SVG root, stable DOM keys,
accessible name, coordinate system, and focus presentation expected by that
adapter.

Default SVG serialization already preserves declared gradients and group
clips; see [Rendering and export](./rendering-and-export.md#svg-resources).
