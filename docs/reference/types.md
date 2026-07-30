---
title: Types
description: Public TypeScript types, inference rules, channels, definitions, scenes, hosts, focus, rendering, and custom extension contracts.
---

TanStack Charts is inference-first. A mark's source data and channel selectors
flow through its definition into scales, axis formatters, host input, focus
callbacks, and selection callbacks. Normal application code should not cast
chart definitions or supply adapter generics.

## Values and channels

```ts
type ChartValue = number | string | Date
type ChartKey = string | number

type ChannelAccessor<TDatum, TValue> = (
  datum: TDatum,
  index: number,
  data: readonly TDatum[],
) => TValue

type Channel<TDatum, TValue> =
  ChannelField<TDatum, TValue> | ChannelAccessor<TDatum, TValue>

type VisualChannel<TDatum, TValue> = TValue | ChannelAccessor<TDatum, TValue>
```

The corresponding public type names are `Channel`, `ChannelAccessor`, and
`VisualChannel`.

A `Channel` accepts only datum keys whose declared values are compatible with
the channel, or an accessor that derives a value from the row, index, and full
readonly data array. A `VisualChannel` replaces the field-name form with a
constant: it accepts either one constant value or an accessor.

```ts
import { lineY } from '@tanstack/charts'

interface Row {
  date: Date
  value: number
  label: string
}

lineY(rows, {
  x: 'date', // Date
  y: 'value', // number
  stroke: (_row, index) => (index === 0 ? '#2563eb' : '#60a5fa'),
})
```

`ChannelField`, `ChannelOutput`, `OptionChannelOutput`,
`WidenChartValue`, and `ChartAxisValue` are exported for extension authors.
Literal chart values widen to their semantic primitive so a literal row does
not produce an unusably narrow scale or callback type.

## Inference path

```text
source datum
  → mark channel outputs
  → ChartMark point and scale value types
  → ChartSpec / definition datum and x/y unions
  → axis scale and formatter types
  → host and adapter callback types
```

Marks in one chart may have different datum types. The definition exposes their
union. TypeScript narrowing is therefore required when a callback handles
heterogeneous layers.

Rect and custom interval marks can distinguish materialized scale values from
interaction point values. The exported extractors are:

`ChartMarkDatum`, `ChartSpecDatum`, `ChartSpecXValue`, and `ChartSpecYValue`
are available from the root entry point. The four `ChartMarkPoint*` and
`ChartMarkScale*` extractors below come from the exceptional
`@tanstack/charts/mark/scale-values` subpath.

| Type                     | Extracts                                                                                       |
| ------------------------ | ---------------------------------------------------------------------------------------------- |
| `ChartMarkDatum<TMark>`  | Original datum                                                                                 |
| `ChartMarkPointX<TMark>` | Interaction x value; exported from `@tanstack/charts/mark/scale-values`                        |
| `ChartMarkPointY<TMark>` | Interaction y value; exported from `@tanstack/charts/mark/scale-values`                        |
| `ChartMarkScaleX<TMark>` | All x values materialized for scale typing; exported from `@tanstack/charts/mark/scale-values` |
| `ChartMarkScaleY<TMark>` | All y values materialized for scale typing; exported from `@tanstack/charts/mark/scale-values` |
| `ChartSpecDatum<TSpec>`  | Datum union across marks                                                                       |
| `ChartSpecXValue<TSpec>` | Interaction x union across marks                                                               |
| `ChartSpecYValue<TSpec>` | Interaction y union across marks                                                               |

`ChartMarkX` and `ChartMarkY` remain exported as deprecated aliases of the
point extractors. New code should use the explicit names.

## Definitions

| Type                     | Purpose                                                                       |
| ------------------------ | ----------------------------------------------------------------------------- |
| `ChartSpec`              | Complete marks, axes, guide, color, resource, margin, and theme spec          |
| `StaticChartDefinition`  | A directly compilable spec with inferred datum and semantic x/y phantom types |
| `DynamicChartDefinition` | Responsive chart builder                                                      |
| `ChartDefinition`        | Static or dynamic union                                                       |
| `ChartBuildContext`      | Current size and build-time theme                                             |

The complete overloads and runtime rules are in
[Chart Definition API](./chart-definitions.md).

## Marks and scenes

