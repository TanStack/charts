---
title: Text, Frame, and Facet Marks
description: Reference for data labels, chart frames, responsive small multiples, shared or per-cell axes, labels, and facet constraints.
---

`text` annotates scaled positions, `frame` paints the resolved inner chart
bounds, and `facet` composes complete child specs into responsive small
multiples.

```ts
import { facet, facetChart, frame, lineY, text } from '@tanstack/charts'
```

## `text`

```ts
text(rows, {
  x: 'date',
  y: 'value',
  text: 'label',
  z: 'series',
  dy: -8,
})
```

```ts
function text<TDatum>(
  source: Iterable<TDatum>,
  options?: TextOptions<TDatum>,
): ChartMark<TDatum, InferredX, InferredY>
```

### Options

| Option       | Type                                 | Default                            | Meaning                                           |
| ------------ | ------------------------------------ | ---------------------------------- | ------------------------------------------------- |
| `id`         | `string`                             | Layer-derived                      | Stable mark ID                                    |
| `x`          | `Channel<TDatum, ChartValue?>`       | Row index                          | Horizontal anchor                                 |
| `y`          | `Channel<TDatum, ChartValue?>`       | Numeric datum                      | Vertical anchor                                   |
| `text`       | `Channel<TDatum, string \| number?>` | String form of datum               | Label content                                     |
| `z`          | `Channel<TDatum, ChartKey?>`         | No group                           | Interaction group                                 |
| `color`      | `Channel<TDatum, ChartKey?>`         | `z`                                | Value sent to the chart color scale               |
| `key`        | `Channel<TDatum, ChartKey>`          | ID, x, y, x/y, index               | Stable identity                                   |
| `fill`       | `VisualChannel<TDatum, string>`      | Theme foreground or resolved color | Final label paint override                        |
| `fontSize`   | `number`                             | Inherited SVG font size            | Font size                                         |
| `fontWeight` | `number`                             | Inherited weight                   | Numeric font weight                               |
| `anchor`     | `VisualChannel<TDatum, TextAnchor>`  | `'middle'`                         | `'start'`, `'middle'`, or `'end'`                 |
| `rotate`     | `VisualChannel<TDatum, number>`      | No transform                       | Rotation in degrees around the final label origin |
| `dx`         | `VisualChannel<TDatum, number>`      | `0`                                | Horizontal pixel offset                           |
| `dy`         | `VisualChannel<TDatum, number>`      | `0`                                | Vertical pixel offset                             |
| `states`     | `readonly ChartMarkState[]`          | None                               | Focus-driven presentation overrides               |

Labels use a middle baseline. Null or undefined text skips the row; the default
for a null datum is an empty string. Invalid x/y values also skip the row.

The interaction point is at the offset label origin. Its semantic values remain
the original x/y channels. Without an explicit key, `text` tries a unique
top-level or nested `data.id`, then x, y, and the x/y tuple. Supply `key` when
positions can change while the same label should reconcile across updates.

## `frame`

`frame` draws a background, border, or both around the final inner chart
bounds:

```ts
frame({
  fill: 'color-mix(in srgb, currentColor 3%, transparent)',
  strokeOpacity: 0.25,
  radius: 8,
})
```

```ts
function frame(options?: FrameOptions): ChartMark<never, never, never>
```

| Option          | Type     | Default          | Meaning                                                             |
| --------------- | -------- | ---------------- | ------------------------------------------------------------------- |
| `id`            | `string` | Layer-derived    | Stable mark ID                                                      |
| `fill`          | `string` | `'none'`         | Constant fill                                                       |
| `fillOpacity`   | `number` | SVG default      | Fill opacity                                                        |
| `stroke`        | `string` | Theme foreground | Constant stroke                                                     |
| `strokeOpacity` | `number` | `0.35`           | Stroke opacity                                                      |
| `strokeWidth`   | `number` | `1`              | Stroke width                                                        |
| `inset`         | `number` | `0`              | Pixels removed from all chart-bound edges; clamped to at least zero |
| `radius`        | `number` | None             | Corner radius                                                       |

`frame` materializes no scale channels and emits no interaction points. Put it
before data marks when it should paint behind them.

