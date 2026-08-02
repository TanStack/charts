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
| Dynamic scene compilation and runtime behavior              | [Runtime and scene](./runtime-and-scene.md)               |
| Pointer focus, keyboard navigation, tooltips, and selection | [Focus and interaction](./focus-and-interaction.md)       |
| SVG, Canvas, custom rendering, reconciliation, and export   | [Rendering and export](./rendering-and-export.md)         |
| Optional tween and spring motion                            | [Motion](./motion.md)                                     |
| Custom marks, renderers, scales, and indexes                | [Custom extensions](./custom-extensions.md)               |
| Public generic and scene types                              | [Types](./types.md)                                       |

## Mark reference

| Marks                                                             | Reference                                                                                   |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `lineY`, `areaY`, and `areaX`                                     | [Line and area](./marks/line-and-area.md)                                                   |
| `barY`, `barX`, `rect`, and `cell`                                | [Bar and rect](./marks/bar-and-rect.md)                                                     |
| `dot` and `hexagon`                                               | [Dot and hexagon](./marks/dot-and-hexagon.md)                                               |
| `ruleX`, `ruleY`, `link`, `arrow`, `vector`, `tickX`, and `tickY` | [Rules, links, arrows, vectors, and ticks](./marks/rules-links-arrows-vectors-and-ticks.md) |
| `text`, `frame`, `facet`, and `facetChart`                        | [Text, frame, and facet](./marks/text-frame-and-facet.md)                                   |
| `geoShape`                                                        | [Geo shape](./marks/geo.md)                                                                 |
| `polar`, radial marks, and polar guides                           | [Polar marks](./marks/polar.md)                                                             |

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

## Import map

The root `@tanstack/charts` entry point exports the common grammar, runtime,
scene, SVG renderer, browser host, and their public types. The universal entry
excludes browser hosts and adapters. Granular subpaths keep optional
capabilities and individual marks independently tree-shakeable.

| Import                               | Public values                                                                                                                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@tanstack/charts`                   | Common marks, legends, D3 curve bridges, `createMark`, `defineChart`, `createChartScene`, `createChartRuntime`, `isDynamicChartDefinition`, `mountChart`, and `renderChartSvg` |
| `@tanstack/charts/adapter`           | `createChartAdapter`, `resolveChartAdapterLayout`, `ChartAdapter`, `ChartAdapterLayout`, and `ChartAdapterLayoutOptions`                                                       |
| `@tanstack/charts/adapter/renderer`  | `createChartRendererAdapter`                                                                                                                                                   |
| `@tanstack/charts/area`              | `areaY`                                                                                                                                                                        |
| `@tanstack/charts/area-x`            | `areaX`                                                                                                                                                                        |
| `@tanstack/charts/arrow`             | `arrow`                                                                                                                                                                        |
| `@tanstack/charts/band`              | `bandX`, `bandY`                                                                                                                                                               |
| `@tanstack/charts/bar`               | `barX`, `barY`                                                                                                                                                                 |
| `@tanstack/charts/canvas`            | `mountCanvasChart`, `canvasChartRenderer`, `createCanvasChartRenderer`, and Canvas host/surface types                                                                          |
| `@tanstack/charts/d3/area-x`         | `d3AreaXCurve`                                                                                                                                                                 |
| `@tanstack/charts/d3/shape`          | `d3Curve`                                                                                                                                                                      |
| `@tanstack/charts/dom`               | `mountChart`                                                                                                                                                                   |
| `@tanstack/charts/dot`               | `dot`                                                                                                                                                                          |
| `@tanstack/charts/export`            | SVG serialization/download and browser image export                                                                                                                            |
| `@tanstack/charts/facet`             | `facet`, `facetChart`                                                                                                                                                          |
| `@tanstack/charts/focus`             | `focusX`, `focusY`, `focusNearestX`, `focusNearestY`                                                                                                                           |
| `@tanstack/charts/focus/disabled`    | `focusDisabled`                                                                                                                                                                |
| `@tanstack/charts/focus/mark`        | `whenFocused`                                                                                                                                                                  |
| `@tanstack/charts/frame`             | `frame`                                                                                                                                                                        |
| `@tanstack/charts/geo`               | `geoShape` and geographic projection types                                                                                                                                     |
| `@tanstack/charts/group`             | `group`, `GroupLayout`, `GroupOptions`                                                                                                                                         |
| `@tanstack/charts/hexagon`           | `hexagon`                                                                                                                                                                      |
| `@tanstack/charts/legend`            | `colorLegend`, `colorGradientLegend`                                                                                                                                           |
| `@tanstack/charts/line`              | `lineY`                                                                                                                                                                        |
| `@tanstack/charts/link`              | `link`                                                                                                                                                                         |
| `@tanstack/charts/mark/scale-values` | `createMarkWithScaleValues`                                                                                                                                                    |
| `@tanstack/charts/motion`            | `motion`, `ChartMotionOptions`, and renderer-neutral motion types                                                                                                              |
| `@tanstack/charts/polar`             | `polar`, radial arc/line/area/dot marks, and radial/angle guides                                                                                                               |
| `@tanstack/charts/universal`         | Common root authoring, runtime, scene, and static SVG values without browser hosts or adapters                                                                                 |
| `@tanstack/charts/reconcile`         | `reconcileChartSvg`                                                                                                                                                            |
| `@tanstack/charts/rect`              | `rect`, `cell`                                                                                                                                                                 |
| `@tanstack/charts/renderer`          | `mountChartRenderer`                                                                                                                                                           |
| `@tanstack/charts/rule`              | `ruleX`, `ruleY`                                                                                                                                                               |
| `@tanstack/charts/runtime`           | `createChartRuntime`, `isDynamicChartDefinition`                                                                                                                               |
| `@tanstack/charts/scene`             | `defineChart`, `createChartScene`, `defaultChartTheme`, `findNearestPoint`                                                                                                     |
| `@tanstack/charts/svg`               | `renderChartSvg`                                                                                                                                                               |
| `@tanstack/charts/svg/renderer`      | `createSvgChartRenderer`, `svgChartRenderer`                                                                                                                                   |
| `@tanstack/charts/svg/resources`     | `renderChartSvgWithResources`                                                                                                                                                  |
| `@tanstack/charts/stack`             | `stack`, `StackLayout`, `StackOptions`, `StackOrder`, `StackOffset`                                                                                                            |
| `@tanstack/charts/spring`            | `createChartSpring` and scalar spring types                                                                                                                                    |
| `@tanstack/charts/text`              | `text`                                                                                                                                                                         |
| `@tanstack/charts/tick`              | `tickX`, `tickY`                                                                                                                                                               |
| `@tanstack/charts/types`             | Universal definition, mark, scene, runtime, focus, and tooltip-model types                                                                                                     |
| `@tanstack/charts/vector`            | `vector`                                                                                                                                                                       |

Import from the narrowest stable entry point when bundle isolation matters.
Do not import internal source files.
