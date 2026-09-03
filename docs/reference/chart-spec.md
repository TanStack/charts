---
title: Chart Spec
description: Reference for marks, axes, color, gradients, clipping, margins, guides, and themes in a TanStack Charts spec.
---

Every static definition and responsive chart builder resolves to a `ChartSpec`.
The spec owns chart composition, scale factories or fixed scale instances, and
presentation.

```ts
type ChartSpec<TMarks extends readonly ChartMark[]> = {
  marks: TMarks
  scales: ChartScales<TMarks>
  guides?: boolean
  color?: ChartColorOptions
  gradients?: readonly ChartLinearGradient[]
  clip?: boolean
  margin?: number | Partial<ChartMargin>
  theme?: Partial<ChartTheme>
}

type ChartScales<TMarks extends readonly ChartMark[]> = Readonly<
  Record<string, ChartPositionScaleOptions | null>
> & {
  x: ChartPositionScaleOptions | null
  y: ChartPositionScaleOptions | null
}
```

## Properties

| Property    | Required | Meaning                                                                                                            |
| ----------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| `marks`     | Yes      | Ordered mark layers. Later scene nodes paint after earlier ones.                                                   |
| `scales`    | Yes      | Cartesian scale registry. Reserved `x` and `y` entries are required; additional named scales are optional.         |
| `guides`    | No       | Set to `false` to suppress both axes, grid lines, titles, and their implicit margins.                              |
| `color`     | No       | Shared categorical or quantitative color scale and optional legend.                                                |
| `gradients` | No       | Linear-gradient resources consumed by the default SVG and Canvas renderers.                                        |
| `clip`      | No       | Clips the marks group to the resolved inner chart bounds in the default SVG and Canvas renderers.                  |
| `margin`    | No       | Locks all margins with a number or selected sides with a partial object. Omitted sides are measured automatically. |
| `theme`     | No       | Overrides default foreground, muted, grid, background, or palette tokens.                                          |

The detailed option contracts live in
[Scales, guides, and color](./scales-guides-and-color.md). Mark-specific
channels and defaults live in the [mark reference](./index.md#mark-reference).

## Marks and layer order

`marks` is the grammar's composition unit:

```ts
import { areaY, defineChart, lineY, ruleY } from '@tanstack/charts'
import { scaleUtc } from 'd3-scale'
import { scaleLinear } from '@tanstack/charts/scales/linear'

const definition = defineChart({
  marks: [
    areaY(rows, { x: 'date', y: 'value', fillOpacity: 0.12 }),
    ruleY([target], {
      stroke: '#dc2626',
      strokeWidth: 1.5,
      strokeDasharray: '4 2',
    }),
    lineY(rows, { x: 'date', y: 'value', points: true }),
  ],
  scales: {
    x: { scale: scaleUtc },
    y: { scale: scaleLinear, grid: true },
  },
})
```

Each mark materializes channels for scale resolution, then emits renderer-
neutral scene nodes and optional interaction points. Marks may use different
datum types in the same spec. Their inferred datum types become a union in
interaction callbacks.

A data-less `crosshair` emits only transient focus-guide presentation. Place it
before the first ordinary mark for an underlay or after ordinary marks for an
overlay; it contributes no scale domain values or interaction points.

Built-in marks infer stable keys from a unique primitive top-level `id`, nested
`data.id`, or mark-owned positional candidate. Supply `key` when none is
unique. Mark IDs default from layer order; set `id` explicitly when a mark
must retain identity while its order changes.

Built-in Cartesian, radial, and composite marks accept an optional
`renderer`. Passing `canvasChartRenderer` opts that mark into Canvas while
marks without the option, including ordinary axes and guides, keep the host
renderer. The host groups adjacent runs without changing declaration order.
See [Mark-level renderers](./rendering-and-export.md#mark-level-renderers).

## Required positional scales

`scales.x` and `scales.y` are required. Supply a compatible factory for an
inferred domain or a configured instance for a fixed domain:

```ts
const scales = {
  x: { scale: scaleUtc },
  y: { scale: scaleLinear },
}
```

Use `null` for an unused dimension:

```ts
const horizontalThresholds = defineChart({
  marks: [ruleY([25, 50, 75])],
  scales: {
    x: null,
    y: { scale: scaleLinear().domain([0, 100]) },
  },
})
```

`axis: false` hides an axis but does not remove its scale. A `null` entry says
that the scale does not exist. Scene compilation rejects a mark bound to a
missing scale.

Additional entries name independent mappings. Each named entry declares its
`channel`, and marks opt into it with `xScale` or `yScale`. See
[Named scales and multiple axes](./scales-guides-and-color.md#named-scales-and-multiple-axes).

## Guides and margins

Guide visibility and geometry are separate:

- `scales.x.axis: false` or `scales.y.axis: false` hides one axis.
- `guides: false` hides all guides and removes their implicit margin.
- Omitted `margin` sides are measured from ticks, rotation, titles, edge
  overhang, color legends, and Cartesian `text` marks.
- `margin: 0` locks every side to zero.
- `margin: { left: 80 }` locks only the left side.

Automatic margins contain guide and text-mark labels unless the side is locked
or the plot is clipped; they do not choose a collision policy. Control dense
guide labels with the scale's tick behavior, `ticks`, `format`, or
`tickRotate`.

## Clip and gradient resources

`clip` and `gradients` are scene data consumed by the default SVG and Canvas
renderers:

```ts
const definition = defineChart({
  marks,
  scales: { x, y },
  clip: true,
  gradients: [
    {
      id: 'revenue',
      y1: 1,
      y2: 0,
      stops: [
        { offset: 0, color: '#2563eb', opacity: 0.08 },
        { offset: 1, color: '#2563eb', opacity: 0.72 },
      ],
    },
  ],
})
```

Reference a declared gradient from a mark paint as `url(#revenue)`.
`idPrefix` scopes generated resource IDs when multiple charts share a
document. See
[Rendering and export](./rendering-and-export.md).

## Theme

The complete default theme is exported as `defaultChartTheme`:

```ts
interface ChartTheme {
  foreground: string
  muted: string
  grid: string
  background: string
  palette: readonly string[]
}
```

`theme` is partial. The palette is replaced as one value rather than merged by
index. The default palette uses CSS custom-property fallbacks:

```css
.dashboard {
  --ts-chart-1: #38bdf8;
  --ts-chart-2: #fb7185;
  --ts-chart-3: #4ade80;
}
```

Because the default foreground and guide colors use `currentColor`, charts
inherit light and dark mode without a JavaScript theme switch. Override theme
tokens when the application needs an explicit visual system.
