---
title: Responsive Charts
description: Size charts from their containers while preserving readable guides, deterministic SSR, and application-controlled height.
---

TanStack Charts treats width and height differently:

- width is normally measured from the chart container;
- height is a product decision supplied as pixels or an aspect ratio;
- configured positional scales own semantic domains;
- TanStack Charts copies those scales and assigns responsive pixel ranges.

This keeps a definition stable while the same chart moves between a dashboard
card, a split pane, and a full-width report.

## Container-responsive width

Omit `width` from `mountChart`, React `<Chart>`, or Octane `<Chart>` to follow
the container. The DOM host observes the container and updates only when its
measured width changes.

```ts
const host = mountChart(element, {
  definition,
  height: 320,
  ariaLabel: 'Weekly downloads',
})
```

The container must have a resolvable width. In grid and flex layouts, the
common requirement is `min-width: 0` on the grid or flex child:

```css
.chart-card {
  min-width: 0;
}
```

Supply `width` only when an application deliberately owns fixed geometry, such
as an export frame or a benchmark.

## Height and aspect ratio

Use one of these policies:

- `height`: fixed product height in CSS pixels;
- a positive, finite `aspectRatio`: derive height from the measured width;
- neither: use the host default.

Do not supply both as competing policies. A fixed height is usually more stable
for dashboards and scrolling pages. An aspect ratio is useful for editorial
layouts where the chart should scale as one visual block. Invalid ratios fall
back to the default height.

## Automatic guide space

Omit `margin` for normal charts. The scene solver reserves the minimum space
required by:

- formatted tick labels;
- rotated tick bounds;
- first and last tick overhang;
- axis titles;
- legends;
- inherited font metrics in a DOM host.

```ts
const definition = defineChart({
  marks: [barX(rows, { x: 'value', y: 'label' })],
  x: {
    scale: scaleLinear().domain([0, maximum]).nice(),
    label: 'Weekly downloads',
  },
  y: {
    scale: scaleBand<string>()
      .domain(rows.map((row) => row.label))
      .padding(0.1),
  },
})
```

An explicit side locks only that side:

```ts
margin: {
  left: 96
}
```

`margin: 0` locks every side and is appropriate for guide-free sparklines.
Automatic margins guarantee containment, not collision-free labels. Use
`ticks`, `tickRotate`, or a different representation when labels compete for
the same axis space.

<iframe
  src="https://tanstack.com/charts/catalog/embed/44-framed-scatter/?theme=system&height=320"
  title="Responsive guide-free framed scatterplot"
  loading="lazy"
  style="width: 100%; height: 320px; border: 0;"
></iframe>

## Text measurement

Static scenes use deterministic text estimates. DOM, React, and Octane hosts
measure painted SVG text with the inherited container font and relayout after
web fonts finish loading.

Use `measureText` only when another renderer or layout system owns text
measurement. It receives the text, font size, weight, anchor, and baseline and
returns the painted box relative to the requested origin.

The resolved geometry is available after every render:

```ts
const scene = host.getScene()

scene.margin
scene.chart
scene.scales
```

Use `scene.chart` to align application-owned overlays. Do not calculate a
parallel plot rectangle from guessed margins.

## Deterministic server output

A server cannot measure a future browser container. Supply `initialWidth` when
the initial SVG must have deterministic geometry:

```tsx
<Chart
  definition={definition}
  initialWidth={640}
  height={320}
  ariaLabel="Weekly downloads"
/>
```

The client adopts the real container width after hydration. Use the same
`initialWidth` for all requests that render the same layout; do not derive it
from browser-only APIs on the server.

See [SSR and Hydration](./ssr-and-hydration.md) for the complete lifecycle.

## Responsive construction

Most data preparation should depend only on input. The dynamic `chart` phase
receives the full scene width and height, so it can choose breakpoints, tick
counts, or a surface-relative representation without invalidating
width-independent preparation.

Those values are not the final inner plot bounds. Automatic guides and legends
resolve `scene.chart` after the builder returns. Exact plot-space collision,
binning, or label placement belongs in a custom mark's render phase, which
receives the final chart bounds and resolved scales, or in an application
overlay driven by `onRender`.

```ts
const definition = defineChart<Input>()({
  prepare(input) {
    return summarize(input.rows)
  },
  chart({ prepared, width }) {
    return buildResponsiveSpec(prepared, {
      compact: width < 480,
    })
  },
})
```

For a deliberately guide-free `margin: 0` scene, the full surface and inner
plot can coincide. Do not assume that equivalence for ordinary automatic
layout.

The [Dynamic Data and Animation](./dynamic-data-and-animation.md) guide explains
the two phases. The [D3 integration contract](../concepts/scales-and-d3.md)
explains why application code should not set positional pixel ranges.

## Responsive checklist

- The container can shrink because its grid or flex child uses `min-width: 0`.
- Width is omitted unless fixed geometry is intentional.
- Height or aspect ratio is an explicit product choice.
- Scale domains remain semantic and independent from pixels.
- Automatic margins are enabled unless the chart is deliberately guide-free.
- Long labels are tested at the smallest supported width.
- Overlays use `scene.chart`, not duplicated margin math.
- SSR uses a deterministic `initialWidth`.
- Final plot-space work reads custom-mark render bounds or `scene.chart`.
