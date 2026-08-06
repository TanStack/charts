---
title: Ridgeline Marks
description: Reference for semantic ridgelineY and ridgelineX profile geometry, categorical baselines, overlap, curves, identity, and interaction.
---

`ridgelineY` draws horizontal profiles above categorical y baselines.
`ridgelineX` transposes the contract and extends vertical profiles to the right
of categorical x baselines.

```ts
import { ridgelineY } from '@tanstack/charts/ridgeline'

const mark = ridgelineY(profileRows, {
  x: 'x',
  y: 'category',
  height: 'height',
  overlap: 0.8,
  color: 'category',
})
```

Both marks are also exported from `@tanstack/charts` and
`@tanstack/charts/universal`.

## Prepared profiles

The mark lays out prepared profile samples. It does not bin observations,
estimate a density, or normalize values. Keep those decisions visible with
transforms or application data preparation.

```ts
const bins = binX(rows, {
  value: 'rating',
  by: 'season',
  thresholds: boundaries,
  outputs: { count: { reduce: 'count' } },
})
const profiles = normalize(bins, {
  value: 'count',
  by: 'season',
  basis: 'max',
  as: 'height',
})

defineChart({
  marks: [
    ridgelineY(profiles, {
      x: 'x',
      y: 'season',
      height: 'height',
      overlap: 0.78,
      color: 'season',
    }),
  ],
  x: { scale: scaleLinear().domain([4, 10]) },
  y: {
    scale: scalePoint<number>().domain(seasons).padding(0.78),
    reverse: true,
  },
})
```

`height` must be finite and within `[0, 1]`. Nullish and nonfinite profile
positions or heights create gaps. Sort samples into the intended profile order
before passing them to the mark.

## Signatures

```ts
function ridgelineY<TDatum>(
  source: Iterable<TDatum>,
  options: RidgelineYOptions<TDatum>,
): ChartMark<TDatum>

function ridgelineX<TDatum>(
  source: Iterable<TDatum>,
  options: RidgelineXOptions<TDatum>,
): ChartMark<TDatum>
```

The profile position is numeric or temporal. The category is a numeric or
string `ChartKey`.

The public type surface includes `RidgelinePosition`, `RidgelineCurve`,
`RidgelineStateStyle`, `RidgelineYOptions`, and `RidgelineXOptions`.

## Options

| Option                                            | Type                                       | Default          | Meaning                                                  |
| ------------------------------------------------- | ------------------------------------------ | ---------------- | -------------------------------------------------------- |
| `x`                                               | `Channel<TDatum, number \| Date?>`         | Required by Y    | Horizontal profile position for `ridgelineY`             |
| `y`                                               | `Channel<TDatum, ChartKey?>`               | Required by Y    | Categorical baseline for `ridgelineY`                    |
| `x`                                               | `Channel<TDatum, ChartKey?>`               | Required by X    | Categorical baseline for `ridgelineX`                    |
| `y`                                               | `Channel<TDatum, number \| Date?>`         | Required by X    | Vertical profile position for `ridgelineX`               |
| `height`                                          | `Channel<TDatum, number?>`                 | Required         | Normalized displacement from the category baseline       |
| `overlap`                                         | `number`                                   | `1`              | Peak displacement in category-step units                 |
| `id`                                              | `string`                                   | Layer-derived    | Stable mark ID                                           |
| `key`                                             | `Channel<TDatum, ChartKey>`                | Inferred         | Stable profile-sample identity                           |
| `color`                                           | `Channel<TDatum, ChartKey?>`               | Category         | Value sent to the chart color scale                      |
| `fill`, `stroke`                                  | `VisualChannel<TDatum, string>`            | Resolved color   | Category profile paint; `stroke: null` omits the outline |
| `fillOpacity`, `strokeOpacity`, and `strokeWidth` | `number`                                   | Renderer default | Area and outline presentation                            |
| `strokeDasharray`                                 | `string`                                   | None             | Outline dash pattern                                     |
| `curve`                                           | `RidgelineCurve`                           | Straight         | Renderer-neutral profile path generator                  |
| `states`                                          | `readonly ChartMarkState[]`                | None             | Focus-driven opacity styles shared by area and outline   |
| `motion`                                          | `ChartMarkMotionOptions<TDatum>['motion']` | None             | Keyed area and outline motion policy                     |

`overlap` must be positive and finite. A value of `1` reaches the next category
baseline, values below `1` leave space, and values above `1` overlap adjacent
profiles.

## Category scale and padding

The categorical axis must resolve to a point or band scale. Ridge displacement
uses the smallest step in the complete configured domain, including categories
without profile rows. This keeps geometry stable when a category is empty.

Point-scale padding controls room outside the first and last baseline. Set its
padding to at least `overlap` when peaks must remain inside the plot. Use
`reverse: true` on a y scale when the first authored category should appear at
the bottom.

Categories paint in first-occurrence order; each category's area paints before
all outlines. Source order therefore controls which profile is on top when
`overlap` exceeds `1`.

## Identity and interaction

Each valid sample contributes one semantic interaction point even though the
mark paints both an area and an outline. The point retains the exact source
datum and index. `ridgelineY` reports the profile position as `xValue` and the
category as `yValue`; `ridgelineX` transposes them.

Profile areas and outlines share the same points, focus affinity, state opacity,
and keyed motion. Use an explicit `key` when positions repeat within a category.