## `facet`

`facet` groups source rows by a key and renders one complete child chart spec
per group inside the parent chart bounds.

```ts
facet(rows, {
  by: 'region',
  columns: 3,
  minWidth: 220,
  gap: 16,
  label: (region) => `Region: ${region}`,
  chart(groupRows) {
    return {
      marks: [lineY(groupRows, { x: 'date', y: 'value' })],
      x: { scale: makeXScale(groupRows) },
      y: { scale: makeYScale(groupRows), grid: true },
    }
  },
})
```

```ts
function facet<TDatum>(
  source: Iterable<TDatum>,
  options: FacetOptions<TDatum>,
): ChartMark<TDatum>
```

### Options

| Option     | Type                                                    | Default                   | Meaning                                                        |
| ---------- | ------------------------------------------------------- | ------------------------- | -------------------------------------------------------------- |
| `id`       | `string`                                                | Layer-derived             | Stable outer mark ID                                           |
| `by`       | `Channel<TDatum, ChartKey>`                             | Required                  | String or number grouping key                                  |
| `chart`    | `(data: readonly TDatum[], key: ChartKey) => ChartSpec` | Required                  | Builds one static child spec per group                         |
| `columns`  | `number`                                                | Automatic                 | Requested column count, floored and clamped to `1..groupCount` |
| `minWidth` | `number`                                                | `220`                     | Target minimum cell width used for automatic columns           |
| `gap`      | `number`                                                | `16`                      | Gap between rows and columns, clamped to at least zero         |
| `label`    | `boolean \| ((key) => string)`                          | `true`                    | Shows default key labels, formats them, or disables labels     |
| `axes`     | `'outer' \| 'cell'`                                     | `'outer'` where shareable | Shared outside axes or independent axes in every cell          |

Facet preserves first-seen group order and original row order within each
group. Non-string and non-number `by` results are skipped.

Automatic columns are:

```text
floor((availableWidth + gap) / (minWidth + gap))
```

with a minimum of one. Rows are then derived from group count. Visible facet
labels reserve 22 pixels above every child plot.

### Outer axes

With more than one child and guides enabled, the default `axes: 'outer'`
renders y ticks on the first column, x ticks on the final occupied row, and
one shared title per dimension.

Outer axes require compatible cells:

- x and y resolved scale types, domains, ticks, labels, and direction match
- axis label, label offset, and tick rotation match
- foreground and muted theme tokens match
- no child provides its own `margin`
- no child provides a color legend
- no child sets `guides: false`

An incompatible facet throws with guidance to use `axes: 'cell'`. This
fail-fast behavior prevents a shared axis from implying a comparison the child
scales do not support.

When every child sets `guides: false`, or there is only one child, facet uses
the cell rendering path even if `axes` is omitted.

### Cell axes

Set `axes: 'cell'` when groups need independent scales, guide options, margins,
or legends:

```ts
facet(rows, {
  by: 'region',
  axes: 'cell',
  chart: (groupRows) => buildIndependentSpec(groupRows),
})
```

Every child compiles at its own cell dimensions with the parent's text
measurement. Compilation errors are wrapped with the facet and cell key.

### Interaction

Child `ChartPoint` coordinates are offset into the parent scene. Point keys are
prefixed with facet and group identity, so equal child keys remain unique
across cells. Datum, semantic x/y values, group, group label, and paint are
preserved.

The facet mark itself has intentionally opaque positional types because each
child may return a different mark composition. Its child scale domains do not
participate in the parent x/y scales.

## `facetChart`

`facetChart` wraps a facet mark in a complete static definition:

```ts
const definition = facetChart(rows, {
  by: 'region',
  chart: (groupRows) => buildSpec(groupRows),
})
```

```ts
function facetChart<TDatum>(
  source: Iterable<TDatum>,
  options: FacetOptions<TDatum>,
): StaticChartDefinition<TDatum>
```

The wrapper sets:

```ts
const specification = {
  marks: [facet(source, options)],
  margin: 0,
}
```

Use `facet` directly when the small multiples must be layered with other
parent-scene marks. Use `facetChart` for the usual standalone chart.
