---
title: Polar Marks
description: Reference for the opt-in polar container, radial marks, guides, injected scale factories, and D3-backed geometry.
---

Polar marks are available only from the capability subpath:

```ts
import {
  angleGrid,
  focusGroupAngle,
  pie,
  polar,
  radialArc,
  radialArea,
  radialBarAngle,
  radialBarRadius,
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

| Option        | Type                    | Default       | Meaning                                          |
| ------------- | ----------------------- | ------------- | ------------------------------------------------ |
| `id`          | `string`                | Layer-derived | Stable container ID                              |
| `className`   | `string`                | None          | Class added beside `ts-chart__polar`             |
| `marks`       | `readonly PolarMark[]`  | Required      | Radial marks rendered in order                   |
| `guides`      | `readonly PolarGuide[]` | `[]`          | Background/foreground guide layers around marks  |
| `angle`       | `PolarAngleOptions`     | None          | Angle factory or instance and optional wrapping  |
| `radius`      | `PolarRadiusOptions`    | None          | Radius scale and optional responsive pixel range |
| `startAngle`  | `number`                | `0`           | Start of the available angular range in radians  |
| `endAngle`    | `number`                | `2π`          | End of the available angular range in radians    |
| `inset`       | `number`                | `0`           | Pixels removed from the maximum centered radius  |
| `radiusRatio` | `number`                | `1`           | Multiplier applied to the radius after inset     |

The default angular range is a complete circle. Angles use D3's radial
convention: zero is at twelve o'clock and positive values move clockwise.

`PolarAngleOptions` and `PolarRadiusOptions` accept compatible factories with
mark-inferred domains or configured instances with fixed domains. `nice`
applies after inference. TanStack supplies responsive ranges without mutating
an instance. An omitted `wrap` closes a complete revolution without adding a
duplicate semantic category, but preserves both endpoints of a partial range.
Set it explicitly to override that behavior.

`PolarRadiusOptions.range` overrides the default `[0, radius]` pixel range on
the copied radius scale. Each endpoint is a nonnegative pixel length or a
`PolarLength` callback, so concentric layouts can resolve physical ranges from
the final radius:

```ts
const radiusOptions = {
  scale: scaleLinear().domain([0, maximum]),
  range: [({ radius }) => radius * 0.2, ({ radius }) => radius],
}
```

The range is re-resolved on resize and never mutates the authored D3 scale.

`PolarLayoutContext` contains `chart`, `centerX`, `centerY`, `radius`,
`startAngle`, `endAngle`, and optional resolved angle/radius scales. Each
`PolarResolvedScale` exposes its semantic `domain`, responsive `map`, `ticks`,
and `bandwidth`. A `PolarLength` is either a pixel length or a callback of the
layout context. Use a callback for radii that must remain proportional during
resize.

The outer chart omits `x` and `y`. Cartesian axes do not participate in the
internal polar scales.

## `focusGroupAngle`

```ts
import { defineChart, type ChartDefinition } from '@tanstack/charts'
import { focusGroupAngle } from '@tanstack/charts/polar'
import { tooltip } from '@tanstack/charts/tooltip'

declare const definition: ChartDefinition

