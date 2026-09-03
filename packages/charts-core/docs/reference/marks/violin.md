---
title: Violin Marks
description: Reference for semantic violinY and violinX mirrored profile geometry, category-relative spans, curves, identity, and interaction.
---

`violinY` draws vertical mirrored profiles around categorical x centers.
`violinX` transposes the contract around categorical y centers.

```ts
import { violinY } from '@tanstack/charts/violin'

violinY(profileRows, {
  x: 'category',
  y: 'position',
  width: 'width',
  span: 0.8,
  color: 'category',
})
```

Both marks are also exported from `@tanstack/charts` and
`@tanstack/charts/universal`.

## Prepared profiles and summaries

The mark mirrors prepared normalized widths. It does not choose bins, estimate
a density, normalize values, or calculate summaries.

```ts
const bins = binY(rows, {
  value: 'body_mass_g',
  by: 'species',
  thresholds: massBoundaries,
  outputs: { count: { reduce: 'count' } },
})
const profiles = normalize(bins, {
  value: 'count',
  by: 'species',
  basis: 'max',
  as: 'width',
})
const summaries = groupBy(rows, {
  by: 'species',
  outputs: {
    median: { value: 'body_mass_g', reduce: median },
  },
})

defineChart({
  marks: [
    violinY(profiles, {
      x: 'species',
      y: 'y',
      width: 'width',
      span: 0.76,
      color: 'species',
      curve: d3AreaXCurve(curveBasis),
    }),
    tickY(summaries, {
      x: 'species',
      y: 'median',
      span: 0.36,
    }),
    dot(summaries, { x: 'species', y: 'median' }),
  ],
  scales: {
    x: {
      scale: scalePoint<string>().domain(species).padding(0.5),
    },
    y: { scale: scaleLinear },
  },
})
```

This example is a normalized histogram profile. A kernel density estimate can
feed the same mark, but its kernel and bandwidth remain data-preparation policy.

`width` must be finite and within `[0, 1]`. Nullish and nonfinite profile
positions or widths create gaps. Sort samples into the intended profile order
before passing them to the mark.

## Signatures

```ts
function violinY<TDatum>(
  source: Iterable<TDatum>,
  options: ViolinYOptions<TDatum>,
): ChartMark<TDatum>

function violinX<TDatum>(
  source: Iterable<TDatum>,
  options: ViolinXOptions<TDatum>,
): ChartMark<TDatum>
```

The profile position is numeric or temporal. The category is a numeric or
string `ChartKey`.

The public type surface includes `ViolinPosition`, `ViolinYCurve`,
`ViolinXCurve`, `ViolinYOptions`, and `ViolinXOptions`.

## Options

| Option                                            | Type                                       | Default          | Meaning                                                   |
| ------------------------------------------------- | ------------------------------------------ | ---------------- | --------------------------------------------------------- |
| `x`                                               | `Channel<TDatum, ChartKey?>`               | Required by Y    | Categorical center for `violinY`                          |
| `y`                                               | `Channel<TDatum, number \| Date?>`         | Required by Y    | Vertical profile position for `violinY`                   |
| `x`                                               | `Channel<TDatum, number \| Date?>`         | Required by X    | Horizontal profile position for `violinX`                 |
| `y`                                               | `Channel<TDatum, ChartKey?>`               | Required by X    | Categorical center for `violinX`                          |
| `width`                                           | `Channel<TDatum, number?>`                 | Required         | Normalized mirrored envelope width                        |
| `span`                                            | `number`                                   | `0.8`            | Full peak width in category-step units                    |
| `id`                                              | `string`                                   | Layer-derived    | Stable mark ID                                            |
| `key`                                             | `Channel<TDatum, ChartKey>`                | Inferred         | Stable profile-sample identity                            |
| `color`                                           | `Channel<TDatum, ChartKey?>`               | Category         | Value sent to the chart color scale                       |
| `fill`, `stroke`                                  | `VisualChannel<TDatum, string>`            | Resolved color   | Envelope paint; `stroke: null` omits the outline          |
| `fillOpacity`, `strokeOpacity`, and `strokeWidth` | `number`                                   | Renderer default | Envelope presentation                                     |
| `strokeDasharray`                                 | `string`                                   | None             | Outline dash pattern                                      |
| `curve`                                           | `ViolinYCurve` or `ViolinXCurve`           | Straight         | Orientation-specific renderer-neutral area path generator |
| `states`                                          | `readonly ChartMarkState[]`                | None             | Focus-driven area styles                                  |
| `motion`                                          | `ChartMarkMotionOptions<TDatum>['motion']` | None             | Keyed envelope motion policy                              |

`span` must be positive and finite. `span: 1` makes a peak one complete
category step wide. Values above `1` can overlap adjacent categories.

Use `d3AreaXCurve(curveBasis)` for a curved `violinY`. Use
`d3Curve(curveBasis)` for a curved `violinX`.

## Category scale, identity, and interaction

The categorical axis must resolve to a point or band scale. Width uses the
smallest step in the complete configured domain, including categories without
profile rows. A single-category profile uses a bounded plot-relative fallback.

Each valid sample contributes one interaction point at its semantic category
center even though the envelope has two painted boundaries. The point retains
the exact source datum and index. `violinY` reports the category as `xValue`
and profile position as `yValue`; `violinX` transposes them. Use an explicit
`key` when positions repeat within a category.
