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

Dynamic definitions receive the current `width` and `height`, so presentation can adapt to the chart container:

```ts
const chart = defineChart(({ width }) => ({
  marks: [lineY(rows, { x: 'date', y: 'value' })],
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
  x: { scale: xScale },
  y: { scale: yScale },
  margin: { left: 80 },
})
```

Here the left margin is exactly `80`; top, right, and bottom remain automatic.

`margin: 0` locks every side to zero:

```ts
const sparkline = defineChart({
  marks: [lineY(values)],
  guides: false,
  x: { scale: xScale },
  y: { scale: yScale },
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
  x: { scale: xScale },
  y: { scale: yScale },
})
```

Marks encode whether they materialize each positional dimension. Omit an unused
axis; for example, a `ruleY`-only chart needs `y` but no `x`. Explicit `null`
is accepted only for an unused dimension.

## Scale ranges and coordinate direction

Scale factories derive domains from marks. Configured D3 instances retain fixed
semantic domains. TanStack Charts supplies ranges from `scene.chart`.

For a normal cartesian chart:

- x increases from the left edge to the right edge.
- continuous y increases from the bottom edge to the top edge.
- a y band scale lays categories from top to bottom.

`reverse: true` flips the range. It does not reorder or mutate the source domain.

See [Scales and D3](./scales-and-d3.md) for the complete ownership boundary and pixel-to-value inversion.

## Non-cartesian coordinates

Polar and geographic marks resolve geometry from the same final
`scene.chart` bounds without materializing Cartesian x/y channels:

```ts
import { polar, radialArc } from '@tanstack/charts/polar'
import { geoShape } from '@tanstack/charts/geo'
```

`polar` copies configured angle and radius scales, assigns responsive angular
and radial ranges, and renders guide backgrounds, child marks, then guide
foregrounds around one resolved center. `geoShape` calls an
application-supplied D3 projection callback or fits a projection descriptor to
data, a sphere, or explicit geometry.

Both paths emit the same keyed scene nodes and interaction points as ordinary
marks. SVG rendering, DOM reconciliation, focus, export, and adapters do not
need a coordinate-system branch. Their outer chart omits `x` and `y`; no
Cartesian guides are created.

These capabilities stay behind separate package subpaths so their D3 geometry
does not enter a Cartesian consumer. See
[Polar and Radar Charts](../examples/polar-and-radar.md) and
[Maps and Spatial Charts](../examples/maps-and-spatial.md).

## Band alignment

A D3 band scale returns the start of a band. TanStack Charts centers the resolved positional value:

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

The D3 band scale’s `paddingInner` and `paddingOuter` determine category spacing. `inset` removes additional pixels from both bar edges after layout.

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

DOM pointer coordinates must first be converted into scene coordinates using the rendered SVG bounds. Native focus does this automatically. Application-owned brush and zoom gestures can use copied D3 scales to invert those scene coordinates.

## Clipping and overflow

`clip: true` clips marks to `scene.chart`. Guides and legends remain outside the clip:

```ts
const chart = defineChart({
  marks,
  x: { scale: xScale },
  y: { scale: yScale },
  clip: true,
})
```

Automatic margins only reserve space for chart-owned guides and legends. Application HTML overlays, external controls, and custom renderer chrome own their own layout.

## Complete horizontal ranking

```ts
import { scaleBand, scaleLinear } from 'd3-scale'
import { barX, defineChart, ruleX } from '@tanstack/charts'

interface MetroPopulation {
  Metro: string
  POP_2015: number
}

const citywages: readonly MetroPopulation[] = [
  { Metro: 'New York–Newark–Jersey City', POP_2015: 20_182_305 },
  { Metro: 'Los Angeles–Long Beach–Anaheim', POP_2015: 13_340_068 },
  { Metro: 'Chicago–Naperville–Elgin', POP_2015: 9_532_569 },
  { Metro: 'Dallas–Fort Worth–Arlington', POP_2015: 7_206_144 },
  { Metro: 'Houston–The Woodlands–Sugar Land', POP_2015: 6_656_947 },
  { Metro: 'Washington–Arlington–Alexandria', POP_2015: 6_097_684 },
  { Metro: 'Philadelphia–Camden–Wilmington', POP_2015: 6_069_875 },
  { Metro: 'Miami–Fort Lauderdale–West Palm Beach', POP_2015: 6_012_331 },
]

const rows = [...citywages]
  .sort((left, right) => right.POP_2015 - left.POP_2015)
  .slice(0, 8)

const compact = new Intl.NumberFormat(undefined, {
  notation: 'compact',
  maximumFractionDigits: 1,
})

const rankingChart = defineChart({
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
})
```

This source imports `d3-scale` directly, so install `d3-scale` and `@types/d3-scale` as direct dependencies.

<iframe
  src="https://tanstack.com/charts/catalog/embed/bar-horizontal-ranking/?theme=system&height=480"
  title="Metropolitan population ranking with long source labels and automatic axis margins"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

For responsive layout recipes, see [Responsive Charts](../guides/responsive-charts.md). For the exact shape of scenes and resolved bounds, see [Runtime and Scene Reference](../reference/runtime-and-scene.md).
