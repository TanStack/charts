import { motion } from '@tanstack/charts/motion'
import type { ChartValue } from '@tanstack/charts'
import type { ChartMotionSpringTransition } from '@tanstack/charts/motion'

export const shadcnSpringTransition = {
  type: 'spring',
  stiffness: 170,
  damping: 18,
  mass: 1,
} as const satisfies ChartMotionSpringTransition

export function createShadcnSpringRenderer<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>() {
  return motion<TDatum, TXValue, TYValue>({
    initial: 'always',
    transition: shadcnSpringTransition,
  })
}
