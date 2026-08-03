---
title: Installation
description: Install TanStack Charts, a framework adapter, and the granular D3 modules used by your charts.
---

TanStack Charts `0.6.4` publishes the framework-agnostic core and every adapter
listed below. Install the core in each application that authors chart
definitions:

```sh
pnpm add @tanstack/charts
```

Then add one adapter if the application needs it:

```sh
# React
pnpm add @tanstack/react-charts react react-dom

# React Native
pnpm add @tanstack/react-native-charts react@^19.2.3 react-native@^0.86.0 react-native-svg@^15.15.4

# Preact
pnpm add @tanstack/preact-charts preact

# Vue
pnpm add @tanstack/vue-charts vue

# Solid
pnpm add @tanstack/solid-charts solid-js

# Svelte
pnpm add @tanstack/svelte-charts svelte

# Angular
pnpm add @tanstack/angular-charts @angular/core @angular/platform-browser

# Lit
pnpm add @tanstack/lit-charts lit

# Alpine
pnpm add @tanstack/alpine-charts alpinejs

# Octane
pnpm add @tanstack/octane-charts octane
```

The adapters intentionally do not replace the core package. Definitions and marks still come from `@tanstack/charts`; an adapter only connects the shared runtime to its framework lifecycle.

## Framework compatibility

| Adapter package                 | Framework peers                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------- |
| `@tanstack/react-charts`        | React and React DOM `^19.0.0`                                                   |
| `@tanstack/react-native-charts` | React `^19.2.3`, React Native `^0.86.0`, and `react-native-svg` `>=15.15.4 <16` |
| `@tanstack/preact-charts`       | Preact `>=10`                                                                   |
| `@tanstack/vue-charts`          | Vue `>=3.5`                                                                     |
| `@tanstack/solid-charts`        | Solid `>=1.8`                                                                   |
| `@tanstack/svelte-charts`       | Svelte `^5.20.0`                                                                |
| `@tanstack/angular-charts`      | Angular core and platform browser `>=19`                                        |
| `@tanstack/lit-charts`          | Lit `>=3.1.3`                                                                   |
| `@tanstack/alpine-charts`       | Alpine `>=3.15`                                                                 |
| `@tanstack/octane-charts`       | Octane `^0.1.13`                                                                |

These ranges are the package peer contracts. Use the selected framework's
normal renderer or application package beside the adapter when the application
needs browser mounting or server rendering.

## React Native and Expo

The React Native adapter is experimental and renders through
`react-native-svg`. Expo 57 applications can install the package and the SVG
version selected by Expo:

```sh
pnpm add @tanstack/charts @tanstack/react-native-charts d3-scale
pnpm exec expo install react-native-svg
```

Bare React Native 0.86 applications install the renderer directly:

```sh
pnpm add @tanstack/charts @tanstack/react-native-charts d3-scale react-native-svg@^15.15.4
```

Run `bundle exec pod install` from `ios/` after adding it to a bare iOS
application. Import shared definitions through the universal entry and choose
the native host explicitly:

```tsx
import { defineChart, lineY } from '@tanstack/charts/universal'
import { Chart } from '@tanstack/react-native-charts'
import { tooltip } from '@tanstack/react-native-charts/tooltip'
```

Packed tarballs are typechecked and bundled through default bare React Native
and Expo Metro configurations on iOS and Android. The workspace Expo 57
fixture also renders in Expo Go on an iOS simulator. Bare-native and Android
simulators, physical devices, gestures, visual parity, and screen readers are
not currently supported.

## Install the D3 modules you import

TanStack Charts accepts D3 scale factories, configured scale instances, and
the output of D3 transforms directly. Your application must declare every
`d3-*` module that its source imports. Strict package managers do not expose
transitive dependencies as an application import contract.

The core package declares the `d3-array`, `d3-shape`, and `d3-geo`
implementations owned by its numeric-bin and stack transforms, polar and D3
curve features, and geo features. They are normal dependencies, not peer
requirements, and bundlers remove unused algorithms and geometry from
application bundles.

A typical cartesian chart uses:

```sh
pnpm add d3-array d3-scale
pnpm add -D @types/d3-array @types/d3-scale
```

Add shape interpolation only when a chart imports it:

```sh
pnpm add d3-shape
pnpm add -D @types/d3-shape
```

Other capabilities remain equally granular:

```sh
# Examples: install only what the application imports
pnpm add d3-geo d3-quadtree d3-delaunay d3-selection d3-zoom d3-brush d3-time d3-scale-chromatic
pnpm add -D @types/d3-geo @types/d3-quadtree @types/d3-delaunay @types/d3-selection @types/d3-zoom @types/d3-brush @types/d3-time @types/d3-scale-chromatic
```

Do not install the `d3` umbrella package just because a chart uses one D3 capability. Named modules keep ownership visible and make the measured consumer bundle reflect the chart that was actually authored. [Scales and D3](./concepts/scales-and-d3.md) is the single guide to this boundary and links to the corresponding official D3 documentation.

For the common numeric and categorical subset, the smaller scale package is an
alternative to `d3-scale`:

```sh
pnpm add @tanstack/charts-scales
```

```ts
import { scaleLinear } from '@tanstack/charts-scales/linear'
```

Use its exact `/linear`, `/band`, `/point`, or `/ordinal` entry. The package
has no root export. Install `d3-scale` instead when the chart needs temporal,
logarithmic, piecewise, color-interpolating, or full D3 formatting semantics.

## Package-manager examples

The core plus a common scale-and-array setup:

```sh
# npm
npm install @tanstack/charts d3-array d3-scale
npm install --save-dev @types/d3-array @types/d3-scale

# yarn
yarn add @tanstack/charts d3-array d3-scale
yarn add --dev @types/d3-array @types/d3-scale

# pnpm
pnpm add @tanstack/charts d3-array d3-scale
pnpm add -D @types/d3-array @types/d3-scale

# bun
bun add @tanstack/charts d3-array d3-scale
bun add -D @types/d3-array @types/d3-scale
```

Install exactly one adapter package and its required framework peers. A shared
definition can move between adapters without changing marks, channels, scales,
or captured data.

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
import { focusX } from '@tanstack/charts/focus'
import { tooltip } from '@tanstack/charts/tooltip'
import { portal } from '@tanstack/charts/tooltip/portal'
import { mountCanvasChart } from '@tanstack/charts/canvas'
import { mountChartRenderer } from '@tanstack/charts/renderer'
import { polar, radialArc } from '@tanstack/charts/polar'
import { geoShape } from '@tanstack/charts/geo'
```

Canvas remains optional in framework code too:

```tsx
import { Chart as ReactCanvasChart } from '@tanstack/react-charts/canvas'
import { Chart as ReactRendererChart } from '@tanstack/react-charts/core'
import { Chart as OctaneCanvasChart } from '@tanstack/octane-charts/canvas'
import { Chart as OctaneRendererChart } from '@tanstack/octane-charts/core'
```

The default entries are SVG-based. React and Octane currently provide the
optional `/canvas` and `/core` entries.

Polar and geographic marks are intentionally absent from the package root.
Their subpaths keep `d3-shape` and `d3-geo` unreachable from ordinary
Cartesian consumers.

## TypeScript

TanStack Charts ships its own declarations. Install the matching `@types/d3-*` package for each D3 module your TypeScript source imports.

Normal chart authoring should not require adapter generics or casts:

```ts
import { scaleLinear } from 'd3-scale'
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
import { scaleLinear } from 'd3-scale'
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
