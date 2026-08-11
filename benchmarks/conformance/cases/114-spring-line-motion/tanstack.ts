import { defineChart, lineY } from '@tanstack/charts'
import { scaleBand, scaleLinear } from 'd3-scale'
import { springLineStages } from './model'
import { tanstackCase } from '../../shared/mount'
import type { SpringLineRow } from './model'

export { mount } from './view'

export type SpringLineTransitionMode = 'spring' | 'tween'

export function springLineMotionDefinition(
  rows: readonly SpringLineRow[],
  mode: SpringLineTransitionMode,
) {
  return defineChart({
    motion: {
      transition:
        mode === 'spring'
          ? { type: 'spring', stiffness: 170, damping: 18, mass: 1 }
          : { type: 'tween', duration: 650, easing: 'ease-out' },
    },
    marks: [
      lineY(rows, {
        id: 'primary',
        x: 'period',
        y: 'primary',
        key: 'id',
        stroke: '#7c3aed',
        strokeWidth: 4,
      }),
      lineY(rows, {
        id: 'comparison',
        x: 'period',
        y: 'comparison',
        key: 'id',
        stroke: '#f97316',
        strokeWidth: 3,
        motion(context) {
          return {
            delay: context.phase === 'enter' ? 90 : 0,
            transition:
              mode === 'spring'
                ? { type: 'spring', mass: 1.2 }
                : {
                    type: 'tween',
                    duration: 820,
                    easing: 'ease-in-out',
                  },
          }
        },
      }),
    ],
    x: { scale: scaleBand().domain(rows.map((row) => row.period)) },
    y: { scale: scaleLinear().domain([0, 100]) },
    guides: false,
    margin: { top: 24, right: 24, bottom: 24, left: 24 },
  })
}

export const catalogCase = tanstackCase(
  (input) =>
    springLineMotionDefinition(
      springLineStages[Math.abs(input.revision) % springLineStages.length] ??
        springLineStages[0],
      'spring',
    ),
  'Primary and comparison series with spring motion',
)
