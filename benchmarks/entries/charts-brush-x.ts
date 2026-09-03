import { mountChart } from '@tanstack/charts/dom'
import { brushX } from '@tanstack/charts/interaction/brush'
import type {
  BrushRange,
  BrushXChange,
} from '@tanstack/charts/interaction/brush'
import { controlledSignal } from '@tanstack/charts/interaction/signal'

const values: readonly number[] = [0, 1, 2, 3]

export const range = controlledSignal<BrushRange<number>, BrushXChange<number>>(
  { start: values[1], end: values[2] },
  () => {},
)

export const horizontalBrush = brushX({ range, values })
export { mountChart }
