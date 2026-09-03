---
title: Hexbin Mark
description: Reference for responsive screen-space hexagonal aggregation, reducer outputs, source lineage, color, and the optional spatial import.
---

`hexbin` aggregates raw numeric x/y observations after the chart resolves its
positional scales and inner bounds. Import it from the optional spatial
subpath; it is not included in the root or universal barrel.

```ts
import { hexbin } from '@tanstack/charts/spatial/hexbin'

const mark = hexbin(rows, {
  x: 'weight',
  y: 'economy',
  binWidth: 24,
  color: 'count',
  r: 11,
  stroke: '#fff',
})
```

```ts
function hexbin<TDatum, TOutputs extends TransformOutputs<TDatum>>(
  source: Iterable<TDatum>,
  options: HexbinOptions<TDatum, TOutputs>,
): ChartMark<HexbinDatum<TDatum, TOutputs>, number, number>
```

Without `outputs`, each bin receives a numeric `count` output.

## Options

| Option                                            | Type                                      | Default              | Meaning                                       |
| ------------------------------------------------- | ----------------------------------------- | -------------------- | --------------------------------------------- |
| `x`                                               | `TransformValue<TDatum, number?>`         | Required             | Raw horizontal observation                    |
| `y`                                               | `TransformValue<TDatum, number?>`         | Required             | Raw vertical observation                      |
| `binWidth`                                        | `number`                                  | `20`                 | Horizontal pixel distance between bin centers |
| `outputs`                                         | `TransformOutputs<TDatum>`                | Count reducer        | Named reducers evaluated over each bin        |
| `id`                                              | `string`                                  | Layer-derived        | Stable mark ID                                |
| `z`                                               | `Channel<HexbinDatum, ChartKey?>`         | No group             | Interaction group                             |
| `color`                                           | `Channel<HexbinDatum, ChartKey?>`         | `z`                  | Derived value sent to the color scale         |
| `r`                                               | `number \| Channel<HexbinDatum, number?>` | Bin radius minus 1px | Rendered hexagon circumradius                 |
| `rScale`                                          | `ChartNumericScale`                       | Identity             | Maps a radius channel to pixels               |
| `fill`                                            | `VisualChannel<HexbinDatum, string>`      | Resolved color       | Final fill override                           |
| `stroke`                                          | `VisualChannel<HexbinDatum, string>`      | None                 | Final stroke override                         |
| `fillOpacity`, `strokeOpacity`, and `strokeWidth` | `number`                                  | SVG default          | Hexagon presentation                          |

`binWidth` must be positive and finite. Both positional scales must support
`invert`; continuous D3 scales and the compact TanStack linear scale do. A
band scale is not a valid hexbin position scale.

## Reducers and lineage

`outputs` uses the same reducer contract as eager transforms. Count, sum,
mean, minimum, maximum, and custom reducers are available:

```ts
hexbin(rows, {
  x: 'x',
  y: 'y',
  outputs: {
    count: { reduce: 'count' },
    total: { value: 'revenue', reduce: 'sum' },
  },
  color: 'total',
})
```

The margin solver may evaluate reducers during multiple resolved-layout
passes. Custom reducers must be synchronous, pure, deterministic, and must not
mutate source rows.

`HexbinDatum<TDatum, TOutputs>` contains:

- semantic `x` and `y` values obtained by inverting the lattice center;
- every named reducer output;
- `source`, retaining the original row objects in input order; and
- `sourceIndexes`, retaining their original indexes.

Rows with nonfinite or missing x/y values are omitted without renumbering the
remaining lineage. Every valid input row belongs to exactly one bin. The
interaction point datum is the complete `HexbinDatum`, so tooltips can show
counts, custom outputs, or source records without case-owned lookup tables.

## Responsive behavior

Initial raw x/y channels establish the positional domains. The mark then bins
their mapped pixel coordinates inside the final plot and contributes its
derived color channel before color-scale and legend resolution. Resizing may
change bin membership; repeated compilation at the same size is deterministic.
