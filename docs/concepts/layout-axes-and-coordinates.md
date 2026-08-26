---
title: Layout, Axes, and Coordinates
description: Learn how responsive ranges, automatic margins, guides, band alignment, and scene coordinates work.
---

TanStack Charts gives as much space as possible to the plot while keeping chart-owned guides inside the surface. The normal path is container-responsive and uses automatic margins.

## Surface, margin, and plot rectangle

Every scene has three nested regions:

```text
surface: scene.width × scene.height
└─ automatic or explicit margins
   └─ plot rectangle: scene.chart
```

`scene.chart` contains:

```ts
interface ChartBounds {
  x: number
  y: number
  width: number
  height: number
}
```

Marks, grids, clipping, pointer focus, and copied scale ranges use this resolved plot rectangle.

## Container responsiveness

Omit `width` on the DOM host or framework adapter:

```tsx
<Chart
  definition={chart}
  height={360}
  initialWidth={640}
  ariaLabel="Monthly revenue"
/>
```

The host observes its container and coalesces width changes into an animation frame. `initialWidth` is used when a real width is not yet available and for deterministic server output.

Use `aspectRatio` when height should follow width:

```tsx
<Chart
  definition={chart}
  aspectRatio={16 / 9}
  initialWidth={640}
  ariaLabel="Monthly revenue"
/>
```

Set a fixed `width` only for an intentionally fixed graphic such as export, print, or email.

Responsive definitions receive the current `width` and `height`, so presentation can adapt to the chart container:

```ts
const chart = defineChart(({ width }) => ({
  marks: [lineY(rows, { x: 'date', y: 'value' })],
  scales: {
    x: {
      scale: xScale,
      axis: {
        ticks: { count: width < 420 ? 4 : 8 },
        tickLabels: { rotate: width < 520 ? -30 : undefined },
      },
    },
    y: {
      scale: yScale,
      axis: { label: width < 480 ? undefined : 'Weekly downloads' },
    },
  },
}))
```

## Automatic margins

Leave `margin` undefined for normal charts. The layout solver accounts for:

- Formatted tick-label width and height
- Rotated tick-label bounds
- First and last tick overhang
- Axis titles and their offsets
- Text-mark bounds, including anchors, pixel offsets, and rotation
- Current container font metrics
- Optional color legends

The solver may resolve scales and text-mark positions more than once, but marks
render once against the final plot rectangle. `clip: true` keeps the plot
boundary authoritative, so clipped text does not expand automatic margins.

Explicit margins lock only the sides you provide:

```ts
const chart = defineChart({
  marks,
  scales: {
    x: { scale: xScale },
    y: { scale: yScale },
  },

  margin: { left: 80 },
})
```

Here the left margin is exactly `80`; top, right, and bottom remain automatic.

`margin: 0` locks every side to zero:

```ts
const sparkline = defineChart({
  marks: [lineY(values)],
  guides: false,
  scales: {
    x: { scale: xScale },
    y: { scale: yScale },
  },

  margin: 0,
})
```

Use that combination for sparklines and intentionally chrome-free embedded graphics.

## Text measurement

Static scenes use deterministic text estimates. The DOM host and browser
framework adapters measure painted glyph bounds with the chart container's
inherited font and relayout after web fonts load.

Advanced renderers can supply `measureText`. Its metrics include painted x and y offsets relative to the requested anchor and baseline, not only width and height. This is necessary for correct containment of rotated and anchored labels.

Automatic margins contain chart-owned guides and Cartesian `text` marks. Axis
tick labels are thinned against their measured, optionally rotated bounds.
Explicit text placement remains responsible for data-label collisions.

## Axis guide options

Each axis combines a required scale factory or instance with optional guide controls:

```ts
const x = {
  scale: xScale,
  grid: false,
  axis: {
    ticks: {
      count: 6,
      format: (date: Date) => monthFormatter.format(date),
    },
    tickLabels: { rotate: -30 },
    label: { text: 'Month', offset: 12 },
  },
}
```

| Option            | Purpose                                              |
| ----------------- | ---------------------------------------------------- |
| `axis`            | Configure the axis or hide it with `false`           |
| `axis.line`       | Show or hide the baseline                            |
| `axis.ticks`      | Configure candidates, stubs, padding, and formatting |
| `axis.tickLabels` | Configure label rotation and collision thinning      |
| `axis.label`      | Configure the axis title and offset                  |
| `grid`            | Draw grid lines at semantic candidates               |
| `reverse`         | Reverse the responsive range                         |

The y grid defaults to visible and the x grid defaults to hidden when `grid` is omitted.

Candidate generation and label layout are separate. Choose at most one of
`axis.ticks.count`, `axis.ticks.spacing`, and `axis.ticks.values`. Grid lines
and tick stubs use the generated candidates; label thinning does not remove
either. `axis.ticks.size: 0` removes stubs while retaining labels and grid
lines.

Rotation and thinning are independent. Thinning is enabled by default and
uses measured rotated bounds:

