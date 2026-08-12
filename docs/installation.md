---
title: Installation
description: Install TanStack Charts with compact scales, framework adapters, and optional capabilities behind exact subpaths.
---

These docs follow unreleased `main`. The latest published pre-alpha is TanStack
Charts `0.12.0`; use its
[release-source docs](https://github.com/TanStack/charts/tree/v0.12.0/docs)
for the exact surface. Install TanStack Charts in each application that authors
chart definitions:

```sh
pnpm add @tanstack/charts
```

Add the selected framework peers when the application uses an adapter subpath:

```sh
# React
pnpm add @tanstack/charts react react-dom

# React Native
pnpm add @tanstack/charts react@^19.2.3 react-native@^0.86.0 react-native-svg@^15.15.4

# Preact
pnpm add @tanstack/charts preact

# Vue
pnpm add @tanstack/charts vue

# Solid
pnpm add @tanstack/charts solid-js

# Svelte
pnpm add @tanstack/charts svelte

# Angular
pnpm add @tanstack/charts @angular/core @angular/platform-browser

# Lit
pnpm add @tanstack/charts lit

# Alpine
pnpm add @tanstack/charts alpinejs

# Octane
pnpm add @tanstack/charts octane
```

Definitions and marks come from the package root. Adapter subpaths connect the
shared runtime to a framework lifecycle while preserving separate module-graph
boundaries for tree shaking.

Optional capabilities use exact subpaths from the same package:

```ts
import { contour } from '@tanstack/charts/spatial/contour'
import { focusGuideX } from '@tanstack/charts/focus/guide'
import { brushX } from '@tanstack/charts/interaction/brush'
import { continuousCursor } from '@tanstack/charts/interaction/cursor'
import { handleX } from '@tanstack/charts/interaction/handle'
import { controlledSignal } from '@tanstack/charts/interaction/signal'
import { zoomX } from '@tanstack/charts/interaction/zoom'
import { interactiveColorLegend } from '@tanstack/charts/legend'
import { keyedSelection, whenSelected } from '@tanstack/charts/selection'
import { forceLayout } from '@tanstack/charts/network/force'
import { sankeyDiagram } from '@tanstack/charts/network/sankey'
import { treeLayout } from '@tanstack/charts/hierarchy/tree'
import { treemap } from '@tanstack/charts/hierarchy/treemap'
import { sunburst } from '@tanstack/charts/hierarchy/sunburst'
```

The algorithm-backed subpaths own their `d3-contour`, `d3-force`,
`d3-sankey`, `d3-hierarchy`, `d3-brush`, `d3-zoom`, and `d3-selection`
implementations. The continuous cursor uses resolved scale inversion and adds
no D3 dependency. The scale handle uses the shared candidate-axis kernel and
also adds no D3 dependency. Install a corresponding D3 module in the
application only when application source imports it directly.

Eager transforms also have exact subpaths when a library needs a narrow import:

```ts
import { fold } from '@tanstack/charts/transform/fold'
```

`fold` is implemented by TanStack Charts and does not require an application
D3 dependency.

## Framework compatibility

| Adapter subpath                 | Framework peers                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------- |
| `@tanstack/charts/react`        | React and React DOM `^19.0.0`                                                   |
| `@tanstack/charts/react-native` | React `^19.2.3`, React Native `^0.86.0`, and `react-native-svg` `>=15.15.4 <16` |
| `@tanstack/charts/preact`       | Preact `>=10`                                                                   |
| `@tanstack/charts/vue`          | Vue `>=3.5`                                                                     |
| `@tanstack/charts/solid`        | Solid `>=1.8`                                                                   |
| `@tanstack/charts/svelte`       | Svelte `^5.20.0`                                                                |
| `@tanstack/charts/angular`      | Angular core and platform browser `>=19`                                        |
| `@tanstack/charts/lit`          | Lit `>=3.1.3`                                                                   |
| `@tanstack/charts/alpine`       | Alpine `>=3.15`                                                                 |
| `@tanstack/charts/octane`       | Octane `^0.1.13`                                                                |

Framework peers are optional at the package level because package managers
cannot scope peers to individual export subpaths. Install only the peers for
the selected adapter. Use the framework's normal renderer or application
package when the application needs browser mounting or server rendering.

## React Native and Expo

The React Native adapter is experimental and renders through
`react-native-svg`. Expo 57 applications can install the package and the SVG
version selected by Expo:

```sh
pnpm add @tanstack/charts
pnpm exec expo install react-native-svg
```

Bare React Native 0.86 applications install the renderer directly:

```sh
pnpm add @tanstack/charts react react-native react-native-svg@^15.15.4
```

Run `bundle exec pod install` from `ios/` after adding it to a bare iOS
application. Metro does not reliably remove unused exports from a large barrel,
so import exact chart capabilities and choose the native host explicitly:

```tsx
import { lineY } from '@tanstack/charts/line'
import { defineChart } from '@tanstack/charts/scene'
import { Chart } from '@tanstack/charts/react-native'
import { tooltip } from '@tanstack/charts/react-native/tooltip'
```

Packed tarballs are typechecked and bundled through default bare React Native
and Expo Metro configurations on iOS and Android. The workspace Expo 57
fixture also renders in Expo Go on an iOS simulator. Native responder and
accessibility cursor behavior has component regression coverage. Bare-native
and Android simulator runs, physical devices, visual parity, and screen-reader
verification are not currently part of the release gate.

## Choose scale capabilities

`@tanstack/charts/scales/*` covers the common numeric linear, band, point, and
ordinal mappings. Import each family from its exact entry:

```ts
import { scaleBand } from '@tanstack/charts/scales/band'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { scaleOrdinal } from '@tanstack/charts/scales/ordinal'
import { scalePoint } from '@tanstack/charts/scales/point'
```

There is no aggregate `/scales` export. Each exact scale entry includes its own
TypeScript declarations and no D3 runtime dependency.

Use `d3-scale` when a chart needs time or UTC scales, logarithmic, power,
symlog, square-root, radial, sequential, diverging, quantile, quantize, or
threshold scales, piecewise or nonnumeric interpolation, or full D3 formatting
semantics:

```sh
pnpm add d3-scale
pnpm add -D @types/d3-scale
```

TanStack Charts accepts those D3 factories and configured instances through
the same scale contract. Your application must declare every `d3-*` module
that its source imports. Strict package managers do not expose transitive
dependencies as an application import contract.

The core package declares the `d3-array`, `d3-shape`, `d3-geo`, `d3-delaunay`,
`d3-hexbin`, `d3-contour`, `d3-force`, `d3-sankey`, `d3-hierarchy`, `d3-brush`,
and `d3-selection` implementations owned by its transforms, curve and geo
features, and optional spatial, network, hierarchy, and brush entries. They are
normal dependencies, not peer requirements, and bundlers remove unused
algorithms and geometry from application bundles.

Add direct data transforms or shape interpolation only when application source
imports them:

```sh
pnpm add d3-array d3-shape
pnpm add -D @types/d3-array @types/d3-shape
```

Other capabilities remain equally granular:

```sh
# Examples: install only what the application imports
pnpm add d3-geo d3-quadtree d3-delaunay d3-selection d3-zoom d3-brush d3-time d3-scale-chromatic
pnpm add -D @types/d3-geo @types/d3-quadtree @types/d3-delaunay @types/d3-selection @types/d3-zoom @types/d3-brush @types/d3-time @types/d3-scale-chromatic
```

Do not install the `d3` umbrella package just because a chart uses one D3 capability. Named modules keep ownership visible and make the measured consumer bundle reflect the chart that was actually authored. [Scales](./concepts/scales-and-d3.md) is the single guide to this boundary and links to the corresponding official D3 documentation.

## Package-manager examples

The same package contains the core, compact scales, adapters, and optional
capability subpaths:

```sh
# npm
npm install @tanstack/charts

# yarn
yarn add @tanstack/charts

# pnpm
pnpm add @tanstack/charts

# bun
bun add @tanstack/charts
```

Install the selected adapter's required framework peers. A shared definition
can move between adapter subpaths without changing marks, channels, scales, or
captured data.

## Import boundaries

Use the package root for ordinary application authoring:

```ts
import { defineChart, lineY, mountChart } from '@tanstack/charts'
```

Use subpath exports when an authored library needs a hard capability boundary:

```ts
import { lineY } from '@tanstack/charts/line'
import { mountChart } from '@tanstack/charts/dom'
import { renderChartSvg } from '@tanstack/charts/svg'
```

Use the universal barrel when definitions and scene compilation must not make
the browser host reachable:

```ts
import {
  createChartRuntime,
  defineChart,
  lineY,
} from '@tanstack/charts/universal'
import type { ChartDefinition } from '@tanstack/charts/types'
```

The root remains the browser-oriented compatibility entry. Subpaths expose the
same contracts behind explicit capability boundaries.

Optional capabilities have explicit entries:

```ts
import { d3Curve } from '@tanstack/charts/d3/shape'
import { renderChartImage } from '@tanstack/charts/export'
import { focusGroupX } from '@tanstack/charts/focus'
import { tooltip } from '@tanstack/charts/tooltip'
import { portal } from '@tanstack/charts/tooltip/portal'
import { mountCanvasChart } from '@tanstack/charts/canvas'
import { mountChartRenderer } from '@tanstack/charts/renderer'
import { polar, radialArc } from '@tanstack/charts/polar'
import { geoShape } from '@tanstack/charts/geo'
```

Canvas remains optional in framework code too:

```tsx
import { Chart as ReactCanvasChart } from '@tanstack/charts/react/canvas'
import { Chart as ReactRendererChart } from '@tanstack/charts/react/core'
import { Chart as OctaneCanvasChart } from '@tanstack/charts/octane/canvas'
import { Chart as OctaneRendererChart } from '@tanstack/charts/octane/core'
```

The default entries are SVG-based. React and Octane currently provide the
optional `/canvas` and `/core` entries.

Polar and geographic marks are intentionally absent from the package root.
Their subpaths keep `d3-shape` and `d3-geo` unreachable from ordinary
Cartesian consumers.

## TypeScript

TanStack Charts, including its compact scale entries, ships its own
declarations. Install the matching `@types/d3-*` package for each D3 module your
TypeScript source imports.

Normal chart authoring should not require adapter generics or casts:

```ts
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { defineChart, lineY } from '@tanstack/charts'

const values = [4, 9, 7]

const chart = defineChart({
  marks: [lineY(values)],
  x: { scale: scaleLinear },
  y: { scale: scaleLinear },
})
```

If a channel or scale does not type-check, correct the source type, field, accessor, scale domain, or definition. The [TypeScript guide](./guides/typescript.md) covers inference and advanced custom marks.

## Browser and server requirements

Chart definitions, scene creation, and SVG string rendering do not require a
browser. The vanilla hosts require normal DOM APIs and use `ResizeObserver`
when width is responsive. Canvas rendering additionally requires Canvas 2D;
curved, polar, and geographic path data requires `Path2D`. React and Octane
Canvas entries emit an accessible shell on the server, then paint pixels and
connect the shared host on the client.

Use `initialWidth` for deterministic server and hidden-container output. See [SSR and Hydration](./guides/ssr-and-hydration.md) for adapter-specific setup.

## Verify the installation

Create a small scene without mounting it:

<!-- docs-example: installation-check typecheck -->

```ts
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { createChartScene, defineChart, lineY } from '@tanstack/charts'

const chart = defineChart({
  marks: [lineY([2, 5, 3])],
  x: { scale: scaleLinear },
  y: { scale: scaleLinear },
})

const scene = createChartScene(chart, { width: 640, height: 320 })

console.log(scene.chart, scene.points.length)
```

Both positional scales are required. A missing scale is an authoring error rather than a hidden fallback.

Continue with the [Quick Start](./quick-start.md), then open the adapter page
for the framework that owns the chart component.