| Type                    | Purpose                                                             |
| ----------------------- | ------------------------------------------------------------------- |
| `ChartMark`             | Public initialized-mark factory plus inferred point and scale types |
| `MarkInitializeContext` | Mark layer index                                                    |
| `InitializedMark`       | Stable ID, materialized channels, and render function               |
| `MaterializedChannel`   | Values contributed to an optional named scale                       |
| `MarkRenderContext`     | Final chart bounds, scales, theme, color resolver, and layout       |
| `MarkScene`             | Mark-owned scene nodes and optional interaction points              |
| `ChartScene`            | Complete renderer-neutral output                                    |
| `ChartPoint`            | Typed interaction target                                            |
| `ChartTick`             | Semantic value, formatted label, and pixel position                 |
| `ResolvedScale`         | Final positional scale                                              |
| `ResolvedColorScale`    | Final color scale                                                   |

Scene geometry and interaction point fields are documented in
[Runtime and scene](./runtime-and-scene.md).

## Scene-node types

`SceneNode` is the union of:

- `SceneGroup`
- `SceneRule`
- `ScenePolyline`
- `SceneArea`
- `SceneDot`
- `SceneRect`
- `SceneLabel`

`SceneStyle` is shared presentation. `ChartSize`, `ChartBounds`, `ChartMargin`,
`ChartLayoutOptions`, `ChartTextMeasurer`, `ChartTextMeasureOptions`, and
`ChartTextMetrics` describe scene and text geometry.

