---
title: Types
description: Public TypeScript types, inference rules, channels, definitions, scenes, hosts, focus, rendering, and custom extension contracts.
---

TanStack Charts is inference-first. A mark's source data and channel selectors
flow through its definition into scales, axis formatters, host and adapter
callbacks, focus callbacks, and selection callbacks. Normal application code
should not cast chart definitions or supply adapter generics.

Browser applications can import types from the package root. Platform-neutral
libraries can import the same definition, mark, scene, runtime, focus, and
tooltip-model contracts from `@tanstack/charts/types`; DOM host and renderer
types remain available from the root.

## Callback shape

Public callbacks take at most two arguments: primary data or purpose first,
then a named context or options object. A callback without a distinct primary
payload takes one context object. Standard comparators, exact upstream
protocols, paired geometry, and consumer-called service methods are explicit
exceptions.

## Values and channels

```ts
type ChartValue = number | string | Date
type ChartKey = string | number

interface ChannelAccessorContext<TDatum> {
  index: number
  data: readonly TDatum[]
}

type ChannelAccessor<TDatum, TValue> = (
  datum: TDatum,
  context: ChannelAccessorContext<TDatum>,
) => TValue

type Channel<TDatum, TValue> =
  ChannelField<TDatum, TValue> | ChannelAccessor<TDatum, TValue>

type VisualChannel<TDatum, TValue> = TValue | ChannelAccessor<TDatum, TValue>
```

The corresponding public type names are `Channel`, `ChannelAccessor`,
`ChannelAccessorContext`, and `VisualChannel`.

A `Channel` accepts only datum keys whose declared values are compatible with
the channel, or an accessor that derives a value from the row. Its context
contains the index and full readonly data array. A `VisualChannel` replaces
the field-name form with a constant: it accepts either one constant value or
an accessor.

```ts
import { lineY } from '@tanstack/charts'

interface Row {
  date: Date
  value: number
  label: string
  series: 'actual' | 'forecast'
}

lineY(rows, {
  x: 'date', // Date
  y: 'value', // number
  z: 'series',
  stroke: (row) => (row.series === 'actual' ? '#2563eb' : '#60a5fa'),
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
  → ChartSpec scale registry and definition datum/x/y unions
  → scale and formatter types
  → host and adapter callback types
```

Marks in one chart may have different datum types. The definition exposes their
union. TypeScript narrowing is therefore required when a callback handles
heterogeneous layers.

`ChartMarkScaleX` and `ChartMarkScaleY` control the value types accepted by the
reserved scale entries. Canonical definitions always include `scales.x` and
`scales.y`; use `null` when a dimension is unused. A mark bound to another
scale ID does not widen the reserved entry's value type.

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

Stateful mark presentation uses `ChartMarkStateContext` as one object bag for
the datum, index, data, point, focus, pointer, and matching helper. A
`ChartMarkStateSelector` handles the common declarative cases, while callbacks
can return any `ChartMarkStateValue`. `ChartMarkStateStyle` is the complete
style vocabulary; `ChartDotStateStyle`, `ChartBarStateStyle`,
`ChartRectStateStyle`, `ChartLineStateStyle`, `ChartAreaStateStyle`, and
`ChartTextStateStyle` narrow it to properties each mark can render.

## Definitions

| Type                                  | Purpose                                                                       |
| ------------------------------------- | ----------------------------------------------------------------------------- |
| `ChartSpec`                           | Marks plus a positional scale registry, guides, color, resources, and layout  |
| `StaticChartDefinition`               | A directly compilable spec with inferred datum and semantic x/y phantom types |
| `ResponsiveChartDefinition`           | Responsive chart builder                                                      |
| `ChartDefinition`                     | Static or responsive union                                                    |
| `ChartDefinitionForTooltipHost`       | Definition restricted to one tooltip host brand                               |
| `DomChartDefinition`                  | Definition compatible with the DOM tooltip host                               |
| `ComposableStaticChartDefinition`     | Static definition safe to embed in a composed view                            |
| `ComposableResponsiveChartDefinition` | Responsive definition safe to embed in a composed view                        |
| `ComposableChartDefinition`           | Static or responsive composable definition                                    |
| `ChartBuildContext`                   | Current size and platform-default build-time theme                            |

