# Dynamic charts

> Archived experiment documentation. Use `packages/charts-core/docs` for the
> current D3-native product.

Dynamic definitions separate three kinds of work:

1. `inputEqual` decides whether an application update changes the chart.
2. `prepareEqual` decides whether data preparation must run again.
3. `chart` builds the next declarative mark composition for the current size and
   prepared data.

```ts
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
    x: { ticks: width < 420 ? 4 : 7 },
  }),
})
```

`prepare` is synchronous. The abort signal supports cancellation checks and
cleanup for work initiated by preparation; data fetching should happen before
the chart input is updated.

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