```ts
const x = {
  scale: xScale,
  axis: {
    ticks: { spacing: 80 },
    tickLabels: {
      rotate: -35,
      thin: { minGap: 8, priority: 'ends', keep: importantDates },
    },
  },
}
```

Hard-kept labels are retained even when they collide. Values absent from the
candidate set add labels only.

Hide one guide without removing its scale:

```ts
const x = {
  scale: xScale,
  axis: false,
}
```

Hide every axis and grid while keeping scales for marks:

```ts
const chart = defineChart({
  marks,
  guides: false,
  scales: {
    x: { scale: xScale },
    y: { scale: yScale },
  },
})
```

Set a reserved scale to `null` only when no mark uses that dimension. For
example, a `ruleY`-only chart uses `scales: { x: null, y: { scale: yScale } }`.

## Multiple axes

Add a named scale when one coordinate system needs an independent mapping.
Declare whether it maps x or y, choose its axis side, then bind the relevant
mark to its ID:

```ts
const chart = defineChart({
  marks: [
    lineY(revenue, { x: 'date', y: 'value' }),
    lineY(margin, {
      x: 'date',
      y: 'percent',
      yScale: 'margin',
    }),
  ],
  scales: {
    x: { scale: dateScale },
    y: { scale: revenueScale, axis: { label: 'Revenue' } },
    margin: {
      channel: 'y',
      scale: marginScale,
      side: 'right',
      axis: { label: 'Margin' },
    },
  },
})
```

`xScale` and `yScale` bind marks to scale IDs, not axis IDs. Axes visualize the
scale registry entries. Multiple axes on one side stack outward and take part
in automatic margin measurement.

## Scale ranges and coordinate direction

Scale factories derive domains from marks. Configured instances retain fixed
semantic domains. TanStack Charts supplies ranges from `scene.chart`.

For a normal cartesian chart:

- x increases from the left edge to the right edge.
- continuous y increases from the bottom edge to the top edge.
- a y band scale lays categories from top to bottom.

`reverse: true` flips the range. It does not reorder or mutate the source domain.

See [Scales](./scales-and-d3.md) for scale selection, responsive ownership, and
pixel-to-value inversion.

## Continuous viewports

A continuous axis can present one semantic window of a larger content domain:

```ts
const x = {
  scale: scaleUtc().domain([historyStart, historyEnd]),
  viewport: {
    domain: [visibleStart, visibleEnd],
    translate: dragOffset,
  },
}
```

The configured or inferred scale domain describes the complete content.
`viewport.domain` is the committed semantic window used for mapping, axes, and
grid lines. `viewport.translate` is a transient output-space offset applied
after that mapping.

Viewport ownership is resolved for each mark and each axis. A mark that
materializes an active viewport axis is content on that axis by default. The
compiler gives each such mark its own plot-bounded clip layer and applies only
the translations for axes it owns. Axes and grid lines stay fixed. Marks that
do not depend on the translated axis also stay fixed, such as a frame or a
y-only annotation during an x drag. Custom marks can override either axis as
`'content'` or `'fixed'` through `InitializedMark.viewport`.

Marks, focus layers, interaction points, and tooltip anchors use the same
presented coordinates. `scene.points` retains every content point, including
off-window points, for rendering and diagnostics. The interaction host limits
pointer strategies and keyboard navigation to clipped content points whose
presented anchors are inside the plot clip. Points from marks with fixed
viewport ownership remain candidates outside the plot.
`viewportInteractionPoints(scene)` returns that subset without changing
`scene.points`.

Translation is expressed in screen-direction scene pixels: positive x moves
content right, negative x moves it left, positive y moves it down, and negative
y moves it up. Domain order and `reverse` do not change those directions.

This makes paged history one chart and one continuous line rather than a guide
chart overlaid with several plot charts. During a drag, keep the committed
domain fixed and update only `translate`. To settle one page, animate the
translation to one plot width, then update the semantic domain and reset the
translation to zero in the same application commit.

Viewport domains accept two distinct finite numbers or two distinct finite
Dates. The scale must be configured or inferable, continuous, invertible,
unclamped, and independently accept domain and range assignment. Band,
ordinal, quantize, clamped, and getter-only scales are rejected. An authored
`axis.viewport` cannot be applied to an opaque custom `ChartScale`; a custom
resolver can instead return a complete `ResolvedScale.viewport` that it owns.
A logarithmic content domain and viewport domain must contain finite, nonzero
numbers and remain on the same side of zero.

The resolved scale exposes both coordinate systems:

```ts
const { contentDomain, domain, translate, map } = scene.scales.x.viewport!
```

`scene.scales.x.map(value)` is the committed, untranslated coordinate used to
construct geometry. `viewport.map(value)` returns its presented coordinate.

## Non-cartesian coordinates

Polar and geographic marks resolve geometry from the same final
`scene.chart` bounds without materializing Cartesian x/y channels:

```ts
import { polar, radialArc } from '@tanstack/charts/polar'
import { geoShape } from '@tanstack/charts/geo'
```

