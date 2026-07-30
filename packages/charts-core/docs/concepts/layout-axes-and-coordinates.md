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
  marks: [lineY(rows, { x: 'date', y: 'value', key: 'id' })],
  x: {
    scale: xScale,
    ticks: width < 420 ? 4 : 8,
    tickRotate: width < 520 ? -30 : undefined,
  },
  y: {
    scale: yScale,
    label: width < 480 ? undefined : 'Weekly downloads',
  },
}))
```

## Automatic margins

Leave `margin` undefined for normal charts. The layout solver accounts for:

- Formatted tick-label width and height
- Rotated tick-label bounds
- First and last tick overhang
- Axis titles and their offsets
- Current container font metrics
- Optional color legends

The solver may resolve guide scales more than once, but marks render once against the final plot rectangle.

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

Automatic margins guarantee containment, not collision avoidance between adjacent tick labels. Use `ticks` to reduce density and `tickRotate` when labels still overlap.

## Axis guide options

Each axis combines a required configured scale with optional guide controls:

```ts
const x = {
  scale: xScale,
  label: 'Month',
  ticks: 6,
  format: (date: Date) => monthFormatter.format(date),
  tickRotate: -30,
  labelOffset: 12,
  grid: false,
}
```

| Option        | Purpose                                            |
| ------------- | -------------------------------------------------- |
| `guide`       | Show or hide this axis, its title, ticks, and grid |
| `ticks`       | Suggested tick count                               |
| `format`      | Format a typed tick value                          |
| `grid`        | Draw grid lines at ticks                           |
| `label`       | Axis title                                         |
| `reverse`     | Reverse the responsive range                       |
| `tickRotate`  | Rotate tick labels in degrees                      |
| `labelOffset` | Add distance between the axis and title            |

The y grid defaults to visible and the x grid defaults to hidden when `grid` is omitted.

Hide one guide without removing its scale:

```ts
const x = {
  scale: xScale,
  guide: false,
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

Set an axis to `null` only when no mark needs that dimension.

## Scale ranges and coordinate direction

Your configured D3 positional scales own semantic domains. TanStack Charts copies them and supplies ranges from `scene.chart`.

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
application-supplied D3 projection factory with the final plot bounds.

Both paths emit the same keyed scene nodes and interaction points as ordinary
marks. SVG rendering, DOM reconciliation, focus, export, and adapters do not
need a coordinate-system branch. Their outer chart uses `x: null`, `y: null`,
and `guides: false`.

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

For side-by-side bars, `groupScale` subdivides the primary bandwidth. See [Bars and Rankings](../examples/bars-and-rankings.md).

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

interface PackageRow {
  id: string
  package: string
  downloads: number
}

const rows: readonly PackageRow[] = [
  { id: 'router', package: '@tanstack/router', downloads: 4_820_000 },
  { id: 'query', package: '@tanstack/query', downloads: 8_650_000 },
  { id: 'table', package: '@tanstack/table', downloads: 3_470_000 },
  { id: 'virtual', package: '@tanstack/virtual', downloads: 1_940_000 },
]

const maximum = Math.max(0, ...rows.map((row) => row.downloads))
const compact = new Intl.NumberFormat(undefined, {
  notation: 'compact',
  maximumFractionDigits: 1,
})

const rankingChart = defineChart({
  marks: [
    ruleX([0], { stroke: '#94a3b8', strokeOpacity: 0.6 }),
    barX(rows, {
      x: 'downloads',
      y: 'package',
      key: 'id',
      fill: '#2563eb',
      inset: 2,
      radius: 3,
    }),
  ],
  x: {
    scale: scaleLinear().domain([0, maximum]).nice(),
    label: 'Weekly downloads',
    format: (value) => compact.format(value),
    grid: true,
  },
  y: {
    scale: scaleBand<string>()
      .domain(rows.map((row) => row.package))
      .paddingInner(0.12)
      .paddingOuter(0.06),
  },
})
```

This source imports `d3-scale` directly, so install `d3-scale` and `@types/d3-scale` as direct dependencies.

<iframe
  src="https://tanstack.com/charts/catalog/embed/bar-horizontal-ranking/?theme=system&height=400"
  title="Responsive horizontal package ranking with automatic axis margins"
  loading="lazy"
  width="100%"
  height="400"
  style="width:100%;height:400px;border:0;"
></iframe>

For responsive layout recipes, see [Responsive Charts](../guides/responsive-charts.md). For the exact shape of scenes and resolved bounds, see [Runtime and Scene Reference](../reference/runtime-and-scene.md).
