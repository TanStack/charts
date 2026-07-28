---
title: Dynamic Data and Animation
description: Keep chart definitions stable, separate preparation from scene building, control update equality, and animate keyed geometry safely.
---

A dynamic definition turns typed application input into the next chart
specification. It separates four decisions:

1. Does this update change the chart?
2. Does expensive preparation need to run again?
3. How does the current size and prepared data become marks?
4. Should the DOM host animate from the painted scene to the next scene?

## Define once

Keep reusable definitions at module scope:

```ts
import { max } from 'd3-array'
import { scaleBand, scaleLinear } from 'd3-scale'
import { barX, defineChart } from '@tanstack/charts'

interface Row {
  id: string
  label: string
  revenue: number
  orders: number
}

interface Input {
  rows: readonly Row[]
  metric: 'revenue' | 'orders'
  accent: string
}

const rankingChart = defineChart<Input>()({
  inputEqual: (previous, next) =>
    previous.rows === next.rows &&
    previous.metric === next.metric &&
    previous.accent === next.accent,
  prepareEqual: (previous, next) =>
    previous.rows === next.rows && previous.metric === next.metric,
  prepare(input, { signal }) {
    signal.throwIfAborted()
    return input.rows
      .map((row) => ({
        id: row.id,
        label: row.label,
        value: row[input.metric],
      }))
      .sort((left, right) => right.value - left.value)
  },
  chart({ input, prepared, width }) {
    const maximum = Math.max(1, max(prepared, (row) => row.value) ?? 0)

    return {
      marks: [
        barX(prepared, {
          x: 'value',
          y: 'label',
          key: 'id',
          fill: input.accent,
        }),
      ],
      x: {
        scale: scaleLinear().domain([0, maximum]).nice(),
        ticks: width < 420 ? 4 : 7,
      },
      y: {
        scale: scaleBand<string>()
          .domain(prepared.map((row) => row.label))
          .padding(0.1),
      },
    }
  },
})
```

Only the application input type is explicit. Prepared rows, mark data, channel
fields, coordinate values, callbacks, and adapter props infer from the
definition.

## Preparation is synchronous

`prepare` is for deterministic CPU work:

- grouping and reduction;
- sorting;
- stack interval generation;
- binning;
- index construction;
- width-independent summaries.

Fetch data before updating chart input. The `AbortSignal` lets preparation
check cancellation or dispose work it initiated, but `prepare` does not await
network requests.

The `chart` phase receives the full scene `width` and `height`, so it can choose
responsive breakpoints or surface-bounded representations. It does not receive
the final inner plot bounds, which depend on guide and legend measurement.
Exact plot-space collision, binning, and label layout belong in a custom mark's
render phase or an application overlay driven by the resolved scene.

The [Scales and D3](../concepts/scales-and-d3.md) page owns the analytical
dependency boundary. [Responsive Charts](./responsive-charts.md) owns the
surface-versus-plot geometry distinction.

## Equality and cache ownership

Default behavior:

- plain object input uses shallow equality;
- arrays, dates, maps, sets, and class instances use identity;
- `prepareEqual` defaults to `inputEqual`;
- size changes rebuild a scene but reuse prepared data;
- a different definition object creates a new runtime boundary;
- every mounted chart owns its own preparation cache.

Use `inputEqual` when a meaningful input object is rebuilt frequently. Use
`prepareEqual` when a visual-only field should rebuild marks without repeating
data work.

Do not wrap `defineChart` in a component-level memo whose dependencies change
with props. That still recreates the definition and discards its runtime cache.

## Pass complete input

Static definitions reject `input`. Dynamic definitions require it:

```tsx
<Chart
  definition={rankingChart}
  input={{ rows, metric, accent }}
  ariaLabel="Revenue ranking"
/>
```

React and Octane forward every committed option change to the shared host.
Framework scheduling may batch application states before a commit. Each call
that reaches `host.update` applies synchronously.

If only the newest state matters, coalesce upstream work before it reaches the
host. If every revision matters, process and measure every revision. Do not
present framework scheduling as a chart data queue.

## Stable keys

Keys identify the same visual entity across revisions. Use a key derived from
the datum's durable identity:

```ts
barX(rows, {
  x: 'value',
  y: 'label',
  key: 'id',
})
```

Do not use array position for reorderable, filtered, or rolling data. Stable
keys preserve surviving SVG elements, focused points, and transition
continuity. They do not make an unbounded number of nodes cheap.

## Animation

Animation is a DOM-host concern:

```tsx
<Chart
  definition={rankingChart}
  input={{ rows, metric, accent }}
  ariaLabel="Revenue ranking"
  animate={{ duration: 280, easing: 'ease-out' }}
/>
```

`animate` accepts `true` or:

- `duration`: milliseconds;
- `easing`: `linear`, `ease`, `ease-in`, `ease-out`, `ease-in-out`, or a
  function from normalized progress to normalized progress;
- `respectReducedMotion`: defaults to `true`.

Numeric geometry and compatible path data interpolate. Entering and exiting
nodes reconcile by key. If a new update interrupts a transition, it begins
from the geometry currently painted on screen; a cancelled frame cannot
overwrite the final revision.

Static SVG, server rendering, and `createChartScene` do not include animation
work.

<iframe
  src="https://tanstack.com/charts/catalog/embed/91-timeline-playback-scrubber/?theme=system&height=440"
  title="Dynamic timeline playback with preserved typed state"
  loading="lazy"
  style="width: 100%; height: 440px; border: 0;"
></iframe>

## Streaming and rolling windows

For high-rate data:

1. Keep source history outside the chart if the product needs it.
2. Pass a bounded visible window or encoded representation.
3. Preserve keys for rows that survive the roll.
4. Keep viewport state controlled and decide whether it follows the newest
   value.
5. Announce meaningful offscreen updates through application UI.

See [Large Data](./large-data.md) and
[Interactions and Selections](./interactions-and-selections.md) for the
representation and viewport policies.

## Update checklist

- The definition object is stable.
- Input contains every value that affects output.
- Equality functions compare exactly the fields they claim.
- Preparation is synchronous, deterministic, and separately measurable.
- Width-dependent preparation is invalidated by width.
- Reorderable data has stable keys.
- Reduced-motion behavior is preserved.
- Selection, focus, and viewport remain valid after updates.
- A burst settles on the exact latest committed input.