`polar` copies entries from its own `scales` registry, assigns responsive
angular and radial ranges, and renders guide backgrounds, child marks, then
guide foregrounds around one resolved center. `geoShape` calls an
application-supplied D3 projection callback or fits a projection descriptor to
data, a sphere, or explicit geometry.

Both paths emit the same keyed scene nodes and interaction points as ordinary
marks. SVG rendering, DOM reconciliation, focus, export, and adapters do not
need a coordinate-system branch. Their outer chart uses
`scales: { x: null, y: null }`; no Cartesian guides are created.

These capabilities stay behind separate package subpaths so their D3 geometry
does not enter a Cartesian consumer. See
[Polar and Radar Charts](../examples/polar-and-radar.md) and
[Maps and Spatial Charts](../examples/maps-and-spatial.md).

## Band alignment

A band scale returns the start of a band. TanStack Charts centers the resolved positional value:

```text
band start ├──────── bandwidth ────────┤
                         ▲
                  mapped chart value
```

This gives bars, dots, text, ticks, and interaction points a shared categorical center.

Bars use the full primary bandwidth minus their `inset`:

```ts
barX(rows, {
  x: 'value',
  y: 'category',
  inset: 2,
})
```

The band scale's `paddingInner` and `paddingOuter` determine category spacing.
`inset` removes additional pixels from both bar edges after layout.

For side-by-side bars, `layout: group()` subdivides the primary bandwidth. See
[Bars and Rankings](../examples/bars-and-rankings.md).

## Scene and pointer coordinates

Scene nodes and `ChartPoint.x` and `ChartPoint.y` use absolute scene coordinates, including the margin offset.

Application overlays can align to the plot:

```ts
const scene = host.getScene()
const overlayStyle = {
  left: `${scene.chart.x}px`,
  top: `${scene.chart.y}px`,
  width: `${scene.chart.width}px`,
  height: `${scene.chart.height}px`,
}
```

DOM pointer coordinates must first be converted into scene coordinates using
the rendered surface bounds. Chart-owned focus and the first-party brush, cursor,
and zoom behaviors do this automatically against resolved scales. A custom
gesture can use the resolved scale's optional `invert` operation.

## Clipping and overflow

`clip: true` clips marks to `scene.chart`. Guides and legends remain outside the clip:

```ts
const chart = defineChart({
  marks,
  scales: {
    x: { scale: xScale },
    y: { scale: yScale },
  },

  clip: true,
})
```

Automatic margins only reserve space for chart-owned guides and legends. Application HTML overlays, external controls, and custom renderer chrome own their own layout.

## Complete horizontal ranking

```ts group=horizontal-ranking env=charts file=/src/chart.ts entry
import { barX, defineChart, ruleX } from '@tanstack/charts'
import { scaleBand } from '@tanstack/charts/scales/band'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { citywages } from './data'

const rows = [...citywages]
  .sort((left, right) => right.POP_2015 - left.POP_2015)
  .slice(0, 8)

const compact = new Intl.NumberFormat(undefined, {
  notation: 'compact',
  maximumFractionDigits: 1,
})

export default defineChart({
  marks: [
    ruleX([0], { stroke: '#94a3b8', strokeOpacity: 0.6 }),
    barX(rows, {
      x: 'POP_2015',
      y: 'Metro',
      fill: '#2563eb',
      inset: 2,
      radius: 3,
    }),
  ],
  scales: {
    x: {
      scale: scaleLinear,
      nice: true,
      grid: true,
      axis: {
        label: '2015 population',
        ticks: { format: (value) => compact.format(value) },
      },
    },
    y: {
      scale: () => scaleBand<string>().paddingInner(0.12).paddingOuter(0.06),
    },
  },
})
```

```ts group=horizontal-ranking file=/src/data.ts collapsed
export interface MetroPopulation {
  Metro: string
  POP_2015: number
}

export const citywages: readonly MetroPopulation[] = [
  { Metro: 'New York–Newark–Jersey City', POP_2015: 20_182_305 },
  { Metro: 'Los Angeles–Long Beach–Anaheim', POP_2015: 13_340_068 },
  { Metro: 'Chicago–Naperville–Elgin', POP_2015: 9_532_569 },
  { Metro: 'Dallas–Fort Worth–Arlington', POP_2015: 7_206_144 },
  { Metro: 'Houston–The Woodlands–Sugar Land', POP_2015: 6_656_947 },
  { Metro: 'Washington–Arlington–Alexandria', POP_2015: 6_097_684 },
  { Metro: 'Philadelphia–Camden–Wilmington', POP_2015: 6_069_875 },
  { Metro: 'Miami–Fort Lauderdale–West Palm Beach', POP_2015: 6_012_331 },
]
```

This chart needs only the lightweight linear and band scale entries.

For responsive layout recipes, see [Responsive Charts](../guides/responsive-charts.md). For the exact shape of scenes and resolved bounds, see [Runtime and Scene Reference](../reference/runtime-and-scene.md).
