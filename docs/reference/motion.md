---
title: Motion
description: Optional SVG tween and spring motion, definition-local timing, interruption behavior, reduced motion, and the standalone spring sampler.
---

Motion is an optional renderer. Core definitions, scene compilation, static SVG,
and Canvas do not import a clock or physics solver.

## `motion`

```ts
import { motion } from '@tanstack/charts/motion'

const renderer = motion({
  transition: { type: 'spring', stiffness: 170, damping: 18, mass: 1 },
})
```

```ts
function motion<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(options?: ChartMotionOptions): ChartRenderer<TDatum, TXValue, TYValue>

interface ChartMotionOptions {
  initial?: boolean
  transition?: ChartMotionTransition
  respectReducedMotion?: boolean
  resize?: boolean
}
```

| Option                 | Default                                       | Meaning                                            |
| ---------------------- | --------------------------------------------- | -------------------------------------------------- |
| `initial`              | `true`                                        | Animate the first client render                    |
| `transition`           | 1,100 ms tween with the default entrance ease | Renderer-wide fallback                             |
| `respectReducedMotion` | `true`                                        | Snap when `prefers-reduced-motion: reduce` matches |
| `resize`               | `false`                                       | Animate updates caused only by a chart size change |

Server-rendered SVG is adopted without replaying entrance motion. Keyed updates
start from painted geometry. An interrupted spring carries its sampled value and
velocity into the new target. A spring has no duration; it finishes when both
`restSpeed` and `restDelta` are satisfied, with a 10-second safety limit.

Use the renderer-neutral host in vanilla applications:

```ts
import { mountChartRenderer } from '@tanstack/charts/renderer'
import { motion } from '@tanstack/charts/motion'

const host = mountChartRenderer(container, {
  definition,
  renderer: motion(),
  width: 640,
  height: 360,
  ariaLabel: 'Monthly revenue',
})
```

React and Octane applications use their `/core` component entry and pass the
same renderer. Other adapters currently expose their default SVG surface.

## Definition-local motion

`motion` on a definition, mark, axis, tick collection, tick-label collection,
or axis label is inert policy. The optional renderer consumes it. Definitions
remain valid for static SVG and Canvas, which paint the final state.

```ts
const definition = defineChart({
  motion: {
    transition: { type: 'spring', stiffness: 170, damping: 18 },
  },
  marks: [
    lineY(rows, {
      id: 'forecast',
      x: 'month',
      y: 'forecast',
      key: 'id',
      motion: { transition: { type: 'spring', mass: 1.25 } },
    }),
    dot(rows, {
      x: 'month',
      y: 'actual',
      key: 'id',
      motion(context) {
        return {
          delay: context.phase === 'enter' ? context.datumIndex * 35 : 0,
        }
      },
    }),
  ],
  x: {
    scale: scaleBand,
    axis: {
      ticks: { motion: { transition: { type: 'tween', duration: 180 } } },
      tickLabels: { motion: { delay: 40 } },
    },
  },
  y: { scale: scaleLinear },
})
```

The cascade is renderer default, chart, mark, axis, specific guide, then the
active focus-state transition. Same-type transitions inherit omitted fields.
An authored `delay` replaces automatic entrance staggering for that target.
Spring updates begin immediately even when a definition returns a delay, so a
retarget cannot freeze incoming momentum. Spring enter and exit delays, and
tween delays in every phase, are honored.

All built-in marks accept `ChartMarkMotionOptions<TDatum>`. Nested polar marks
also accept `motion`; their timing is merged below the parent `polar` mark.

## Timing types

```ts
type ChartMotionPhase = 'enter' | 'update' | 'exit'

interface ChartMotionTweenTransition {
  type: 'tween'
  duration?: number
  easing?:
    | 'linear'
    | 'ease'
    | 'ease-in'
    | 'ease-out'
    | 'ease-in-out'
    | ((progress: number) => number)
}

interface ChartMotionSpringTransition extends ChartSpringOptions {
  type: 'spring'
}

type ChartMotionTransition =
  ChartMotionTweenTransition | ChartMotionSpringTransition

interface ChartMotionTiming {
  delay?: number
  transition?: ChartMotionTransition
}

type ChartMotionDefinition<TDatum = unknown> =
  | ChartMotionTiming
  | ((context: ChartMotionContext<TDatum>) => ChartMotionTiming | undefined)

interface ChartMarkMotionOptions<TDatum = unknown> {
  motion?: ChartMotionDefinition<TDatum>
}
```

`ChartMotionContext` provides `phase`, semantic `role`, stable `key`, optional
`markId`, `seriesKey`, `seriesIndex`, `datumIndex`, `datumCount`, optional typed
`datum` and `point`, and optional `axis`. `ChartMotionRole` covers marks, axes,
grid lines, ticks, tick labels, and axis labels.

Focus styles use `ChartMarkStateTransition`, which is a
`ChartMotionTransition` plus optional `respectReducedMotion`.

## Standalone spring

```ts
import { createChartSpring } from '@tanstack/charts/spring'

const spring = createChartSpring({ stiffness: 170, damping: 18, mass: 1 })
const sample = spring.sample(16, { from: 0, to: 100, velocity: 0 })
```

```ts
interface ChartSpringOptions {
  stiffness?: number
  damping?: number
  mass?: number
  restSpeed?: number
  restDelta?: number
}

interface ChartSpringState {
  from: number
  to: number
  velocity?: number
}

interface ChartSpringSample {
  value: number
  velocity: number
  done: boolean
}

interface ChartSpring {
  readonly options: Readonly<Required<ChartSpringOptions>>
  sample(elapsedMs: number, state?: ChartSpringState): ChartSpringSample
}
```

`createChartSpring` returns an analytic, frame-rate-independent damped harmonic
oscillator. Values and velocities use caller units per second. Seed a new
`ChartSpringState` from the prior sample to preserve momentum across targets.

## Compatibility

- Compatible numeric attributes and path command skeletons interpolate.
- Incompatible element types or path topology use keyed enter/exit opacity.
- Stable keys preserve DOM identity, velocity, and presentation points.
- SVG interaction follows animated presentation geometry for keyed built-in and
  custom marks.
- Static SVG and Canvas ignore definition motion and paint final geometry.
- The optional renderer is browser SVG only; it is not a Web Animations, View
  Transitions, Canvas, or native adapter.
