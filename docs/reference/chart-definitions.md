---
title: Chart Definition API
description: Reference the exact static and dynamic definition overloads, configuration types, defaults, and comparison helpers.
---

This page is the signature reference for chart definitions. The
[Chart Definitions concept](../concepts/chart-definitions.md) is the single
behavioral guide to choosing a form, preparation, equality, stable identity,
and update semantics.

## `defineChart`

```ts
import { defineChart } from '@tanstack/charts'
```

`defineChart` has one static form and two equivalent dynamic forms.

```ts
function defineChart<const TMarks, const TSpec>(
  spec: TSpec,
): StaticChartDefinition<InferredDatum, InferredX, InferredY>

function defineChart<TInput>(): {
  (
    chart: (context: ChartBuildContext<TInput, TInput>) => ChartSpec,
  ): DynamicChartDefinition<TInput, TInput, InferredDatum, InferredX, InferredY>

  <TPrepared>(
    config: DynamicChartConfig<TInput, TPrepared>,
  ): DynamicChartDefinition<
    TInput,
    TPrepared,
    InferredDatum,
    InferredX,
    InferredY
  >
}
```

The direct generic dynamic overloads are also available:

```ts
defineChart<TInput, TSpec>(chart)
defineChart<TInput, TSpec, TPrepared>(config)
```

The curried `defineChart<TInput>()(...)` form is the normal authoring API
because it introduces only the input type and still infers the complete spec
and prepared value.

## Static definitions

Use a static definition when the marks, rows, and semantic scale domains are
already available.

```ts
import { scaleLinear, scaleUtc } from 'd3-scale'
import { defineChart, lineY } from '@tanstack/charts'

const definition = defineChart({
  marks: [lineY(rows, { x: 'date', y: 'value', key: 'id' })],
  x: { scale: scaleUtc().domain(dateDomain) },
  y: { scale: scaleLinear().domain(valueDomain).nice(), grid: true },
})
```

The datum type and the `xValue` and `yValue` callback types are inferred from
the marks. A static definition accepts no meaningful input: adapter props and
host options may omit `input` or set it to `undefined`.
See [Types](./types.md) for the inference contract and
[Scales, guides, and color](./scales-guides-and-color.md) for scale ownership.

For static-definition identity and update policy, see
[Keep definitions stable](../concepts/chart-definitions.md#keep-definitions-stable).

## Dynamic definitions

Use a dynamic definition when a chart must respond to application input,
available width, available height, or prepared data.

```ts
import { max } from 'd3-array'
import { scaleBand, scaleLinear } from 'd3-scale'
import { barY, defineChart } from '@tanstack/charts'

interface Input {
  rows: readonly { category: string; value: number }[]
  accent: string
}

const definition = defineChart<Input>()(({ input }) => {
  const maximum = max(input.rows, (row) => row.value) ?? 0

  return {
    marks: [
      barY(input.rows, { x: 'category', y: 'value', fill: input.accent }),
    ],
    x: {
      scale: scaleBand()
        .domain(input.rows.map((row) => row.category))
        .padding(0.15),
    },
    y: {
      scale: scaleLinear().domain([0, maximum]).nice(),
      grid: true,
    },
  }
})
```

Every dynamic host must provide an own `input` property with exactly the
declared shape. The definition drives that requirement and all interaction
callback inference.

The chart builder receives:

| Property   | Type         | Meaning                                                                 |
| ---------- | ------------ | ----------------------------------------------------------------------- |
| `input`    | `TInput`     | The current application input                                           |
| `prepared` | `TPrepared`  | The result of `prepare`, or `input` when no preparation function exists |
| `width`    | `number`     | The current full scene width                                            |
| `height`   | `number`     | The current full scene height                                           |
| `theme`    | `ChartTheme` | The default build-time theme tokens                                     |

The builder runs whenever the runtime determines that the definition, input,
or size requires a new scene. Return a complete [chart spec](./chart-spec.md)
each time.

## Prepared data

`prepare` separates input-dependent work from size-dependent chart assembly.
It is synchronous by design.

```ts
interface Input {
  rows: readonly Sale[]
  metric: 'revenue' | 'orders'
}

const definition = defineChart<Input>()({
  prepare(input, { signal }) {
    if (signal.aborted) return []
    return aggregateSales(input.rows, input.metric)
  },
  chart({ prepared, width }) {
    return buildSalesSpec(prepared, width)
  },
})
```

```ts
interface DynamicChartConfig<TInput, TPrepared> {
  prepare?: (input: TInput, context: { signal: AbortSignal }) => TPrepared
  chart: (context: ChartBuildContext<TInput, TPrepared>) => ChartSpec
  inputEqual?: (previous: TInput, next: TInput) => boolean
  prepareEqual?: (previous: TInput, next: TInput) => boolean
}
```

For preparation ownership, cancellation, and caching behavior, see
[Preparation](../concepts/chart-definitions.md#preparation).

## Equality and memoization

`inputEqual` defaults to `shallowInputEqual`; `prepareEqual` defaults to the
selected `inputEqual`. The canonical comparison rules and comparator guidance
live in
[Equality and memoization](../concepts/chart-definitions.md#equality-and-memoization).

```ts
const definition = defineChart<Input>()({
  prepare: ({ rows }) => expensiveRollup(rows),
  prepareEqual: (previous, next) => previous.rows === next.rows,
  chart: ({ input, prepared }) => buildSpec(prepared, { accent: input.accent }),
})
```

Exported comparison helpers:

```ts
import {
  chartInputsEqual,
  isDynamicChartDefinition,
  shallowInputEqual,
} from '@tanstack/charts'
```

The public helpers are `chartInputsEqual`, `isDynamicChartDefinition`, and
`shallowInputEqual`.

| Function                                       | Behavior                                                                          |
| ---------------------------------------------- | --------------------------------------------------------------------------------- |
| `shallowInputEqual(previous, next)`            | Applies the default equality rules above                                          |
| `chartInputsEqual(definition, previous, next)` | Uses a dynamic definition's `inputEqual`; static definitions always compare equal |
| `isDynamicChartDefinition(definition)`         | Narrows a union by checking for the dynamic `chart` builder                       |

For definition identity and runtime cache ownership, see
[Keep definitions stable](../concepts/chart-definitions.md#keep-definitions-stable)
and [Runtime and scene](./runtime-and-scene.md).
