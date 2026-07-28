# Dynamic charts

Dynamic definitions separate three kinds of work:

1. `inputEqual` decides whether an application update changes the chart.
2. `prepareEqual` decides whether data preparation must run again.
3. `chart` builds the next declarative mark composition for the current size and
   prepared data.

```ts
import { max } from 'd3-array'
import { scaleBand, scaleLinear } from 'd3-scale'

interface Input {
  rows: readonly Row[]
  metric: 'revenue' | 'orders'
  accent: string
}

const definition = defineChart<Input>()({
  inputEqual: (a, b) =>
    a.rows === b.rows && a.metric === b.metric && a.accent === b.accent,
  prepareEqual: (a, b) => a.rows === b.rows && a.metric === b.metric,
  prepare: (input, { signal }) => {
    signal.throwIfAborted()
    return aggregate(input.rows, input.metric)
  },
  chart: ({ input, prepared, width, height, theme }) => ({
    marks: [
      barX(prepared, {
        x: 'value',
        y: 'label',
        key: 'id',
        fill: input.accent,
      }),
    ],
    x: {
      scale: scaleLinear()
        .domain([0, max(prepared, (row) => row.value) ?? 0])
        .nice(),
      ticks: width < 420 ? 4 : 7,
    },
    y: {
      scale: scaleBand()
        .domain(prepared.map((row) => row.label))
        .paddingInner(0.1)
        .paddingOuter(0.05),
    },
  }),
})
```

`prepare` is synchronous. The abort signal supports cancellation checks and
cleanup for work initiated by preparation; data fetching should happen before
the chart input is updated.

## Type inference contract

Only introduce the application input type:

```ts
const definition = defineChart<Input>()({
  prepare: (input) => transform(input.rows),
  chart: ({ input, prepared }) => ({
    marks: [barX(prepared, { x: 'value', y: 'label', fill: input.accent })],
    x: {
      scale: scaleLinear()
        .domain([0, valueMax(prepared)])
        .nice(),
    },
    y: { scale: scaleBand().domain(prepared.map((row) => row.label)) },
  }),
})
```

The prepared type, mark datum, callback datum, channel fields, scale value
types, and React or Octane props infer from that definition. Do not write
`Chart<Row, Input>`, annotate the mark array, or cast a conditional branch.
Different branches may emit different datum types; callbacks receive the exact
union and should narrow `point.datum` normally.

Dynamic adapters require the inferred input:

```tsx
<Chart definition={definition} input={{ rows, accent }} ariaLabel="Ranking" />
```

Omitting `input` or supplying the wrong shape is a type error and is also
guarded at the vanilla JavaScript host boundary.

## Memoization contract

- Plain object input uses shallow equality by default.
- Arrays, dates, maps, and class instances use identity unless a definition
  provides `inputEqual`.
- `prepareEqual` defaults to `inputEqual`.
- Size changes rebuild the scene but reuse prepared data.
- A new definition object invalidates the runtime. Define reusable charts at
  module scope.
- Preparation state belongs to each mounted host. Two charts never share
  mutable runtime caches.

Do not use `useMemo(() => defineChart(...), [props])`. React creates a new
props object for each render, so that pattern recreates the definition and
discards its caches. Keep the definition at module scope and pass only
chart-relevant values through `input`.

Inline input is safe when its fields are stable:

```tsx
<Chart definition={chart} input={{ rows, metric }} />
```

## Reconciliation and animation

Each scene node has a stable key. The DOM host reconciles keyed SVG elements and
updates attributes in place. Numeric geometry and compatible path data can
interpolate.

```tsx
<Chart
  definition={chart}
  input={{ rows }}
  animate={{ duration: 280, easing: 'ease-out' }}
/>
```

`easing` also accepts a `(progress) => progress` function when an application
needs to preserve an existing motion curve.

An interrupted transition starts from live geometry. New updates cancel the
previous animation; bars never pass through an intentionally blank state.
Animation respects `prefers-reduced-motion` by default. Set
`respectReducedMotion: false` only when motion is essential to the meaning of
the visualization.

Animation is a host concern. Static SVG, scene calculation, and SSR do not
include animation work.