The complete overloads and runtime rules are in
[Chart Definition API](./chart-definitions.md).

## Marks and scenes

| Type                               | Purpose                                                                              |
| ---------------------------------- | ------------------------------------------------------------------------------------ |
| `ChartMark`                        | Public initialized-mark factory plus inferred point, scale value, and scale ID types |
| `ChartMarkOptions`                 | Shared optional mark renderer contract                                               |
| `ChartMarkRenderer`                | Universal renderer-selection token stored on mark-owned scene nodes                  |
| `CartesianChartMark`               | Cartesian mark alias that derives selected x and y scale IDs from its options        |
| `OptionScaleId`                    | Resolves an optional named-scale selector to its fallback scale ID                   |
| `MarkInitializeContext`            | Mark layer index                                                                     |
| `InitializedMark`                  | Stable ID, channels, viewport ownership, render, and optional resolved layout        |
| `MarkInitialization`               | Direct-render or resolved-layout initializer result                                  |
| `ResolvedLayoutMarkInitialization` | Layout initializer before `createMark` normalization                                 |
| `MaterializedChannel`              | Values contributed to an optional named scale                                        |
| `MarkRenderContext`                | Final chart bounds, scales, theme, color resolver, and layout                        |
| `MarkResolvedLayoutContext`        | Final positional scales and bounds for pure mark-local layout                        |
| `ResolvedMarkLayout`               | Final channels, labels, states, and render closure from resolved layout              |
| `MarkScene`                        | Mark-owned nodes plus optional interaction points, focus anchors, and guides         |
| `MarkFocusGuide`                   | Mark-emitted focus guide with optional placement                                     |
| `ChartScene`                       | Complete renderer-neutral output                                                     |
| `ChartPoint`                       | Typed interaction target                                                             |
| `ChartFocusAnchor`                 | Focus-filter identity that does not participate in hit testing                       |
| `SceneFocusGuide`                  | Data-less guide descriptor resolved against focus or cursor state                    |
| `SceneFocusGuideAxis`              | One crosshair axis rule or categorical band, plus an optional label                  |
| `SceneFocusGuideBand`              | Resolved categorical bandwidth, inset, radius, and paint                             |
| `SceneFocusGuideLabel`             | Focus-guide label formatter, spacing, font, and paint                                |
| `SceneFocusGuideMarker`            | Focus-guide intersection marker geometry and paint                                   |
| `SceneFocusGuideResolveContext`    | Scene, guide, local focus, pointer, and cursor passed to a guide resolver            |
| `SceneFocusGuideResolver`          | Optional-guide policy that returns one transient scene node                          |
| `ChartFocusPresentation`           | Transient renderer-neutral underlay and overlay nodes                                |
| `SceneInteraction`                 | Semantic point or points attached to a rendered scene primitive                      |
| `ChartTick`                        | Semantic value, formatted label, and pixel position                                  |
| `ResolvedScale`                    | Final positional scale                                                               |
| `ResolvedColorScale`               | Final color scale                                                                    |

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

`ScenePolygonRing` is one closed boundary. `ScenePolygon` is an exterior ring
followed by zero or more holes; `SceneArea.polygons` can contain several
disconnected polygons. `SceneStyle` is shared presentation. `ChartSize`,
`ChartBounds`, `ChartMargin`, `ChartLayoutOptions`, `ChartTextTypography`,
`ChartTextMeasurer`, `ChartTextMeasureOptions`, and `ChartTextMetrics` describe
scene and text geometry. Typography includes family, style, stretch, letter
spacing, direction, locale, and host font scale.

