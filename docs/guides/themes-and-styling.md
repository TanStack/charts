---
title: Themes and Styling
description: Apply automatic light and dark color behavior, CSS palette tokens, mark styles, and renderer-aware resources.
---

TanStack Charts inherits the surrounding application instead of installing a
global visual theme. The default chart theme uses:

- `currentColor` for foreground, muted text, and grids;
- `transparent` for the chart background;
- six CSS-variable-backed categorical colors.

Set the container's `color` and the chart follows normal light and dark CSS:

```css
.chart-card {
  color: #172033;
  background: #ffffff;
}

@media (prefers-color-scheme: dark) {
  .chart-card {
    color: #e6edf7;
    background: #111827;
  }
}
```

## Palette tokens

Override the default categorical palette at any container boundary:

```css
.revenue-chart {
  --ts-chart-1: #2563eb;
  --ts-chart-2: #f97316;
  --ts-chart-3: #10b981;
  --ts-chart-4: #8b5cf6;
  --ts-chart-5: #ec4899;
  --ts-chart-6: #06b6d4;
}
```

This is the lowest-cost path for application branding. It also preserves
automatic theme changes without rebuilding a chart definition.

## Definition-level theme

Use `theme` when a chart needs explicit scene colors:

```ts
const definition = defineChart({
  marks,
  x,
  y,
  theme: {
    foreground: '#e5e7eb',
    muted: '#94a3b8',
    grid: '#334155',
    background: '#0f172a',
    palette: ['#38bdf8', '#fb7185', '#4ade80'],
  },
})
```

`theme` is partial. Omitted fields retain defaults. A responsive definition's
`chart` context receives the default build-time theme, which is useful when
marks need the shared palette or foreground tokens. A `theme` returned by that
same builder is merged afterward while the scene is created, so read an
application-supplied theme from the builder's captured values when it must use
those overrides.

Do not encode semantic status by reading the current theme in data
preparation. Keep meaning stable and choose theme-appropriate paint at render
time.

## Mark styling

Built-in marks expose the paint styles relevant to their geometry: fill, stroke,
opacity, widths, line caps, dashes, corner radius, and font properties. A style
can be fixed or data-driven where the mark's option accepts a visual channel.

Keep these responsibilities separate:

- scales map semantic values to visual values;
- mark options select and refine paint;
- the theme supplies shared defaults;
- application CSS controls the surrounding surface.

For categorical or quantitative color mapping, use the canonical
[Legends and Color](./legends-and-color.md) guide.

## Canvas styling

The Canvas renderer resolves scene paints such as `currentColor` and CSS
custom properties against the chart's computed environment. It inherits the
root font and repaints after relevant ancestor class, style, `data-theme`,
color-scheme, forced-colors, or viewport changes.

Rasterized scene nodes are not DOM descendants. A node's `className` therefore
cannot be targeted by a CSS selector after paint. Put data-dependent fill,
stroke, opacity, and font choices in mark options or the chart theme; use
container CSS for palette variables, inherited color, and typography.

## Gradients and clipping

Gradients are opt-in SVG resources. Declare them on the chart and render with
the resource-aware SVG renderer:

```ts
import { renderChartSvgWithResources } from '@tanstack/charts/svg/resources'

const definition = defineChart({
  marks,
  x,
  y,
  gradients: [
    {
      id: 'area-fill',
      x1: 0,
      y1: 1,
      x2: 0,
      y2: 0,
      stops: [
        { offset: 0, color: '#2563eb', opacity: 0.08 },
        { offset: 1, color: '#2563eb', opacity: 0.7 },
      ],
    },
  ],
})
```

Use `url(#area-fill)` as the mark paint and pass
`renderSvg: renderChartSvgWithResources` to the host or adapter. `idPrefix`
scopes resource and clip IDs when several charts share a document.

Set `clip: true` when marks should be clipped to the resolved plot rectangle.
Clipping is a geometry policy, not a substitute for correct scale domains.

Canvas consumes the same declared gradients and group clips without the
resource-aware SVG serializer. A Canvas gradient needs measurable node bounds;
path-only geometry with no point bounds should use an explicit paint instead.

<iframe
  src="https://tanstack.com/charts/catalog/embed/heatmap-labeled/?theme=system&height=480"
  title="Theme-aware labeled heatmap with a quantitative color legend"
  loading="lazy"
  style="width: 100%; height: 480px; border: 0;"
></iframe>

## HTML tooltip styling

The native tooltip is an HTML element inside the chart container by default.
Give it a class through `tooltip.className` and style that class in application
CSS:

```ts
import { tooltip } from '@tanstack/charts/tooltip'

const definition = defineChart(baseDefinition, {
  tooltip: { use: tooltip, className: 'revenue-tooltip' },
})
```

With the `portal` extension, the preferred manual-Popover path keeps the
element under the chart in the DOM, so inheritance and scoped selectors
continue to work. If Popover is unavailable or fails, the fixed fallback moves
the element under the chart's `ownerDocument` body. Use a document-level
selector for its class and put required fallback tokens on that class or a
shared document ancestor.

Every framework adapter can compose native application content with the
default rows. See [Tooltips and Focus](./tooltips-and-focus.md).

## Theme checklist

- Default charts inherit text color and respond to the application's color
  scheme.
- Palette CSS variables are scoped to the smallest useful container.
- Semantic status remains distinguishable without color alone.
- Explicit chart themes meet contrast requirements in every supported mode.
- Resource IDs use a stable `idPrefix` when charts share a document.
- A theme change does not recreate application data or lose focused state.
