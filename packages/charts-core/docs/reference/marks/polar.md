---
title: Polar Marks
description: Reference for the opt-in polar container, radial marks, guides, D3 scale factories, and D3-backed geometry.
---

Polar marks are available only from the capability subpath:

```ts
import {
  angleGrid,
  polar,
  radialArc,
  radialArea,
  radialDot,
  radialGrid,
  radialLine,
  radialRule,
  radialText,
} from '@tanstack/charts/polar'
```

`polar` resolves the responsive coordinate system. The exported `PolarMark`
and `PolarGuide` types are opaque composition contracts returned by the
built-in radial mark and guide constructors. Use them to type collections
passed to `polar`; do not implement their internal initialize or render
lifecycle. Guide backgrounds paint first, marks paint second, and guide
foregrounds paint last.

## `polar`

```ts
function polar(options: PolarOptions): ChartMark
```

| Option        | Type                    | Default       | Meaning                                         |
| ------------- | ----------------------- | ------------- | ----------------------------------------------- |
| `id`          | `string`                | Layer-derived | Stable container ID                             |
| `className`   | `string`                | None          | Class added beside `ts-chart__polar`            |
| `marks`       | `readonly PolarMark[]`  | Required      | Radial marks rendered in order                  |
| `guides`      | `readonly PolarGuide[]` | `[]`          | Background/foreground guide layers around marks |
| `angle`       | `PolarAngleOptions`     | None          | Angle factory or instance and optional wrapping |
| `radius`      | `PolarRadiusOptions`    | None          | Radius scale factory or instance                |
| `startAngle`  | `number`                | `0`           | Start of the available angular range in radians |
| `endAngle`    | `number`                | `2π`          | End of the available angular range in radians   |
| `inset`       | `number`                | `0`           | Pixels removed from the maximum centered radius |
| `radiusRatio` | `number`                | `1`           | Multiplier applied to the radius after inset    |

The default angular range is a complete circle. Angles use D3's radial
convention: zero is at twelve o'clock and positive values move clockwise.

`PolarAngleOptions` and `PolarRadiusOptions` accept D3 factories with
mark-inferred domains or configured instances with fixed domains. `nice`
applies after inference. TanStack supplies responsive ranges without mutating
an instance. An omitted `wrap` closes a complete revolution without adding a
duplicate semantic category, but preserves both endpoints of a partial range.
Set it explicitly to override that behavior.

`PolarLayoutContext` contains `chart`, `centerX`, `centerY`, `radius`,
`startAngle`, `endAngle`, and optional resolved angle/radius scales. Each
`PolarResolvedScale` exposes its semantic `domain`, responsive `map`, `ticks`,
and `bandwidth`. A `PolarLength` is either a pixel length or a callback of the
layout context. Use a callback for radii that must remain proportional during
resize.

The outer chart omits `x` and `y`. Cartesian axes do not participate in the
internal polar scales.

## `radialArc`

```ts
function radialArc<TDatum>(
  source: Iterable<TDatum>,
  options?: RadialArcOptions<TDatum>,
): PolarMark<TDatum>
```

`radialArc` renders one D3 arc per valid interval.

| Option            | Meaning                                                        |
| ----------------- | -------------------------------------------------------------- |
| `id`, `className` | Stable layer ID and optional class                             |
| `startAngle`      | Start-angle channel; defaults to datum `startAngle`            |
| `endAngle`        | End-angle channel; defaults to datum `endAngle`                |
| `padAngle`        | Padding-angle channel; defaults to datum `padAngle`, then zero |
| `innerRadius`     | `PolarLength`; defaults to zero                                |
| `outerRadius`     | `PolarLength`; defaults to the layout radius                   |
| `cornerRadius`    | D3 arc corner radius as a `PolarLength`                        |
| `padRadius`       | Explicit D3 arc padding radius as a `PolarLength`              |
| `generator`       | Responsive D3 arc factory for advanced per-datum geometry      |
| `key`             | Stable arc identity; defaults to top/nested `id`, then index   |
| `z`               | Geometry and interaction group                                 |
| `color`           | Color-scale value; defaults to `z`                             |
| `fill`            | Final constant or datum-derived paint override                 |
| `fillOpacity`     | Fill opacity                                                   |
| `stroke`          | Constant or datum-derived boundary stroke                      |
| `strokeOpacity`   | Boundary opacity                                               |
| `strokeWidth`     | Boundary width                                                 |
| `strokeDasharray` | Boundary dash array                                            |
| `opacity`         | Whole-arc opacity                                              |

Use `d3-shape`'s `pie` output directly: its `startAngle`, `endAngle`, and
`padAngle` fields are already the channels this mark needs. A pie, donut, and
gauge differ only in inner radius and angular interval.

`generator` replaces the default D3 arc configuration. Its factory receives
the final `PolarLayoutContext` and returns a D3 `Arc` whose accessors read the
original datum. Use it for per-datum rings such as a sunburst:

```ts
radialArc(nodes, {
  generator: ({ radius }) =>
    arc<SunburstNode>()
      .startAngle((node) => node.x0)
      .endAngle((node) => node.x1)
      .innerRadius((node) => node.y0 * radius)
      .outerRadius((node) => node.y1 * radius),
})
```

Keep the D3 generator context `null` so it returns SVG path data.

## `radialLine` and `radialArea`

