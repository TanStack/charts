import { mountChart } from '@tanstack/charts/dom'
import { continuousCursor } from '@tanstack/charts/interaction/cursor'
import type {
  ContinuousCursorChange,
  ContinuousCursorPosition,
} from '@tanstack/charts/interaction/cursor'
import { controlledSignal } from '@tanstack/charts/interaction/signal'

type Position = ContinuousCursorPosition<number, number>

export const position = controlledSignal<
  Position | null,
  ContinuousCursorChange<number, number>
>({ x: 1, y: 2 }, () => {})

export const cursor = continuousCursor({
  position,
  xLabel: { format: (value) => `x ${value}` },
  yLabel: { format: (value) => `y ${value}` },
})

export { mountChart }