const interactiveDefinition = defineChart(definition, {
  focus: focusGroupAngle,
  tooltip,
})
```

`focusGroupAngle` is the polar equivalent of `group-x`. Pointer resolution
uses the nearest radial ray instead of the nearest point anchor, then returns
one point per series with the same semantic angle value. The closest radius is
primary. Keyboard navigation visits one representative per angle in angular
order. `maxFocusDistance` is the scene-pixel distance from the pointer to the
ray; set it to `Number.POSITIVE_INFINITY` for continuous angular snapping.

## `pie`

```ts
function pie<TDatum extends object>(
  source: Iterable<TDatum>,
  options: PieOptions<TDatum>,
): PieDatum<TDatum>[]
```

`pie` eagerly allocates a nonnegative value channel into angle intervals. It
does not render geometry or depend on chart dimensions.

| Option       | Type                      | Default     | Meaning                                      |
| ------------ | ------------------------- | ----------- | -------------------------------------------- |
| `value`      | `TransformValue<number>`  | Required    | Nonnegative value allocated to each interval |
| `orderBy`    | `TransformValue`          | None        | Explicit angular ordering value              |
| `order`      | `ascending \| descending` | `ascending` | Direction applied to `orderBy`               |
| `startAngle` | `number`                  | `0`         | Overall start angle in radians               |
| `endAngle`   | `number`                  | `2π`        | Overall end angle in radians                 |
| `gapAngle`   | `number`                  | `0`         | Direct empty angle between visible slices    |

Output rows remain in source order. `index` records angular order, `value` is
the resolved finite value, `fraction` is its share of the positive total, and
`startAngle`, `endAngle`, and `angle` are the visible interval and midpoint.
Each row also carries direct `source` and `sourceIndexes` lineage. Missing or
non-finite values are omitted, zero is retained, and negative values fail.

`gapAngle` is radius-independent. A complete revolution includes a seam gap;
a partial range uses only internal gaps and preserves both authored endpoints.
The output `padAngle` is intentionally `0` compatibility metadata so the
default `radialArc` accessors do not pad an already-gapped interval a second
time. Use the mark's `padAngle` and `padRadius` only when D3's radius-dependent
arc padding is wanted instead.

The derived fields `value`, `index`, `fraction`, `startAngle`, `endAngle`,
`angle`, `padAngle`, `source`, and `sourceIndexes` overwrite source fields with
the same names. Stable identity is not synthesized; preserve a semantic source
field and pass it to the consuming mark's `key` channel.

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

Each arc attaches its sampled painted boundary to its interaction point.
Default nearest focus therefore follows the visible slice, including holes,
rounded corners, reversed sweeps, and custom D3 generators, instead of using
only the centroid anchor.

Use the native `pie` transform for flat typed rows with source lineage. D3
`pie` output remains valid interoperability input because its `startAngle`,
`endAngle`, and `padAngle` fields are also the channels this mark needs. A pie,
donut, and gauge differ only in inner radius and angular interval.

`generator` replaces the default D3 arc configuration for bespoke per-datum
geometry. Its factory receives the final `PolarLayoutContext`; keep the D3
generator context `null` so it returns SVG path data. Standard hierarchy
partitioning belongs to the optional
[`sunburst`](./sunburst.md) mark, which accepts flat source rows and preserves
their lineage.

## `radialBarRadius` and `radialBarAngle`

```ts
function radialBarRadius<TDatum>(
  source: Iterable<TDatum>,
  options?: RadialBarRadiusOptions<TDatum>,
): PolarMark<TDatum>