See [Scene nodes](./runtime-and-scene.md#scene-nodes).

## Scale, guide, color, and theme types

| Type                       | Purpose                                                  |
| -------------------------- | -------------------------------------------------------- |
| `ChartAxisOptions`         | Required positional scale and optional guide behavior    |
| `ChartAxisGuideOptions`    | Guide behavior without the scale field                   |
| `ConfiguredScaleLike`      | Callable, copyable positional scale contract             |
| `ChartScale`               | Custom positional scale extension                        |
| `ChartScaleResolveContext` | Values, responsive range, guide options, and hints       |
| `ChartScaleResolver`       | Function form of custom scale resolution                 |
| `ChartColorOptions`        | Configured/custom color scale, domain, range, and legend |
| `ConfiguredColorScaleLike` | Callable and copyable color scale contract               |
| `ChartColorScale`          | Custom color scale extension                             |
| `ChartColorScaleContext`   | Observed values, hints, and theme                        |
| `ChartColorLegend`         | Legend layout and scene rendering                        |
| `ChartColorLegendContext`  | Resolved colors, chart bounds, theme, and width          |
| `ChartTheme`               | Foreground, muted, grid, background, and palette         |
| `ChartLinearGradient`      | Named linear-gradient resource                           |
| `ChartGradientStop`        | Gradient offset, color, and optional opacity             |
| `ChartCurve`               | Line and y-area path generation                          |

See [Scales, guides, and color](./scales-guides-and-color.md).

## Host and runtime types

| Type                             | Purpose                                                           |
| -------------------------------- | ----------------------------------------------------------------- |
| `ChartHostCommonOptions`         | Accessibility, sizing, callbacks, and SVG renderer options        |
| `ChartHostOptions`               | Common options plus a chart definition                            |
| `ChartHost`                      | SVG host `update`, `getScene`, and `destroy`                      |
| `ChartRendererHostCommonOptions` | Renderer-neutral common options plus required renderer            |
| `ChartRendererHostOptions`       | Renderer-neutral options plus a chart definition                  |
| `ChartRendererHost`              | Renderer-neutral `update`, `getScene`, and `destroy`              |
| `ChartRuntime`                   | Repeated static or responsive scene rendering                     |
| `ChartRenderContext`             | Container, live SVG, and scene reported after DOM render          |
| `ChartRendererRenderContext`     | Container, live renderer surface, and scene reported after render |

See [DOM host](./dom-host.md) and
[Runtime and scene](./runtime-and-scene.md).

## Focus and tooltip types

| Type                         | Purpose                                                  |
| ---------------------------- | -------------------------------------------------------- |
| `ChartFocusStrategy`         | Pointer resolution, grouping, and keyboard ordering      |
| `ChartFocusPreset`           | Built-in nearest and grouped axis focus names            |
| `ChartFocusMode`             | Focus preset or custom strategy                          |
| `ChartSpatialIndex`          | Nearest-point query                                      |
| `ChartSpatialIndexFactory`   | Builds an index from current scene points                |
| `ChartTooltipOptions`        | Native tooltip content, ordering, anchoring, and pinning |
| `ChartTooltipItem`           | Ordered channel, datum-field, or derived point row       |
| `ChartTooltipItemBase`       | Shared label and point-text contract for object items    |
| `ChartTooltipChannelItem`    | Configured x, y, or group row                            |
| `ChartTooltipDatumItem`      | Scalar datum-field row                                   |
| `ChartTooltipDerivedItem`    | Row derived from the complete focused point              |
| `ChartTooltipSort`           | Group row ordering                                       |
| `ChartTooltipAnchor`         | Point, pointer, group-center, or custom scene anchor     |
| `ChartTooltipAnchorContext`  | Pointer position, chart bounds, and surface size         |
| `ChartTooltipPlacement`      | Tooltip box placement around its anchor                  |
| `ChartTooltipPosition`       | Scene-pixel x/y coordinate                               |
| `ChartDefinitionOptions`     | Focus, tooltip, animation, keyboard, and spatial policy  |
| `DynamicChartConfig`         | Responsive builder plus definition-owned behavior        |
| `ChartTooltipContent`        | Safe title and row model for a native tooltip            |
| `ChartTooltipRow`            | Label, formatted value, and optional color swatch        |
| `ChartTooltipContentContext` | Axis labels and value formatters for content callbacks   |

See [Focus and interaction](./focus-and-interaction.md).

## Rendering types

| Type                        | Purpose                                                                        |
| --------------------------- | ------------------------------------------------------------------------------ |
| `RenderChartOptions`        | Renderer-neutral accessible name, description, class, tab index, and ID prefix |
| `RenderChartSvgOptions`     | SVG specialization of `RenderChartOptions`                                     |
| `ChartSurfaceRenderOptions` | Render options plus optional animation                                         |
| `ChartSurface`              | Mounted element, painting, coordinates, focus, and cleanup                     |
| `ChartRenderer`             | Server shell and browser-surface renderer contract                             |
| `ChartSvgRenderer`          | Scene-to-SVG string function                                                   |
| `ChartAnimationOptions`     | Duration, easing, and reduced-motion policy                                    |

See [Rendering and export](./rendering-and-export.md).

## Capability-specific types

Types tied to optional capabilities are documented with the API that owns
their behavior:

- `@tanstack/charts/adapter`: `ChartAdapter`, `ChartAdapterLayout`, and
  `ChartAdapterLayoutOptions`. See
  [Adapter controller](./adapter-controller.md).
- `@tanstack/charts/canvas`: `CanvasChartRendererOptions`,
  `CanvasChartRenderer`, `CanvasChartSurface`, `CanvasChartHostOptions`, and
  `CanvasChartHost`. See
  [Canvas renderer](./rendering-and-export.md#canvas-renderer).
- `@tanstack/charts/export`: `SerializeChartSvgOptions` and
  `RenderChartPngOptions`. See [SVG
  serialization](./rendering-and-export.md#svg-serialization) and [browser
  image export](./rendering-and-export.md#browser-image-export).
- `@tanstack/charts/geo`: `GeoProjectionContext` and `GeoShapeOptions`. See
  [Geo shape](./marks/geo.md).
- `@tanstack/charts/polar`: `PolarOptions`, `PolarMark`, `PolarGuide`,
  `PolarGuideScene`, `PolarAngleOptions`, `PolarRadiusOptions`,
  `PolarResolvedScale`, `PolarLayoutContext`, `PolarLength`,
  `PolarGuideLabelContext`, `PolarGuideLabelOption`, `RadialArcOptions`,
  `RadialLineOptions`, `RadialAreaOptions`, `RadialDotOptions`,
  `RadialTextOptions`, `RadialRuleOptions`, `RadialGridOptions`, and
  `AngleGridOptions`. See [Polar marks](./marks/polar.md).

## Mark option types

Every built-in mark exports its options type from the root and its granular
subpath:

- `LineYOptions`, `AreaYOptions`, `AreaXOptions`, `AreaXCurve`
- `BarYOptions`, `BarXOptions`
- `DotOptions`, `HexagonOptions`
- `RectOptions`, `CellOptions`
- `RuleXOptions`, `RuleYOptions`
- `LinkOptions`, `ArrowOptions`, `VectorOptions`, `VectorAnchor`
- `TickXOptions`, `TickYOptions`
- `TextOptions`, `TextAnchor`
- `FrameOptions`
- `FacetOptions`, `FacetAxes`
- `ColorLegendOptions`, `ColorGradientLegendOptions`

Their public fields and defaults are owned by the
[mark reference](./index.md#mark-reference) and
[legend reference](./scales-guides-and-color.md#categorical-legend).

## Correcting a type error

When a normal chart requires `as`, first check:

1. Is the row interface accurate, including nullable values?
2. Is the selected field compatible with the mark channel?
3. Does the configured scale domain accept the inferred semantic value?
4. Does the definition capture values with their exact application types?
5. Are mixed mark datum or value unions being narrowed honestly?
6. Is a custom mark declaring its datum and point values at `createMark`?

Use an assertion only at a genuinely unchecked external boundary. Do not cast
the definition or framework props to bypass a mismatch.
