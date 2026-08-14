---
title: API Reference
description: Reference for TanStack Charts definitions, marks, scales, runtime, rendering, interaction, and framework adapters.
---

TanStack Charts has a small framework-neutral core and thin framework
adapters. Most applications use `defineChart`, one or more marks, configured
scales, and the selected framework's chart binding. Lower-level entry points
are available for custom marks, vanilla DOM mounting, static rendering, export,
and application-owned interaction.

## Core reference

| Area                                                        | Reference                                                 |
| ----------------------------------------------------------- | --------------------------------------------------------- |
| Object and responsive definitions                           | [Chart Definition API](./chart-definitions.md)            |
| The `ChartSpec` object                                      | [Chart spec](./chart-spec.md)                             |
| Positional scales, axes, color, legends, and gradients      | [Scales, guides, and color](./scales-guides-and-color.md) |
| Vanilla DOM mounting and responsive sizing                  | [DOM host](./dom-host.md)                                 |
| Framework prerender, mount, update, and layout lifecycle    | [Adapter controller](./adapter-controller.md)             |
| Responsive scene compilation and runtime behavior           | [Runtime and scene](./runtime-and-scene.md)               |
| Eager row, hierarchy, and static force transforms           | [Data transforms](./transforms.md)                        |
| Pointer focus, keyboard navigation, tooltips, and selection | [Focus and interaction](./focus-and-interaction.md)       |
| SVG, Canvas, custom rendering, reconciliation, and export   | [Rendering and export](./rendering-and-export.md)         |
| Optional tween and spring motion                            | [Motion](./motion.md)                                     |
| Custom marks, renderers, scales, and indexes                | [Custom extensions](./custom-extensions.md)               |
| Public generic and scene types                              | [Types](./types.md)                                       |

## Mark reference

