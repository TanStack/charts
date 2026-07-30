---
title: TypeScript
description: Preserve end-to-end inference from chart data and channels through scales, focus callbacks, adapters, and custom extensions.
---

TanStack Charts is designed so ordinary chart code names its application types
once. Data, channel outputs, scale domains, focus points, and framework props
then infer from the definition.

## Infer from mark channels

<!-- docs-example: typescript-inference typecheck -->

```ts
import { scaleLinear, scaleTime } from 'd3-scale'
import { defineChart, lineY } from '@tanstack/charts'

interface Reading {
  id: string
  recordedAt: Date
  temperature: number
}

const readings: readonly Reading[] = []

const definition = defineChart({
  marks: [
    lineY(readings, {
      x: 'recordedAt',
      y: 'temperature',
    }),
  ],
  x: { scale: scaleTime },
  y: { scale: scaleLinear },
})
```

Here the datum is `Reading`, x values are `Date`, and y values are `number`.
An incompatible scale or channel field fails at the definition instead of
surfacing later in a tooltip callback.

## Capture application values

```ts
function createTrafficDefinition(rows: readonly Reading[]) {
  return defineChart({
    marks: [
      lineY(rows, {
        x: 'recordedAt',
        y: 'temperature',
      }),
    ],
    x: { scale: scaleTime },
    y: { scale: scaleLinear },
  })
}
```

Framework components should memoize the complete definition:

```tsx
const definition = useMemo(() => createTrafficDefinition(readings), [readings])

return <Chart definition={definition} ariaLabel="Temperature history" />
```

Definition identity tells the host when captured application data or options
changed. A responsive definition callback still rebuilds when the host size
changes:

```ts
function createTrafficDefinition(rows: readonly Reading[]) {
  return defineChart(({ width }) => ({
    marks: [
      lineY(rows, {
        x: 'recordedAt',
        y: 'temperature',
      }),
    ],
    x: { scale: scaleTime },
    y: { scale: scaleLinear },
    margin: width < 480 ? 24 : 40,
  }))
}
```

## Keep literal information

Prefer:

- field-name channels such as `x: 'recordedAt'`;
- typed accessors when a value is derived;
- `defineChart({...})` or a responsive `defineChart(() => ({...}))`;
- `satisfies` when naming a configuration object separately.

Avoid annotating an intermediate object as broad `ChartSpec` before passing it
to `defineChart`. That discards the literal mark tuple used for axis and
callback inference.

The mark tuple also determines which positional scales are required. Cartesian
marks require every dimension they materialize. Positionless geo, polar, and
facet marks omit both axes; one-dimensional marks such as `ruleY` require only
`y`.

## Callback types

Focus and selection callbacks receive the original datum and inferred
coordinate types:

```tsx
<Chart
  definition={definition}
  ariaLabel="Temperature readings"
  onSelect={(point) => {
    if (!point) return
    point.datum.recordedAt // Date
    point.xValue // Date
    point.yValue // number
  }}
/>
```

Do not cast a callback parameter or re-find its datum by key. If inference has
degraded to `unknown`, move back to the definition and look for an erased mark
tuple, an `any` annotation, or an untyped custom scale.

## Extract inferred types

The public type utilities are useful at extension boundaries:

```ts
import type {
  ChartMarkDatum,
  ChartSpecDatum,
  ChartSpecXValue,
  ChartSpecYValue,
} from '@tanstack/charts'
import type {
  ChartMarkPointX,
  ChartMarkPointY,
} from '@tanstack/charts/mark/scale-values'
```

Use them to describe reusable helpers without repeating a datum or coordinate
union manually. The exact utility contracts are listed in
[Types](../reference/types.md).

## Custom marks

`createMark<TDatum, TXValue, TYValue>` keeps interaction points and scale
values aligned for the common case. Use the advanced scale-value factory when
the materialized axis domain differs from the point anchor or when a custom
mark is positionless and declares both scale value types as `never`.

See [Custom Marks and Renderers](./custom-marks-and-renderers.md). A custom
extension that requires `as unknown as`, a private import, or suppressed type
errors indicates a missing public boundary and should be reduced to a failing
type test.

## Type tests

Keep positive and negative examples near reusable definitions:

```ts
// @ts-expect-error chart options do not accept formal input
mountChart(container, {
  definition,
  input: { rows: readings },
  ariaLabel: 'Readings',
})
```

Use `@ts-expect-error` only when the test asserts a specific rejected contract.
Do not use it to make application examples compile.

## No-cast checklist

- Datum and captured application values are typed at the application boundary.
- Channel fields are checked against the datum.
- Scale domains match inferred coordinate types.
- Definitions preserve their literal mark tuple.
- Adapters infer props from the definition.
- Callbacks receive original typed data.
- Custom extensions expose, rather than erase, their generic relationship.
