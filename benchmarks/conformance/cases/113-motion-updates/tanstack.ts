import { barY, defineChart, lineY } from '@tanstack/charts'
import { scaleBand, scaleLinear } from 'd3-scale'
import { updateStages as stages } from './model'
import { tanstackCase } from '../../shared/mount'
import type { ChartMotionTweenTransition } from '@tanstack/charts/motion'
import type { UpdateRow } from './model'

export { mount } from './view'

export interface UpdateSettings {
  duration: number
  easing: ChartMotionTweenTransition['easing']
  spring: boolean
  stiffness: number
  damping: number
  mass: number
}

export function motionUpdatesDefinition(
  rows: readonly UpdateRow[],
  settings: UpdateSettings,
) {
  return defineChart({
    motion: {
      transition: settings.spring
        ? {
            type: 'spring',
            stiffness: settings.stiffness,
            damping: settings.damping,
            mass: settings.mass,
          }
        : {
            type: 'tween',
            duration: settings.duration,
            easing: settings.easing,
          },
    },
    marks: [
      barY(rows, {
        id: 'actual',
        x: 'period',
        y: 'actual',
        key: 'id',
        fill: '#7c3aed',
        radius: 7,
        inset: 4,
        motion(context) {
          if (settings.spring) {
            if (context.phase === 'exit') {
              return {
                transition: {
                  type: 'spring',
                  stiffness: settings.stiffness * 1.25,
                  damping: settings.damping * 1.15,
                },
              }
            }
            if (context.datum?.featured) {
              return {
                delay: context.phase === 'enter' ? 70 : 0,
                transition: {
                  type: 'spring',
                  mass: settings.mass * 1.35,
                },
              }
            }
            return undefined
          }
          if (context.phase === 'exit') {
            return {
              transition: {
                type: 'tween',
                duration: settings.duration * 0.45,
              },
            }
          }
          if (context.datum?.featured) {
            return {
              delay: settings.duration * 0.16,
              transition: {
                type: 'tween',
                duration: settings.duration * 0.6,
              },
            }
          }
          return undefined
        },
      }),
      lineY(rows, {
        id: 'target',
        x: 'period',
        y: 'target',
        key: 'id',
        stroke: '#f97316',
        strokeWidth: 3,
        motion: {
          delay: 80,
          transition: settings.spring
            ? {
                type: 'spring',
                stiffness: settings.stiffness * 0.78,
              }
            : {
                type: 'tween',
                duration: settings.duration * 0.82,
              },
        },
      }),
    ],
    x: { scale: scaleBand().domain(rows.map((row) => row.period)) },
    y: { scale: scaleLinear().domain([0, 100]) },
    guides: false,
    margin: { top: 20, right: 20, bottom: 20, left: 20 },
    maxFocusDistance: 28,
  })
}

export function readEasing(value: string): UpdateSettings['easing'] {
  return value === 'linear' ||
    value === 'ease' ||
    value === 'ease-in' ||
    value === 'ease-out' ||
    value === 'ease-in-out'
    ? value
    : undefined
}

export function springRegime(settings: UpdateSettings) {
  const ratio =
    settings.damping / (2 * Math.sqrt(settings.stiffness * settings.mass))
  if (ratio < 0.99) return 'underdamped'
  if (ratio > 1.01) return 'overdamped'
  return 'critical'
}

export const catalogCase = tanstackCase(
  (input) =>
    motionUpdatesDefinition(
      stages[Math.abs(input.revision) % stages.length] ?? stages[0],
      {
        duration: 1_100,
        easing: undefined,
        spring: false,
        stiffness: 170,
        damping: 14,
        mass: 1,
      },
    ),
  'Keyed actuals and targets during interrupted updates',
)
