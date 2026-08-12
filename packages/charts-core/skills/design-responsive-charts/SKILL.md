---
name: design-responsive-charts
description: >
  Make TanStack Charts adapt to measured containers, information priority,
  guide margins, SSR initial width, and final plot bounds. Load for narrow
  dashboards, overflow, label density, responsive topology, or pixel-space
  layouts.
metadata:
  type: core
  library: '@tanstack/charts'
  library_version: '0.9.0'
sources:
  - 'TanStack/charts:docs/guides/responsive-charts.md'
  - 'TanStack/charts:docs/reference/chart-definitions.md'
  - 'TanStack/charts:docs/reference/marks/waffle.md'
  - 'TanStack/charts:docs/reference/marks/treemap.md'
---

# Design Responsive Charts

Use **trigger → inspect → decide → build → verify**. Adapt to the chart container and information priority; do not equate responsive design with stretching geometry.

## Setup

Omit host width, choose height deliberately, and use the responsive definition only for surface-dependent decisions:

```ts
import { barX, defineChart, mountChart } from '@tanstack/charts'
import { scaleBand } from '@tanstack/charts/scales/band'
import { scaleLinear } from '@tanstack/charts/scales/linear'

const rows = [
  { feature: 'Account recovery', requests: 128 },
  { feature: 'Saved searches', requests: 95 },
  { feature: 'Audit export', requests: 72 },
]

const definition = defineChart(({ width }) => ({
  marks: [barX(rows, { x: 'requests', y: 'feature' })],
  x: {
    scale: scaleLinear,
    nice: true,
    axis: { ticks: { count: width < 420 ? 3 : 6 } },
  },
  y: { scale: () => scaleBand<string>().padding(0.1) },
}))

const element = document.querySelector<HTMLElement>('#feature-chart')
if (!element) throw new Error('Missing #feature-chart')

export const host = mountChart(element, {
  definition,
  height: 320,
  initialWidth: 640,
  ariaLabel: 'Weekly feature requests',
})
```

The container's grid or flex item must be allowed to shrink, usually with `min-width: 0`.

## Core Patterns

### Adapt information in priority order

At narrower containers:

1. Reduce tick candidates and optional annotations.
2. Thin, abbreviate, rotate, or directly label essential values.
3. Change orientation or facet layout without changing metric semantics.
4. Aggregate only when the question remains valid.
5. Replace the chart with a focused summary or accessible table when the comparison no longer fits.

Keep domains, thresholds, units, and category-color assignments stable when readers compare the same chart across sizes.

### Distinguish surface bounds from plot bounds

The responsive builder receives full surface `width` and `height`. Axes, legends, and measured text later determine `scene.chart`, the final inner plot. Use:

- responsive builder context for surface breakpoints and representation choice;
- custom-mark render bounds for plot-space geometry;
- `host.getScene().chart` for application overlays after render.

Do not duplicate margin math in application code.

### Treat topology as responsive state

Waffle packing, treemaps, Sankey columns, facets, Delaunay links, hexbins, density contours, and label fit can change membership or arrangement when final bounds change. Verify semantic keys and interaction state after topology changes, not only node dimensions.

### Use deterministic initial geometry

Supply the same `initialWidth` for equivalent server renders. The client adopts the measured container width after hydration. Use fixed `width` only for exports, benchmarks, or another application-owned frame.

## Common Mistakes

### CRITICAL Adapting to viewport width

Wrong:

```ts
const compact = window.innerWidth < 640
```

Correct:

```ts
defineChart(({ width }) => ({
  marks,
  x: {
    scale: scaleLinear,
    axis: { ticks: { count: width < 420 ? 4 : 8 } },
  },
}))
```

Dashboard panels and embeds can be narrow inside a wide viewport.

Source: `docs/guides/responsive-charts.md`

### CRITICAL Using surface width as plot width

Wrong: compute bins, collisions, or overlay positions directly from responsive builder width.

Correct: perform exact pixel work from resolved custom-mark bounds or `scene.chart`.

Guides and legends reduce the final plot after the builder returns.

Source: `API-FRICTION.md` F-116, F-219; `docs/guides/responsive-charts.md`

### HIGH Assuming resize only stretches geometry

Wrong: preserve old treemap, facet, waffle, Delaunay, hexbin, or label topology and scale its pixels.

Correct: let the owning resolved-layout primitive recompute from final bounds and preserve semantic keys through the change.

Many final-pixel layouts change topology, not only size.

Source: waffle, treemap, Delaunay, and hexbin mark references

### HIGH Using fixed width for application charts

Wrong:

```ts
mountChart(element, { definition, width: 640, height: 320, ariaLabel })
```

Correct:

```ts
mountChart(element, {
  definition,
  height: 320,
  initialWidth: 640,
  ariaLabel,
})
```

Fixed width opts out of container measurement; missing `initialWidth` or shrink constraints causes different SSR or overflow failures.

Source: `docs/guides/responsive-charts.md`; `API-FRICTION.md` F-111

### CRITICAL Assigning positional pixel ranges

Wrong:

```ts
x: {
  scale: scaleLinear().range([0, 640])
}
```

Correct:

```ts
x: {
  scale: scaleLinear
}
```

The range must follow the final plot after container measurement and guide margins resolve.

Source: `API-FRICTION.md` F-002; `docs/concepts/scales-and-d3.md`

### HIGH Treating containment as collision avoidance

Wrong: expect automatic margins to make every long tick label readable.

Correct: choose responsive candidate spacing, thinning, rotation, abbreviation, or a different composition.

Margins contain guides inside the surface; they do not resolve every label-label collision.

Source: `API-FRICTION.md` F-023, F-160; `docs/guides/responsive-charts.md`

### HIGH Tension: responsive adaptation versus comparison stability

Reduce guide density and change composition without silently changing what position, color, or a threshold means.

See also: `configure-scales-guides-color/SKILL.md` § Common Mistakes

### HIGH Tension: motion continuity versus current-state correctness

Responsive relayout should commit immediately by default. Animating every observed resize can leave geometry behind the actual panel size and repeatedly interrupt transitions.

See also: `update-and-animate-charts/SKILL.md` and `debug-and-verify-charts/SKILL.md`

See also: `ship-accessible-charts/SKILL.md` and `update-and-animate-charts/SKILL.md` — initial size, label priority, and resize policy affect hydration, accessibility, and motion.
