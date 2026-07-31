---
title: Faceting and Composition
description: Layer marks, repeat a shared chart by group, and coordinate multiple views without introducing a fixed chart-type model.
---

Composition is the main extension mechanism in TanStack Charts. Marks share a
chart specification, scales, theme, and responsive plot rectangle. More
complex views combine those same primitives instead of switching to a separate
component family.

## Layer marks

Marks are rendered in array order. Put broad background geometry first and
annotations or direct labels last:

```ts
const definition = defineChart({
  marks: [
    ruleY([0]),
    areaY(rows, { x: 'date', y1: 'low', y2: 'high' }),
    lineY(rows, { x: 'date', y: 'median' }),
    dot(highlights, { x: 'date', y: 'median' }),
    text(labels, { x: 'date', y: 'median', text: 'label' }),
  ],
  x,
  y,
})
```

Each mark may consume a different datum type. The resulting chart interaction
type is the honest union of those datum types. Use ordinary TypeScript
narrowing when a callback handles several layers.

The canonical grammar is described in
[Marks and Layering](../concepts/marks-and-layering.md).

## Facet one view by a field

`facetChart` repeats a mark composition for each group and returns a complete
guide-free outer definition:

```ts
const definition = facetChart(rows, {
  by: 'group',
  columns: 2,
  gap: 20,
  axes: 'outer',
  chart(data) {
    return {
      marks: [dot(data, { x: 'x', y: 'y' })],
      x: { scale: scaleLinear().domain(sharedX) },
      y: { scale: scaleLinear().domain(sharedY) },
    }
  },
})
```

Use `facet(rows, options)` instead when the repeated panels need to be one mark
inside a larger custom definition.

The default `axes: 'outer'` draws shared guides around the complete facet
grid. Use `axes: 'cell'` when each panel needs its own guides. Cell axes and
incompatible independent scales cannot be presented as one shared outer axis;
choose the option that matches the comparison.

<iframe
  src="https://tanstack.com/charts/catalog/embed/facets-anscombe/?theme=system&height=480"
  title="Anscombe quartet rendered as responsive small multiples"
  loading="lazy"
  style="width: 100%; height: 480px; border: 0;"
></iframe>

## Share domains intentionally

Shared scales make position comparable across panels. Independent domains
make local variation easier to see but can exaggerate differences.

Build shared domains once and pass configured scales to every facet. When a
panel deliberately uses an independent domain, label that policy in the
surrounding UI.

The [Scales and D3](../concepts/scales-and-d3.md) page owns scale construction
and responsive range rules.

## Compose distinct views

Not every composition is a facet. A focus-and-context chart, scatterplot with
marginal histograms, or chart-plus-table contains views with different roles.
In that case:

1. Keep each chart definition independent.
2. Store shared selection or viewport in application state.
3. Give each view its own accessible name.
4. Convert semantic state into each view's configured domains.
5. Align overlays from each resolved `scene.chart`.

Do not coordinate charts by querying or mutating their SVG nodes.

## Embedded regions and custom layout

When several plot regions must live inside one SVG, a custom mark can render
scene groups with explicit translations and clips. Use that only when one
responsive scene is materially better than several accessible chart hosts.

The [Custom Marks and Renderers](./custom-marks-and-renderers.md) guide explains
the scene-node protocol. The [Responsive Charts](./responsive-charts.md) guide
explains how to base region geometry on the final chart bounds.

## Composition checklist

- Layer order reflects visual occlusion and reading order.
- Each mark keeps its natural data shape and stable inferred or explicit
  identity.
- Shared scales are used only where direct positional comparison is intended.
- Facet axis policy is explicit.
- Each independently interactive view has its own accessible name.
- Shared state is semantic application state, not DOM state.
- Dense dashboards destroy hosts and listeners when panels unmount.
