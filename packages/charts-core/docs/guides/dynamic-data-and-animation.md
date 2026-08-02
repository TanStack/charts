---
title: Dynamic Data and Animation
description: Recreate memoized definitions when application values change and animate keyed geometry safely.
---

Definition identity is the application update boundary. A framework memo
captures the current data and options; Charts rebuilds the scene when that
definition changes or when the chart surface changes size.

## React

```tsx
function RankingChart({ rows, metric, accent }: Props) {
  const definition = useMemo(() => {
    const ranked = rankRows(rows, metric)

    return defineChart({
      animate: { duration: 280, easing: 'ease-out' },
      chart: ({ width }) => ({
        marks: [
          barX(ranked, {
            x: 'value',
            y: 'label',
            fill: accent,
          }),
        ],
        x: {
          scale: scaleLinear,
          nice: true,
          axis: { ticks: { count: width < 420 ? 4 : 7 } },
        },
        y: {
          scale: () => scaleBand<string>().padding(0.1),
        },
      }),
    })
  }, [rows, metric, accent])

  return <Chart definition={definition} ariaLabel="Revenue ranking" />
}
```

Use the framework's native equivalent: `computed`, `createMemo`, `$derived`,
Angular `computed`, or Octane `useMemo`.

## Vanilla

```ts
host.update({
  ...options,
  definition: createRankingDefinition(nextRows, nextMetric, nextAccent),
})
```

## Stable keys

Built-in marks first use an explicit `key`, then a unique `datum.id`, then a
unique nested `datum.data.id`. Marks can also infer identity from semantic
positional channels:

```ts
barX(rows, {
  x: 'value',
  y: 'label',
})
```

Here `barX` uses the unique `y` value when rows have no `id`. `barY` uses `x`;
`lineY` and `areaY` use `x`; `areaX` uses `y`; rects and cells use their x/y
interval tuple. Dots and text try x, then y, then their x/y tuple. Inference is
scoped to each group and falls back to array position when a candidate is
incomplete or duplicated. Development builds warn once for each affected mark
instance.

Supply `key` when the inferred value is not the entity's identity or can
change independently of it. Stable identity preserves surviving SVG elements,
focused points, and transition continuity.

## Lightweight SVG tweening

`animate` accepts `true` or:

- `duration`: milliseconds;
- `easing`: `linear`, `ease`, `ease-in`, `ease-out`, `ease-in-out`, or a
  function from normalized progress to normalized progress;
- `respectReducedMotion`: defaults to `true`;
- `resize`: defaults to `false`, so responsive relayout does not repeatedly
  restart animation.

Numeric geometry and compatible path data interpolate. Entering and exiting
nodes reconcile by key. If an update interrupts a transition, it begins from
the geometry currently painted on screen.

Static SVG, server rendering, and `createChartScene` do not include animation.

Use this path when a small default-SVG tween is enough. It has no spring
solver, definition-local timing cascade, entrance choreography, or retained
velocity.

## Optional tween and spring motion

Use `motion()` when animation quality is part of the chart contract:

```ts
import { motion } from '@tanstack/charts/motion'
import { mountChartRenderer } from '@tanstack/charts/renderer'

const definition = defineChart({
  motion: {
    transition: { type: 'spring', stiffness: 170, damping: 18, mass: 1 },
  },
  marks: [
    lineY(rows, {
      x: 'date',
      y: 'actual',
      key: 'id',
    }),
    lineY(rows, {
      x: 'date',
      y: 'forecast',
      key: 'id',
      motion: { transition: { type: 'spring', mass: 1.25 } },
    }),
  ],
  x: { scale: scaleUtc },
  y: { scale: scaleLinear },
})

const host = mountChartRenderer(container, {
  definition,
  renderer: motion(),
  width: 640,
  height: 360,
  ariaLabel: 'Actual and forecast revenue',
})
```

Each host has one animation owner. The default SVG renderer uses `animate`.
When `motion()` is the renderer, it ignores `animate` and uses motion
declarations from the definition. A `motion` declaration configures the motion
renderer; it does not select it.

Motion declarations can live on the chart, a mark, an axis, its ticks, tick
labels, or axis label. A callback can specialize `enter`, `update`, and `exit`
by series or datum:

```ts
barY(rows, {
  x: 'month',
  y: 'revenue',
  key: 'id',
  motion(context) {
    if (context.phase === 'enter') {
      return { delay: context.datumIndex * 35 }
    }
    if (context.datum?.status === 'forecast') {
      return { transition: { type: 'tween', duration: 240 } }
    }
  },
})
```

Same-type partial transitions inherit omitted properties. Springs use physical
`stiffness`, `damping`, and `mass`; duration is not a spring parameter. Rapid
retargeting preserves the currently painted value and velocity. Keyed
interaction points move with the presentation geometry rather than jumping to
the next scene.

Spring updates always retarget immediately; a returned update delay is ignored
so incoming momentum cannot freeze. Use delays for spring enter/exit
choreography or any tween phase.

The renderer grows entering bars from their semantic baseline, reveals entering
line groups, staggers bar entrances, morphs compatible numeric SVG geometry,
and fades incompatible keyed topology. Authored delay replaces automatic
staggering for that target.

`motion()` respects reduced motion and does not animate resize-only updates by
default. It adopts server-rendered SVG without replaying entrance motion.
Static SVG and Canvas accept the same definitions but paint the final state.

See the [Motion reference](../reference/motion.md) for the complete cascade,
types, focus-state transitions, compatibility limits, and standalone spring
sampler.

## Streaming

For high-rate data:

1. Keep source history outside the chart if the product needs it.
2. Capture a bounded visible window or encoded representation.
3. Preserve keys for rows that survive the roll.
4. Keep viewport state controlled.
5. Coalesce upstream work when only the latest state matters.

The final definition passed to `host.update` is applied synchronously.