```ts
function radialLine<TDatum>(
  source: Iterable<TDatum>,
  options?: RadialLineOptions<TDatum>,
): PolarMark<TDatum>

function radialArea<TDatum>(
  source: Iterable<TDatum>,
  options?: RadialAreaOptions<TDatum>,
): PolarMark<TDatum>
```

Both marks use `angle` and `radius` channels and accept `id`, `className`,
`key`, `z`, `color`, and a D3 curve factory. The channels default to row index
and a numeric datum. `color` contributes to the chart color scale and defaults
to `z`. When `z` is omitted, an authored `color` also partitions the paths.
When both are present, `z` remains the explicit geometry and interaction
group. `radialLine` accepts final stroke, dash, opacity, and optional `points`
styling. `radialArea` accepts final fill and stroke styling plus `radius1` for
an explicit inner scale value; `radius1` defaults to zero.

Their datum key defaults to a unique top-level or nested `data.id`, then a
unique angle within each effective path group, then row index.

Input order is path order. Use a closed D3 curve such as
`curveLinearClosed` for radar polygons. An explicit `z`, or `color` when `z`
is absent, creates one path per group. `radialArea` can carry its own stroke;
layer a closed `radialLine` only when the outline needs independent styling.

## `radialDot`

```ts
function radialDot<TDatum>(
  source: Iterable<TDatum>,
  options?: RadialDotOptions<TDatum>,
): PolarMark<TDatum>
```

`radialDot` uses the same angle/radius channel defaults. It also accepts `id`,
`className`, `key`, `z`, `color`, `r`, `rScale`, fill, stroke, and opacity styling.
Radius defaults to 3.5 pixels. Each valid datum emits one interaction point
with its original angle/radius values and projected screen position. Its key
defaults to a unique top-level or nested `data.id`, then row index.

## `radialText`

```ts
function radialText<TDatum>(
  source: Iterable<TDatum>,
  options?: RadialTextOptions<TDatum>,
): PolarMark<TDatum>
```

`radialText` maps `angle` and `radius` channels through the container's copied
polar scales, then positions labels with D3's radial point projection. It
accepts `text`, `key`, `z`, `color`, fill, font size and weight, anchor, baseline,
rotation, and pixel `dx`/`dy`. Use it for arc labels, donut-center values, and
gauge readouts without leaving the polar coordinate system. Its key defaults
to a unique top-level or nested `data.id`, then row index.

## `radialRule`

```ts
function radialRule<TDatum>(
  source: Iterable<TDatum>,
  options?: RadialRuleOptions<TDatum>,
): PolarMark
```

`radialRule` emits one radial segment per datum. `angle`, `radius1`, and
`radius2` are scale values; `radius1` defaults to zero. The mark also accepts
`key`, `z`, `color`, stroke, opacity, width, and dash styling. It covers gauge needles,
ticks, and pie-label leaders without expanding one logical segment into two
path rows. Its key defaults to a unique top-level or nested `data.id`, then a
unique angle within each `z` group, then row index.

## `radialGrid` and `angleGrid`

```ts
function radialGrid(options?: RadialGridOptions): PolarGuide
function angleGrid(options?: AngleGridOptions): PolarGuide
```

`radialGrid` draws radius values as circles or polygons. Supply explicit
`values`, or let `ticks` request values from the configured radius scale.
Labels are off by default. Label angle, offset, rotation, format, fill, and
font size are configurable.

`angleGrid` draws spokes for explicit `values` or the configured angle domain.
It can show labels around the circumference with `format` and `labelOffset`.
Labels are on by default. Both guides accept ID, class, stroke, opacity, width,
and dash styling.

Guide label position and orientation can be constants or callbacks through
`PolarGuideLabelOption`. Each callback receives a `PolarGuideLabelContext`
with the semantic `value`, `index`, angle, radius, local x/y position, and
complete layout. Use `labelAnchor`, `labelBaseline`, `labelDx`, `labelDy`, and
`labelRotate` without rebuilding the guide. `labelClassName` targets the label
group. Guides are decorative and emit no interaction points.

Every guide returns a `PolarGuideScene`:

```ts
interface PolarGuideScene {
  background: readonly SceneNode[]
  foreground?: readonly SceneNode[]
}
```

`polar` collects every guide background in declaration order, renders all
marks, then appends every optional foreground in the same guide order. The
built-in grids put rings and spokes in `background` and labels in
`foreground`, keeping labels legible without painting grid geometry over the
data.

The exported option contracts are `PolarOptions`, `RadialArcOptions`,
`RadialLineOptions`, `RadialAreaOptions`, `RadialDotOptions`,
`RadialTextOptions`, `RadialRuleOptions`, `RadialGridOptions`, and
`AngleGridOptions`. The coordinate contracts are `PolarAngleOptions`,
`PolarRadiusOptions`, `PolarResolvedScale`, `PolarLayoutContext`,
`PolarLength`, `PolarGuideLabelContext`, `PolarGuideLabelOption`, `PolarMark`,
`PolarGuide`, and `PolarGuideScene`. `PolarMark` and `PolarGuide` annotate
built-in constructor results rather than a supported custom-extension
boundary.

See [Polar and Radar Charts](../../examples/polar-and-radar.md) for pie,
donut, gauge, radar, numeric line, and numeric scatter compositions.
