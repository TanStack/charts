---
title: Installation
description: Install TanStack Charts, a framework adapter, and the granular D3 modules used by your charts.
---

Install the framework-agnostic core in every application that authors chart definitions:

```sh
pnpm add @tanstack/charts
```

Then add one adapter if the application needs it:

```sh
# React
pnpm add @tanstack/react-charts react

# Octane
pnpm add @tanstack/octane-charts octane
```

The adapters intentionally do not replace the core package. Definitions and marks still come from `@tanstack/charts`; an adapter only connects the shared runtime to its framework lifecycle.

## Install the D3 modules you import

TanStack Charts accepts configured D3 scales and the output of D3 transforms directly. Your application must declare every `d3-*` module that its source imports. Strict package managers do not expose transitive dependencies as an application import contract.

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
pnpm add d3-quadtree d3-delaunay d3-selection d3-zoom d3-brush d3-time d3-scale-chromatic
pnpm add -D @types/d3-quadtree @types/d3-delaunay @types/d3-selection @types/d3-zoom @types/d3-brush @types/d3-time @types/d3-scale-chromatic
```

Do not install the `d3` umbrella package just because a chart uses one D3 capability. Named modules keep ownership visible and make the measured consumer bundle reflect the chart that was actually authored. [Scales and D3](./concepts/scales-and-d3.md) is the single guide to this boundary and links to the corresponding official D3 documentation.

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

For React, add `@tanstack/react-charts` and `react` to the same command. For Octane, add `@tanstack/octane-charts` and `octane`.

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

Subpaths are not a second API. They expose the same functions without making unrelated marks, the DOM host, exporters, or framework code reachable from that entry.

Optional capabilities have explicit entries:

```ts
import { d3Curve } from '@tanstack/charts/d3/shape'
import { renderChartImage } from '@tanstack/charts/export'
import { focusX } from '@tanstack/charts/focus'
```

## TypeScript

TanStack Charts ships its own declarations. Install the matching `@types/d3-*` package for each D3 module your TypeScript source imports.

Normal chart authoring should not require adapter generics or casts:

```ts
import { scaleLinear } from 'd3-scale'
import { defineChart, lineY } from '@tanstack/charts'

const values = [4, 9, 7]

const chart = defineChart({
  marks: [lineY(values)],
  x: { scale: scaleLinear().domain([0, values.length - 1]) },
  y: { scale: scaleLinear().domain([0, 10]) },
})
```

If a channel or scale does not type-check, correct the source type, field, accessor, scale domain, or definition. The [TypeScript guide](./guides/typescript.md) covers inference and advanced custom marks.

## Browser and server requirements

Chart definitions, scene creation, and SVG string rendering do not require a browser. The vanilla DOM host requires normal DOM APIs and uses `ResizeObserver` when width is responsive. React and Octane use the same deterministic scene and SVG path for server output, then connect the DOM host on the client.

Use `initialWidth` for deterministic server and hidden-container output. See [SSR and Hydration](./guides/ssr-and-hydration.md) for adapter-specific setup.

## Verify the installation

Create a small scene without mounting it:

<!-- docs-example: installation-check typecheck -->

```ts
import { scaleLinear } from 'd3-scale'
import { createChartScene, defineChart, lineY } from '@tanstack/charts'

const chart = defineChart({
  marks: [lineY([2, 5, 3])],
  x: { scale: scaleLinear().domain([0, 2]) },
  y: { scale: scaleLinear().domain([0, 5]) },
})

const scene = createChartScene(chart, { width: 640, height: 320 })

console.log(scene.chart, scene.points.length)
```

Both positional scales are required. A missing scale is an authoring error rather than a hidden fallback.

Continue with the [Quick Start](./quick-start.md), or choose the [React](./framework/react/quick-start.md) or [Octane](./framework/octane/quick-start.md) adapter path.