| Marks                                                             | Reference                                                                                   |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `lineY`, `lineX`, `areaY`, and `areaX`                            | [Line and area](./marks/line-and-area.md)                                                   |
| `differenceY` and `differenceX`                                   | [Difference](./marks/difference.md)                                                         |
| `linearRegressionRowsY/X` and `linearRegressionY/X`               | [Linear regression](./marks/regression.md)                                                  |
| `barY`, `barX`, `rect`, and `cell`                                | [Bar and rect](./marks/bar-and-rect.md)                                                     |
| `boxRows`, `boxY`, and `boxX`                                     | [Box](./marks/box.md)                                                                       |
| `dot` and `hexagon`                                               | [Dot and hexagon](./marks/dot-and-hexagon.md)                                               |
| `createDotLayout`, `dodgeY`, and `dodgeX`                         | [Dodge layouts](./marks/dodge.md)                                                           |
| `waffleY` and `waffleX`                                           | [Waffle](./marks/waffle.md)                                                                 |
| `ridgelineY` and `ridgelineX`                                     | [Ridgeline](./marks/ridgeline.md)                                                           |
| `violinY` and `violinX`                                           | [Violin](./marks/violin.md)                                                                 |
| `focusGuideX` and `focusGuideY`                                   | [Focus guide](./marks/focus-guide.md)                                                       |
| `treemap`                                                         | [Treemap](./marks/treemap.md)                                                               |
| `sunburst`                                                        | [Sunburst](./marks/sunburst.md)                                                             |
| `sankeyDiagram`                                                   | [Sankey diagram](./marks/sankey.md)                                                         |
| `hexbin`                                                          | [Hexbin](./marks/hexbin.md)                                                                 |
| `contour`                                                         | [Contour](./marks/contour.md)                                                               |
| `densityContour`                                                  | [Density contour](./marks/density.md)                                                       |
| `delaunayLink`                                                    | [Delaunay link](./marks/delaunay.md)                                                        |
| `voronoi`                                                         | [Voronoi](./marks/voronoi.md)                                                               |
| `ruleX`, `ruleY`, `link`, `arrow`, `vector`, `tickX`, and `tickY` | [Rules, links, arrows, vectors, and ticks](./marks/rules-links-arrows-vectors-and-ticks.md) |
| `text`, `frame`, `facet`, and `facetChart`                        | [Text, frame, and facet](./marks/text-frame-and-facet.md)                                   |
| `composeViews`, layout utilities, and `viewGrid`                  | [View composition](./view-composition.md)                                                   |
| `geoShape`                                                        | [Geo shape](./marks/geo.md)                                                                 |
| `polar`, radial marks, and polar guides                           | [Polar marks](./marks/polar.md)                                                             |
| `crosshair`                                                       | [Focus and interaction](./focus-and-interaction.md#crosshair-guides)                        |

## Framework adapters

| Framework | Start                                             | Adapter behavior                           | Component API                                                        |
| --------- | ------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------- |
| React     | [Quick start](../framework/react/quick-start.md)  | [Adapter](../framework/react/adapter.md)   | [`Chart`](../framework/react/reference/chart.md)                     |
| Preact    | —                                                 | [Adapter](../framework/preact/adapter.md)  | [`Chart`](../framework/preact/reference/chart.md)                    |
| Vue       | —                                                 | [Adapter](../framework/vue/adapter.md)     | [`Chart`](../framework/vue/reference/chart.md)                       |
| Solid     | —                                                 | [Adapter](../framework/solid/adapter.md)   | [`Chart`](../framework/solid/reference/chart.md)                     |
| Svelte    | —                                                 | [Adapter](../framework/svelte/adapter.md)  | [`Chart`](../framework/svelte/reference/chart.md)                    |
| Angular   | —                                                 | [Adapter](../framework/angular/adapter.md) | [`Chart`](../framework/angular/reference/chart.md)                   |
| Lit       | —                                                 | [Adapter](../framework/lit/adapter.md)     | [`Chart`, `defineChartElement`](../framework/lit/reference/chart.md) |
| Alpine    | —                                                 | [Adapter](../framework/alpine/adapter.md)  | [`charts`](../framework/alpine/reference/chart.md)                   |
| Octane    | [Quick start](../framework/octane/quick-start.md) | [Adapter](../framework/octane/adapter.md)  | [`Chart`](../framework/octane/reference/chart.md)                    |

React and Octane keep the default `Chart` SVG-based. Their `/canvas` entries
select the optional Canvas renderer; their `/core` entries require an explicit
`ChartRenderer`. The other adapters currently expose the default SVG surface.

## Surface tiers

| Tier                        | Use                                                     | Entries                                                                                                                                |
| --------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Ordinary authoring          | Define and render charts                                | `@tanstack/charts` with exact mark, scale, and framework subpaths                                                                      |
| Optional capability         | Add only when the chart needs it                        | transforms, motion, spatial indexes, controlled interaction, tooltip, Canvas, export, hierarchy, network, and view composition entries |
| Host and renderer extension | Implement an adapter, renderer, or host-owned extension | adapter, renderer, scene, reconciliation, SVG renderer, cursor host, and tooltip model entries                                         |

## Import map

The root `@tanstack/charts` entry point exports the common grammar, runtime,
scene, SVG renderer, browser host, and their public types. The universal entry
excludes browser hosts and adapters. Granular subpaths keep optional
capabilities and individual marks independently tree-shakeable. Compact scales
come from exact `@tanstack/charts/scales/*` entries; there is intentionally no
aggregate `/scales` export.

| Import                                  | Public values                                                                                                                                                                                                                   |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@tanstack/charts`                      | Common marks including `crosshair`, legends, D3 curve bridges, definitions, runtime, scene, DOM host, static SVG, and focus-presentation helpers                                                                                |
| `@tanstack/charts/scales/band`          | `scaleBand`, `BandScale`                                                                                                                                                                                                        |
| `@tanstack/charts/scales/linear`        | `scaleLinear`, `LinearScale`                                                                                                                                                                                                    |
| `@tanstack/charts/scales/ordinal`       | `scaleOrdinal`, `OrdinalScale`                                                                                                                                                                                                  |
| `@tanstack/charts/scales/point`         | `scalePoint`, `PointScale`                                                                                                                                                                                                      |
| `@tanstack/charts/react`                | SVG `Chart` and React chart prop, definition, point, and tooltip-body types                                                                                                                                                     |
| `@tanstack/charts/react/canvas`         | Canvas `Chart` and matching React chart prop, definition, point, and tooltip-body types                                                                                                                                         |
| `@tanstack/charts/react/core`           | Renderer-neutral `Chart` and matching React chart prop, definition, point, and tooltip-body types                                                                                                                               |
| `@tanstack/charts/react/tooltip`        | Tooltip-composition `Chart`, `CanvasChart`, `RendererChart`, and their prop and render-context types                                                                                                                            |
| `@tanstack/charts/react-native`         | React Native `Chart`, `ChartProps`, `NativeChartRenderContext`, `NativeChartTooltipRenderContext`, `NativePaintContext`, `NativePaintResolver`, and `resolveNativePaint`                                                        |
| `@tanstack/charts/react-native/tooltip` | React Native `tooltip`, `NativeChartTooltipComponent`, `NativeChartTooltipExtension`, `NativeChartTooltipProps`, and `NativeChartTooltipRenderContext`                                                                          |
| `@tanstack/charts/preact`               | Preact `Chart` and chart prop, definition, point, and tooltip-body types                                                                                                                                                        |
| `@tanstack/charts/vue`                  | Vue `Chart` and chart prop, definition, point, and tooltip-slot types                                                                                                                                                           |
| `@tanstack/charts/solid`                | Solid `Chart` and chart prop, definition, point, and tooltip-body types                                                                                                                                                         |
| `@tanstack/charts/svelte`               | Svelte `Chart` and chart prop, definition, point, and tooltip-snippet types                                                                                                                                                     |
| `@tanstack/charts/angular`              | Angular `Chart`, tooltip-body directive, chart option, definition, point, and template-context types                                                                                                                            |
| `@tanstack/charts/lit`                  | Lit `Chart`, `defineChartElement`, chart prop, definition, point, and tooltip-body types                                                                                                                                        |
| `@tanstack/charts/alpine`               | Alpine `charts` plugin and chart option, definition, point, and tooltip-body types                                                                                                                                              |
| `@tanstack/charts/octane`               | SVG `Chart` and Octane chart prop, definition, point, and tooltip-body types                                                                                                                                                    |
| `@tanstack/charts/octane/canvas`        | Canvas `Chart` and matching Octane chart prop, definition, point, and tooltip-body types                                                                                                                                        |
| `@tanstack/charts/octane/core`          | Renderer-neutral `Chart` and matching Octane chart prop, definition, point, and tooltip-body types                                                                                                                              |
| `@tanstack/charts/adapter`              | `createChartAdapter`, `resolveChartAdapterLayout`, `ChartAdapter`, `ChartAdapterLayout`, and `ChartAdapterLayoutOptions`                                                                                                        |
| `@tanstack/charts/adapter/renderer`     | `createChartRendererAdapter`                                                                                                                                                                                                    |
| `@tanstack/charts/area`                 | `areaY`                                                                                                                                                                                                                         |
| `@tanstack/charts/area-x`               | `areaX`                                                                                                                                                                                                                         |
| `@tanstack/charts/arrow`                | `arrow`                                                                                                                                                                                                                         |
| `@tanstack/charts/band`                 | `bandX`, `bandY`                                                                                                                                                                                                                |
| `@tanstack/charts/bar`                  | `barX`, `barY`                                                                                                                                                                                                                  |
| `@tanstack/charts/box`                  | `boxRows`, `boxY`, `boxX`, derived datum types, and option types                                                                                                                                                                |
| `@tanstack/charts/canvas`               | `mountCanvasChart`, `canvasChartRenderer`, `createCanvasChartRenderer`, and Canvas host/surface types                                                                                                                           |
| `@tanstack/charts/crosshair`            | Data-less `crosshair`, `resolveCrosshairGuide`, and crosshair option types                                                                                                                                                      |
| `@tanstack/charts/cursor`               | `createChartCursor`, `cursorHost`, and framework-neutral controller and state types                                                                                                                                             |
| `@tanstack/charts/cursor/host`          | Adapter-facing cursor session, projection, focus resolution, focus-strategy, and focus-presentation helpers                                                                                                                     |
| `@tanstack/charts/d3/area-x`            | `d3AreaXCurve`                                                                                                                                                                                                                  |
| `@tanstack/charts/d3/shape`             | `d3Curve`                                                                                                                                                                                                                       |
| `@tanstack/charts/difference`           | `differenceY`, `differenceX`, derived datum types, sign and independent-value types, and option types                                                                                                                           |
| `@tanstack/charts/dom`                  | `mountChart`                                                                                                                                                                                                                    |
| `@tanstack/charts/dodge`                | `createDotLayout`, `dodgeY`, `dodgeX`, anchor, option, and layout types                                                                                                                                                         |
| `@tanstack/charts/dot`                  | `dot`                                                                                                                                                                                                                           |
| `@tanstack/charts/export`               | SVG serialization/download and browser image export                                                                                                                                                                             |
| `@tanstack/charts/facet`                | `facet`, `facetChart`                                                                                                                                                                                                           |
| `@tanstack/charts/focus`                | `focusGroupX`, `focusGroupY`, `focusNearestX`, `focusNearestY`                                                                                                                                                                  |
| `@tanstack/charts/focus/disabled`       | `focusDisabled`                                                                                                                                                                                                                 |
| `@tanstack/charts/focus/guide`          | `focusGuideX`, `focusGuideY`, `FocusGuideLabelFormatContext`, and focus-guide option types                                                                                                                                      |
| `@tanstack/charts/focus/mark`           | `whenFocused`                                                                                                                                                                                                                   |
| `@tanstack/charts/frame`                | `frame`                                                                                                                                                                                                                         |
| `@tanstack/charts/geo`                  | `geoShape` and geographic projection types                                                                                                                                                                                      |
| `@tanstack/charts/group`                | `group`, `GroupLayout`, `GroupOptions`                                                                                                                                                                                          |
| `@tanstack/charts/hierarchy/tree`       | `treeLayout`, `TreeOrientation`, `TreeNodeContext`, `TreeNodeComparator`, `TreeNodeSeparation`, `TreeLayoutPathOptions`, `TreeLayoutParentOptions`, `TreeLayoutOptions`, `TreeLayoutNode`, `TreeLayoutLink`, `TreeLayoutResult` |
| `@tanstack/charts/hierarchy/treemap`    | `treemap`, built-in and callable tile types, immutable node values, comparators, and path/parent option types                                                                                                                   |
| `@tanstack/charts/hierarchy/sunburst`   | `sunburst`, `SunburstNode`, `SunburstNodeComparator`, `SunburstPathOptions`, `SunburstParentOptions`, `SunburstOptions`                                                                                                         |
| `@tanstack/charts/hexagon`              | `hexagon`                                                                                                                                                                                                                       |
| `@tanstack/charts/interaction/brush`    | `brushX` and horizontal-brush range, change, source, target, and option types                                                                                                                                                   |
| `@tanstack/charts/interaction/cursor`   | `continuousCursor` and continuous-cursor position, change, guide, label, and option types                                                                                                                                       |
| `@tanstack/charts/interaction/signal`   | `controlledSignal`, `ControlledSignal`, `ControlledSignalChangeContext`                                                                                                                                                         |
| `@tanstack/charts/interaction/zoom`     | `zoomX`, `ZoomXValue`, `ZoomXWindow`, `ZoomXSource`, `ZoomXAction`, `ZoomXChange`, and `ZoomXOptions`                                                                                                                           |
| `@tanstack/charts/legend`               | `colorLegend`, `colorGradientLegend`, `interactiveColorLegend`, `InteractiveColorLegendItemContext`, and legend option/change types                                                                                             |
| `@tanstack/charts/line`                 | `lineY`, `lineX`, `LineYOptions`, and `LineXOptions`                                                                                                                                                                            |
| `@tanstack/charts/regression`           | `linearRegressionRowsY`, `linearRegressionRowsX`, `linearRegressionY`, `linearRegressionX`, derived datum types, and option types                                                                                               |
| `@tanstack/charts/link`                 | `link`                                                                                                                                                                                                                          |
| `@tanstack/charts/mark/composite`       | `compositeMark` and `CompositeMarkOptions`                                                                                                                                                                                      |
| `@tanstack/charts/mark/decorative`      | `decorative`                                                                                                                                                                                                                    |
| `@tanstack/charts/mark/scale-values`    | `createMarkWithScaleValues`                                                                                                                                                                                                     |
| `@tanstack/charts/motion`               | `motion`, `stagger`, `ChartMotionOptions`, and renderer-neutral motion types                                                                                                                                                    |
| `@tanstack/charts/motion/definition`    | Isolated `stagger` and `ChartMotionStaggerOptions` without the renderer or spring solver                                                                                                                                        |
| `@tanstack/charts/network/force`        | `forceLayout`, built-in descriptors, named D3-compatible force factories, private working-clone context, settled node/link result, and lineage types                                                                            |
| `@tanstack/charts/network/sankey`       | `sankeyDiagram`, shorthand and callable alignment types, responsive layout options, immutable node/link values, comparator contexts, and lineage types                                                                          |
| `@tanstack/charts/polar`                | `pie`, `polar`, `focusGroupAngle`, `radialArc`, `radialBarRadius`, `radialBarAngle`, other radial marks, and radial/angle guides                                                                                                |
| `@tanstack/charts/universal`            | Common root authoring, runtime, scene, and static SVG values without browser hosts or adapters                                                                                                                                  |
| `@tanstack/charts/reconcile`            | `reconcileChartSvg`, `reconcileChartSvgFragment`                                                                                                                                                                                |
| `@tanstack/charts/rect`                 | `rect`, `cell`                                                                                                                                                                                                                  |
| `@tanstack/charts/renderer`             | `mountChartRenderer`                                                                                                                                                                                                            |
| `@tanstack/charts/ridgeline`            | `ridgelineY`, `ridgelineX`, `RidgelineYOptions`, `RidgelineXOptions`, `RidgelinePosition`, `RidgelineCurve`, and `RidgelineStateStyle`                                                                                          |
| `@tanstack/charts/rule`                 | `ruleX`, `ruleY`                                                                                                                                                                                                                |
| `@tanstack/charts/runtime`              | `createChartRuntime`, `isResponsiveChartDefinition`                                                                                                                                                                             |
| `@tanstack/charts/selection`            | `keyedSelection`, `whenSelected`, `KeyedSelectionChange`, `KeyedSelectionKeyContext`, `KeyedSelectionOptions`, and `KeyedSelection`                                                                                             |
| `@tanstack/charts/scene`                | `defineChart`, `createChartScene`, `defaultChartTheme`, `findNearestPoint`, `viewportInteractionPoints`                                                                                                                         |
| `@tanstack/charts/svg`                  | `renderChartSvg`                                                                                                                                                                                                                |
| `@tanstack/charts/svg/renderer`         | `createSvgChartRenderer`, `svgChartRenderer`                                                                                                                                                                                    |
| `@tanstack/charts/svg/resources`        | `renderChartSvgWithResources`                                                                                                                                                                                                   |
| `@tanstack/charts/stack`                | `stack`, `StackAnchor`, `StackLayout`, `StackOptions`, `StackOrder`, `StackOffset`                                                                                                                                              |
| `@tanstack/charts/spring`               | `createChartSpring` and scalar spring types                                                                                                                                                                                     |
| `@tanstack/charts/spatial/contour`      | `contour`, `ContourOptions`, and `ContourDatum`                                                                                                                                                                                 |
| `@tanstack/charts/spatial/hexbin`       | `hexbin`, `HexbinOptions`, and `HexbinDatum`                                                                                                                                                                                    |
| `@tanstack/charts/spatial/density`      | `densityContour`, `DensityContourOptions`, and `DensityContourDatum`                                                                                                                                                            |
| `@tanstack/charts/spatial/delaunay`     | `delaunayLink`, `DelaunayLinkOptions`, and `DelaunayLinkDatum`                                                                                                                                                                  |
| `@tanstack/charts/spatial/voronoi`      | `voronoi` and `VoronoiOptions`                                                                                                                                                                                                  |
| `@tanstack/charts/text`                 | `text`                                                                                                                                                                                                                          |
| `@tanstack/charts/tick`                 | `tickX`, `tickY`                                                                                                                                                                                                                |
| `@tanstack/charts/tooltip/model`        | Environment-neutral tooltip ordering, content, anchor, placement, value-formatting, and geometry types for host adapters                                                                                                        |
| `@tanstack/charts/transform/fold`       | `fold`, `FoldField`, `FoldOutputNames`, `FoldOptions`, and `FoldDatum`                                                                                                                                                          |
| `@tanstack/charts/transform/waterfall`  | `waterfall`, `WaterfallKind`, `WaterfallOptions`, `WaterfallDatum`, `WaterfallStepDatum`, and `WaterfallTotalDatum`                                                                                                             |
| `@tanstack/charts/types`                | Universal definition, mark, scene, runtime, focus, and tooltip-model types                                                                                                                                                      |
| `@tanstack/charts/vector`               | `vector`                                                                                                                                                                                                                        |
| `@tanstack/charts/view`                 | `composeViews`, `fill`, `grid`, `layer`, `inset`, scale-link helpers, `viewGrid`, and view composition types                                                                                                                    |
| `@tanstack/charts/violin`               | `violinY`, `violinX`, `ViolinYOptions`, `ViolinXOptions`, `ViolinPosition`, `ViolinYCurve`, and `ViolinXCurve`                                                                                                                  |
| `@tanstack/charts/waffle`               | `waffleY`, `waffleX`, `WaffleOptions`, `WaffleYOptions`, and `WaffleXOptions`                                                                                                                                                   |

Import from the narrowest stable entry point when bundle isolation matters.
Do not import internal source files.
