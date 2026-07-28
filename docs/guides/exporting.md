---
title: Exporting
description: Export accessible chart SVG or browser-rendered raster images while preserving dimensions, styling, and resource identity.
---

TanStack Charts has two export paths:

- render a `ChartScene` directly to an SVG string;
- serialize or rasterize an SVG that is already mounted in a browser.

Choose based on whether export needs computed browser styles.

## Render a scene to SVG

`renderChartSvg` is deterministic and DOM-free:

```ts
import { createChartScene, renderChartSvg } from '@tanstack/charts'

const scene = createChartScene(definition, {
  width: 960,
  height: 540,
})

const svg = renderChartSvg(scene, {
  ariaLabel: 'Quarterly revenue',
  ariaDescription: 'Revenue rose in three of four quarters.',
  idPrefix: 'quarterly-revenue',
})
```

For a dynamic definition, create a runtime with its datum, input, x-value, and
y-value generics, then call `render(...)` with the required input. See
[Runtime and Scene](../reference/runtime-and-scene.md#createchartruntime) and
[SSR and Hydration](./ssr-and-hydration.md).

Use explicit export dimensions. Responsive browser dimensions are a display
policy, not a reproducible file size.

## Serialize a mounted chart

The export subpath copies a mounted chart and inlines presentation properties
that depend on CSS:

```ts
import { downloadChartSvg, serializeChartSvg } from '@tanstack/charts/export'

const serialized = serializeChartSvg(chartContainer, {
  width: 1200,
  height: 675,
})

downloadChartSvg(chartContainer, 'quarterly-revenue.svg', {
  width: 1200,
  height: 675,
})
```

The target may be the chart SVG or an ancestor containing `svg.ts-chart`.
Focus decoration is omitted by default; set `includeFocus: true` when it is
part of the intended artifact.

## Export PNG, JPEG, or WebP

Raster export is browser-only and is isolated behind the same export subpath:

```ts
import { downloadChartImage, renderChartImage } from '@tanstack/charts/export'

const blob = await renderChartImage(chartContainer, {
  width: 1200,
  height: 675,
  scale: 2,
  background: '#ffffff',
  type: 'image/png',
})

await downloadChartImage(chartContainer, 'quarterly-revenue.png', {
  scale: 2,
  background: '#ffffff',
})
```

`scale` controls raster density, not chart layout. A 1200 × 675 chart at scale
2 produces a 2400 × 1350 canvas while retaining the 1200 × 675 visual
coordinate system.

## Theme and resource policy

Export the theme intended for the artifact. A chart following application dark
mode should usually receive an explicit light theme and background for a
document or print workflow.

Gradients and clips require stable resource IDs. Supply `idPrefix` when
rendering multiple chart exports into the same document. If a custom SVG
renderer is in use, it must preserve the scene's gradients, accessibility
metadata, and scoped IDs.

## Security and portability

Chart text is escaped by the SVG renderer. Custom renderers and custom tooltip
HTML remain application-owned.

Before exporting a chart that references external images, fonts, or CSS,
decide whether the consumer can reach those resources. Self-contained SVG
needs embedded or inlined assets.

## Export checklist

- File dimensions are explicit.
- The export theme and background are intentional.
- The accessible name and description describe the exported state.
- Resource IDs are scoped.
- Fonts and external resources are portable.
- Focus decoration is included only when meaningful.
- Raster scale is chosen for the target medium.

See [Rendering and Export](../reference/rendering-and-export.md) for every
function and option.