See [Scene nodes](./runtime-and-scene.md#scene-nodes).

## Scale, guide, color, and theme types

| Type                            | Purpose                                                               |
| ------------------------------- | --------------------------------------------------------------------- |
| `ChartScales`                   | Reserved x/y entries plus optional named positional scales            |
| `ChartPositionScaleOptions`     | One registry entry, its Cartesian channel, side, and axis behavior    |
| `ChartAxisOptions`              | Positional scale and optional axis behavior                           |
| `ChartPositionChannel`          | Cartesian registry channel, `x` or `y`                                |
| `ChartAxisSide`                 | Cartesian axis side                                                   |
| `CartesianScaleBindings`        | Optional mark bindings to named `xScale` and `yScale` entries         |
| `ChartAxisViewportOptions`      | Continuous semantic window and transient pixel translation            |
| `ChartAxisGuideOptions`         | Guide behavior without the scale field                                |
| `ChartAxisPresentationOptions`  | Axis line, ticks, tick labels, and title presentation                 |
| `ChartAxisTickOptions`          | Candidate values, density, formatting, size, and padding              |
| `ChartAxisTickLabelOptions`     | Per-candidate typography, anchor, offset, rotation, and thinning      |
| `ChartAxisTickLabelContext`     | Semantic value, stable candidate index, pixel position, and bandwidth |
| `ChartAxisTickLabelValue`       | Constant or context accessor for one tick-label property              |
| `ChartAxisTickLabelThinOptions` | Minimum gap, end priority, and labels that must be kept               |
| `ChartAxisLabelOptions`         | Axis title text and explicit or measured offset                       |
| `ChartScaleFactory`             | Creates a positional scale with a mark-inferred domain                |
| `ChartScaleInput`               | Factory or configured positional scale instance                       |
| `InferableScaleLike`            | Domain-configurable scale returned by a factory                       |
| `ConfiguredScaleLike`           | Callable, copyable positional scale contract                          |
| `ChartNumericScale`             | Radius mapper, configured instance, or inferred factory spec          |
| `ChartNumericScaleOptions`      | Inferred or configured radius scale with optional nicening            |
| `ChartScale`                    | Custom positional scale extension                                     |
| `ChartScaleResolveContext`      | Values, responsive range, guide options, and hints                    |
| `ChartScaleResolver`            | Function form of custom scale resolution                              |
| `ChartContinuousValue`          | Numeric or Date value accepted by an axis viewport                    |
| `ChartContinuousDomain`         | Homogeneous numeric or Date viewport endpoint tuple                   |
| `ResolvedScaleViewport`         | Content domain, committed window, and presented mapper                |
| `ChartColorOptions`             | Factory, configured/custom color scale, hints, and legend             |
| `ChartColorScaleFactory`        | Creates a color scale with a channel-inferred domain                  |
| `ConfiguredColorScaleLike`      | Callable and copyable color scale contract                            |
| `InferableColorScaleLike`       | Domain-configurable color scale returned by a factory                 |
| `ChartColorScale`               | Custom color scale extension                                          |
| `ChartColorScaleContext`        | Observed values, hints, and theme                                     |
| `ResolvedColorScale`            | Resolved mapping and optional stepped legend boundaries               |
| `ResolvedColorScaleKind`        | Categorical, continuous, quantile, quantize, or threshold             |
| `ChartColorLegend`              | Legend layout and scene rendering                                     |
| `ChartColorLegendContext`       | Resolved colors, chart bounds, theme, layout, and viewport size       |
| `CrosshairOptions`              | Data-less x/y guides, marker, style, and motion options               |
| `CrosshairRuleOptions`          | Stroke shared by both crosshair axes or overridden per axis           |
| `CrosshairAxisOptions`          | Per-axis rule or categorical band with an optional label              |
| `CrosshairBandOptions`          | Categorical cursor-band inset, radius, fill, stroke, and opacity      |
| `CrosshairLabelOptions`         | Guide label formatting, spacing, text, and halo paint                 |
| `CrosshairMarkerOptions`        | Primary-coordinate marker geometry and paint                          |
| `ChartTheme`                    | Foreground, muted, grid, background, and palette                      |
| `ChartLinearGradient`           | Named linear-gradient resource                                        |
| `ChartGradientStop`             | Gradient offset, color, and optional opacity                          |
| `ChartCurve`                    | Line and y-area path generation                                       |

See [Scales, guides, and color](./scales-guides-and-color.md).

`crosshair<TXValue, TYValue>` carries the semantic axis types into each
`CrosshairLabelOptions<TValue>.format` callback. `CrosshairBandOptions` replaces
one axis rule with plot-spanning geometry derived from the resolved categorical
scale bandwidth; zero-bandwidth axes emit no band.

## Host and runtime types

| Type                             | Purpose                                                                          |
| -------------------------------- | -------------------------------------------------------------------------------- |
| `ChartHostCommonOptions`         | Accessibility, sizing, callbacks, and SVG renderer options                       |
| `ChartHostOptions`               | Common options plus a chart definition                                           |
| `ChartHost`                      | SVG host `interaction`, `update`, `getScene`, and `destroy`                      |
| `ChartRendererHostCommonOptions` | Renderer-neutral common options plus required renderer                           |
| `ChartRendererHostOptions`       | Renderer-neutral options plus a chart definition                                 |
| `ChartRendererHost`              | Renderer-neutral `interaction`, `update`, `getScene`, and `destroy`              |
| `ChartRuntime`                   | Repeated static or responsive scene rendering                                    |
| `ChartRuntimeOptions`            | Platform theme shared by responsive building and scene compilation               |
| `ChartRenderContext`             | Container, live default SVG, complete surface, scene, and interaction controller |
| `ChartRendererRenderContext`     | Container, live surface, scene, and interaction controller                       |

See [DOM host](./dom-host.md) and
[Runtime and scene](./runtime-and-scene.md).

## Focus and tooltip types

| Type                                  | Purpose                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------ |
| `ChartFocusStrategy`                  | Pointer resolution, grouping, and keyboard ordering                      |
| `ChartFocusResolveContext`            | Pointer coordinates and maximum focus distance                           |
| `ChartFocusGroupContext`              | Point being grouped or restored                                          |
| `ChartFocusPreset`                    | Built-in nearest and grouped axis focus names                            |
| `ChartFocusMode`                      | Focus preset or custom strategy                                          |
| `ChartFocusState`                     | Primary, group, source, and pinned interaction state                     |
| `ChartFocusSource`                    | Pointer, keyboard, programmatic, or restored source                      |
| `ChartFocusFilter`                    | Focus-filtered mark matching configuration                               |
| `ChartFocusMatch`                     | Primary, group, key, x, y, or series matching                            |
| `ChartFocusAffinity`                  | Primitive fallback axis after exact geometry containment                 |
| `ResolvedFocusScene`                  | Scene plus whether retargetable focus geometry was materialized          |
| `ChartInteractionController`          | Resolves client pointers and paints application-owned focus              |
| `ChartPointerResolution`              | Scene position, primary point, and resolved focus group                  |
| `ChartControlledFocusOptions`         | Source and sticky-tooltip state for controlled focus                     |
| `ChartCursorController`               | Observable application-owned cursor state                                |
| `ChartCursorState`                    | Scene-, normalized-, or semantic-value-anchored cursor                   |
| `ChartCursorStateUpdater`             | Cursor state, null, or a previous-state updater function                 |
| `ChartCursorCoordinates`              | One or both coordinates in one coordinate space                          |
| `ChartCursorValues`                   | One or both semantic axis values                                         |
| `ChartCursorPointIdentity`            | Host-local key, mark, and datum-index cursor tie-breaker                 |
| `ChartCursorExtensionToken`           | Environment-neutral contract implemented by cursor host extensions       |
| `ChartCursorBinding`                  | Focus-snapped or free definition binding                                 |
| `ChartFocusCursorBinding`             | Semantic datum-focus cursor options                                      |
| `ChartFreeCursorBinding`              | Free coordinate cursor with resolved inversion and axis overrides        |
| `ChartCursorAxisContext`              | Scene, position, normalized position, and axis given to `valueAt`        |
| `ChartCursorAxisOptions`              | Optional free-cursor `valueAt` override for one axis                     |
| `ChartCursorAxisPresentation`         | Host-local position, normalized position, and optional semantic value    |
| `ChartCursorPresentation`             | Host-local projection of shared cursor state into one chart              |
| `ChartCursorHostExtension`            | Platform-neutral cursor lifecycle and projection implementation          |
| `ChartCursorHostSession`              | One binding's ownership-safe host cursor session                         |
| `ChartSpatialIndex`                   | Nearest-point query                                                      |
| `ChartSpatialIndexFactory`            | Builds an index from current scene points and resolved scene             |
| `ChartSpatialIndexFactoryContext`     | Resolved scene supplied to an index factory                              |
| `ChartSelectionSource`                | Pointer or keyboard origin for a controlled selection change             |
| `ChartSelectionController`            | Definition-owned point activation and clear contract                     |
| `ChartControl`                        | Final-scale interaction behavior placed on a definition                  |
| `ChartControlContext`                 | Final plot, scales, colors, theme, and surface size                      |
| `ChartControlScene`                   | Renderer-neutral fallback nodes and optional host controls               |
| `ChartExtensionInput`                 | Generic bare-token or `{ use, ...options }` extension input              |
| `ChartTooltipInput`                   | Tooltip extension token or configured extension options                  |
| `ChartTooltipExtensionToken`          | Environment-neutral contract implemented by host tooltip extensions      |
| `ChartTooltipExtension`               | Tooltip lifecycle implementation                                         |
| `ChartTooltipExtensionContext`        | Container, dismissal, and adapter-body bridge given to a tooltip         |
| `ChartTooltipExtensionInstance`       | Tooltip update, paint, hide, containment, and destroy lifecycle          |
| `ChartTooltipPaintContext`            | Focus, points, scene, surface, pointer, and pinned state                 |
| `ChartTooltipOptions`                 | Built-in tooltip content, ordering, anchoring, visibility, and pinning   |
| `ChartTooltipPortalInput`             | Portal extension token or configured transport options                   |
| `ChartTooltipPortalExtensionToken`    | Environment-neutral contract implemented by host portal extensions       |
| `ChartTooltipPortalExtension`         | Tooltip transport lifecycle implementation                               |
| `ChartTooltipPortalExtensionContext`  | Container, tooltip element, and reposition callback given to a portal    |
| `ChartTooltipPortalExtensionInstance` | Portal update, position, hide, and destroy lifecycle                     |
| `ChartTooltipPortalOptions`           | Reserved configuration object for portal extensions                      |
| `ChartTooltipPortalPositionContext`   | Scene, surface, anchor, placement, and offset for viewport positioning   |
| `ChartTooltipItem`                    | Ordered channel, datum-field, or derived point row                       |
| `ChartTooltipItemBase`                | Shared label and point-text contract for object items                    |
| `ChartTooltipChannelItem`             | Configured x, y, or group row                                            |
| `ChartTooltipDatumItem`               | Scalar datum-field row                                                   |
| `ChartTooltipDerivedItem`             | Row derived from the complete focused point                              |
| `ChartTooltipSort`                    | Group row ordering                                                       |
| `ChartTooltipAnchor`                  | Preset, independent axis coordinates, or custom scene anchor             |
| `ChartTooltipAxisAnchor`              | Independent x and y anchor sources                                       |
| `ChartTooltipXAnchor`                 | Point, pointer, value, group, or plot x source                           |
| `ChartTooltipYAnchor`                 | Point, pointer, value, group, or plot y source                           |
| `ChartTooltipAnchorContext`           | Focus, pointer, plot, surface, and resolved scales                       |
| `ChartTooltipPlacement`               | Tooltip box placement around its anchor                                  |
| `ChartTooltipPosition`                | Scene-pixel x/y coordinate                                               |
| `ChartDefinitionOptions`              | Focus, selection, controls, cursor, tooltip, and host interaction policy |
| `ResponsiveChartConfig`               | Responsive builder plus definition-owned interaction policy              |
| `ChartTooltipContent`                 | Safe title and row model for a built-in tooltip                          |
| `ChartTooltipRow`                     | Label, formatted value, and optional color swatch                        |
| `ChartTooltipContentContext`          | Pinned state, axis labels, and value formatters for tooltip callbacks    |
| `ChartTooltipBodyContext`             | Focused points, content, pinned state, and dismissal                     |
| `ChartTooltipBodyTarget`              | Renderer-adapter body mount element plus body context                    |
| `TooltipBounds`                       | Host-local tooltip placement boundary                                    |
| `TooltipSize`                         | Measured host-local tooltip dimensions                                   |

Host adapters share `sameChartPointIdentity`, `restoreChartFocusPoint`,
`resolveMarkStateScene`, `orderChartTooltipPoints`,
`createChartTooltipContent`, `resolveChartTooltipAnchor`,
`resolveChartTooltipPlacement`, and `formatChartTooltipValue` instead of
reimplementing focus restoration or tooltip policy.

`ChartCursorState.origin` optionally carries a `ChartCursorPointIdentity` when
a focus host publishes one of several points with equal semantic values. A
consumer matches its stable key and mark first, then uses the datum index only
to disambiguate duplicate keys. If that key and mark do not exist locally, the
consumer resolves from the portable semantic `value` and preferred `group` as
usual.

See [Focus and interaction](./focus-and-interaction.md).

## Rendering types

| Type                                   | Purpose                                                                        |
| -------------------------------------- | ------------------------------------------------------------------------------ |
| `RenderChartOptions`                   | Renderer-neutral accessible name, description, class, tab index, and ID prefix |
| `RenderChartSvgOptions`                | SVG specialization of `RenderChartOptions`                                     |
| `ChartSurfaceRenderOptions`            | Render options plus optional animation                                         |
| `ChartSurface`                         | Mounted root, optional child layers, painting, coordinates, focus, and cleanup |
| `ChartRenderer`                        | Server shell and browser-surface renderer contract                             |
| `ChartLayerRenderer`                   | DOM renderer that can compose itself with the host renderer                    |
| `UniversalChartLayerRenderer`          | Definition-agnostic form of `ChartLayerRenderer`                               |
| `ChartRendererCapabilities`            | Optional structural services supplied by a renderer                            |
| `ChartRendererTooltipMotionCapability` | Versioned factory for an injected tooltip motion controller                    |
| `ChartTooltipMotionController`         | Tooltip paint, hide, and cleanup motion lifecycle                              |
| `ChartTooltipMotionSnapshot`           | Tooltip position, velocity, and presence state before repaint                  |
| `ChartSvgRenderer`                     | Scene-to-SVG string function                                                   |
| `ChartAnimationOptions`                | Duration, easing, and reduced-motion policy                                    |

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
- `@tanstack/charts/cursor`: `ChartCursorController`, cursor state and
  coordinate types, `createChartCursor`, and `cursorHost`. See
  [Controlled cursors](./focus-and-interaction.md#controlled-cursors).
- `@tanstack/charts/cursor/host`: `ChartCursorHostExtension`,
  `ChartCursorHostSession`, and the platform-neutral cursor lifecycle,
  projection, focus, and presentation helpers. See
  [Controlled cursors](./focus-and-interaction.md#controlled-cursors).
- `@tanstack/charts/export`: `SerializeChartSvgOptions` and
  `RenderChartImageOptions`. See [SVG
  serialization](./rendering-and-export.md#svg-serialization) and [browser
  image export](./rendering-and-export.md#browser-image-export).
- `@tanstack/charts/geo`: `GeoProjectionContext`, `GeoProjectionDescriptor`,
  `GeoProjectionInput`, and `GeoShapeOptions`. See
  [Geo shape](./marks/geo.md).
- `@tanstack/charts/hierarchy/sunburst`: `SunburstNode`,
  `SunburstNodeComparator`, `SunburstPathOptions`, `SunburstParentOptions`, and
  `SunburstOptions`. See [Sunburst](./marks/sunburst.md).
- `@tanstack/charts/hierarchy/treemap`: `TreemapMethod`, `TreemapTileDatum`,
  `TreemapTile`, `TreemapNode`, `TreemapNodeComparator`,
  `TreemapPathOptions`, `TreemapParentOptions`, and `TreemapOptions`. See
  [Treemap](./marks/treemap.md).
- `@tanstack/charts/network/force`: built-in descriptor types,
  `ForceFactoryDescriptor`, `ForceFactory`, `ForceFactoryContext`, working
  clone types, settled node/link result types, and lineage types. See
  [Static force layouts](./transforms.md#static-force-layouts).
- `@tanstack/charts/network/sankey`: `SankeyAlignment`,
  `SankeyAlignmentNode`, `SankeyNodeAligner`, `SankeyInset`,
  `SankeyLayoutValue`, `SankeyEndpointContext`, `SankeyNodeContext`,
  `SankeyLinkContext`, `SankeyNode`, `SankeyLink`, `SankeyDiagramContext`,
  `SankeyNodeComparator`, `SankeyLinkComparator`, and `SankeyDiagramOptions`.
  See [Sankey diagram](./marks/sankey.md).
- `@tanstack/charts/selection`: `KeyedSelectionChange`,
  `KeyedSelectionKeyContext`, `KeyedSelectionOptions`, and `KeyedSelection`. See
  [Controlled keyed selection](./focus-and-interaction.md#controlled-keyed-selection).
- `@tanstack/charts/focus/guide`: `FocusGuideLabelFormatContext` and focus-guide
  option types. See [Focus guide](./marks/focus-guide.md).
- `@tanstack/charts/interaction/signal`: `ControlledSignal` and
  `ControlledSignalChangeContext`. See
  [Controlled signals](../guides/interactions-and-selections.md#controlled-signals).
- `@tanstack/charts/legend`: `InteractiveColorLegendItemContext` and legend
  option/change types. See
  [Interactive categorical legend](./scales-guides-and-color.md#interactive-categorical-legend).
- `@tanstack/charts/interaction/brush`: `BrushRange`, `BrushXChange`,
  `BrushXSource`, `BrushXTarget`, `BrushXValuesOptions`, and
  `BrushXContinuousOptions`. See
  [Horizontal brush](./focus-and-interaction.md#horizontal-brush).
- `@tanstack/charts/interaction/cursor`: `ContinuousCursorValue`,
  `ContinuousCursorPosition`, `ContinuousCursorPointerSource`,
  `ContinuousCursorSource`, `ContinuousCursorChange`,
  `ContinuousCursorRuleOptions`, `ContinuousCursorMarkerOptions`,
  `ContinuousCursorLabelOptions`, and `ContinuousCursorOptions`. See
  [Continuous cursor](./focus-and-interaction.md#continuous-cursor).
- `@tanstack/charts/interaction/zoom`: `ZoomXValue`, `ZoomXWindow`,
  `ZoomXSource`, `ZoomXAction`, `ZoomXChange`, and `ZoomXOptions`. See
  [Horizontal zoom](./focus-and-interaction.md#horizontal-zoom).
- `@tanstack/charts/polar`: `PolarOptions`, `PolarScales`, `PolarMark`,
  `PolarGuide`, `PolarGuideScene`, `PolarAngleOptions`,
  `PolarRadiusOptions`, `PolarPositionChannel`, `PolarPositionScaleOptions`,
  `PolarResolvedScale`, `PolarLayoutContext`, `PolarLength`,
  `PolarGuideLabelContext`, `PolarGuideLabelOption`, `RadialArcOptions`,
  `RadialBarRadiusOptions`, `RadialBarAngleOptions`, `RadialLineOptions`,
  `RadialAreaOptions`, `RadialDotOptions`, `RadialTextOptions`,
  `RadialRuleOptions`, `RadialGridOptions`, and `AngleGridOptions`. See
  [Polar marks](./marks/polar.md).

## Mark option types

Every built-in mark exports its options type from the root and its granular
subpath. Cartesian, radial, and composite option types include the shared
`ChartMarkOptions.renderer` selection:

- `LineYOptions`, `AreaYOptions`, `AreaXOptions`, `AreaXCurve`
- `BarYOptions`, `BarXOptions`
- `BandXOptions`, `BandYOptions`
- `DotOptions`, `HexagonOptions`
- `RectOptions`, `CellOptions`
- `RuleXOptions`, `RuleYOptions`
- `CrosshairOptions`, `CrosshairRuleOptions`, `CrosshairAxisOptions`,
  `CrosshairBandOptions`, `CrosshairLabelOptions`, `CrosshairMarkerOptions`
- `LinkOptions`, `ArrowOptions`, `VectorOptions`, `VectorAnchor`
- `TickXOptions`, `TickYOptions`
- `TextOptions`, `TextAnchor`
- `FrameOptions`
- `FacetOptions`, `FacetAxes`, `FacetChartContext`
- `ColorLegendOptions`, `ColorLegendItemOptions`, `ColorLegendItemValue`,
  `ColorLegendIndicatorOptions`, `ColorLegendIndicatorShape`,
  `ColorLegendLabelOptions`,
  `ColorGradientLegendOptions`

Their public fields and defaults are owned by the
[mark reference](./index.md#mark-reference) and
[legend reference](./scales-guides-and-color.md#automatic-color-legend).

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