function radialBarAngle<TDatum>(
  source: Iterable<TDatum>,
  options?: RadialBarAngleOptions<TDatum>,
): PolarMark<TDatum>
```

The two radial-bar marks transpose ordinary bar semantics across polar axes.
`radialBarRadius` uses an angle band and a quantitative radius interval;
`radialBarAngle` uses a radius band and a quantitative angle interval. The
categorical scale must have positive bandwidth. Configure spacing through the
D3 band scale's inner and outer padding.

| Mark              | Categorical channel             | Quantitative interval                                                   |
| ----------------- | ------------------------------- | ----------------------------------------------------------------------- |
| `radialBarRadius` | `angle`; defaults to row index  | `radius` is shorthand for `radius2`; `radius1` is the optional baseline |
| `radialBarAngle`  | `radius`; defaults to row index | `angle` is shorthand for `angle2`; `angle1` is the optional baseline    |

An omitted `radialBarRadius.radius1` starts at physical radius zero, even when
`PolarRadiusOptions.range` maps semantic zero to an inner offset. An explicit
`radius1` is mapped through the radius scale. An omitted
`radialBarAngle.angle1` is semantic zero and is mapped through the angle scale.
Use the implicit physical-center radius baseline for nonnegative magnitudes.
For signed values or true radial intervals, set `radius1: 0` (or another
semantic baseline) so both endpoints map through the configured scale.

Both marks accept `id`, `className`, `key`, `z`, `color`, `fill`, fill opacity,
stroke styling, opacity, and motion. `cornerRadius` accepts a `PolarLength` or
`"full"`; the latter resolves to half the bar's radial thickness. Each valid
bar emits one geometry-backed interaction point at its quantitative endpoint
and preserves its interval endpoints for focus and tooltip formatting.

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
rotation, and pixel `dx`/`dy`. `radiusOffset` is a signed constant or per-datum
visual channel applied in pixels after the semantic radius is mapped. It does
not contribute to the radius domain. Set `anchor: "outside"` to resolve
`start`, `middle`, or `end` from the final mapped angle. Exact and near-exact
top and bottom angles use `middle`. A nonfinite resolved offset omits that
label and its interaction point.

Use it for arc labels, donut-center values, and gauge readouts without leaving
the polar coordinate system. Its interaction point follows the final radial
offset plus `dx`/`dy` while retaining the original semantic radius value. Its
key defaults to a unique top-level or nested `data.id`, then row index.

## `radialRule`

```ts
function radialRule<TDatum>(
  source: Iterable<TDatum>,
  options?: RadialRuleOptions<TDatum>,
): PolarMark
```

`radialRule` emits one radial segment per datum. `angle`, `radius1`, and
`radius2` are scale values; `radius1` defaults to zero. The mark also accepts
`radius1Offset` and `radius2Offset` as signed constant or per-datum pixel
visual channels applied after the corresponding semantic radius is mapped.
Offsets never contribute to radius-domain inference. A nonfinite resolved
endpoint offset omits that segment. The mark also accepts `key`, `z`, `color`,
stroke, opacity, width, and dash styling. It covers gauge needles, ticks, and
pie-label leaders without expanding one logical segment into two path rows.
Rules remain decorative and emit no interaction points. Its key defaults to a
unique top-level or nested `data.id`, then a unique angle within each `z`
group, then row index.

Pixel offsets do not reserve space outside the polar radius. Use
`radiusRatio`, `inset`, or chart margins when labels or leaders must remain
inside the chart surface.

## `radialGrid` and `angleGrid`

```ts
function radialGrid(options?: RadialGridOptions): PolarGuide
function angleGrid(options?: AngleGridOptions): PolarGuide
```

`radialGrid` draws radius values as circles or polygons. Supply explicit
`values`, or let `ticks` request values from the configured radius scale.
Labels are off by default. Label angle, offset, rotation, format, fill, and
font size are configurable. Ring `fill` and `fillOpacity` can layer filled
circle or polygon grids behind the chart marks.

`angleGrid` draws spokes for explicit `values` or the configured angle domain.
It can show labels around the circumference with `format` and `labelOffset`.
Labels are on by default and use the same outside-anchor rule as
`radialText({ anchor: "outside" })` unless `labelAnchor` is supplied. Both
guides accept ID, class, stroke, opacity, width, and dash styling.

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
`RadialBarRadiusOptions`, `RadialBarAngleOptions`, `RadialLineOptions`,
`RadialAreaOptions`, `RadialDotOptions`, `RadialTextOptions`,
`RadialRuleOptions`, `RadialGridOptions`, and `AngleGridOptions`. The coordinate contracts are `PolarAngleOptions`,
`PolarRadiusOptions`, `PolarResolvedScale`, `PolarLayoutContext`,
`PolarLength`, `PolarGuideLabelContext`, `PolarGuideLabelOption`, `PolarMark`,
`PolarGuide`, and `PolarGuideScene`. `PolarMark` and `PolarGuide` annotate
built-in constructor results rather than a supported custom-extension
boundary.

See [Polar and Radar Charts](../../examples/polar-and-radar.md) for pie,
donut, gauge, radar, radial bar, numeric line, and numeric scatter
compositions.
