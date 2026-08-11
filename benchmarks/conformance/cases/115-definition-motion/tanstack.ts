import { barY, defineChart, lineY } from '@tanstack/charts'
import { scaleBand, scaleLinear } from 'd3-scale'
import { definitionMotionStages } from './model'
import { tanstackCase } from '../../shared/mount'
import type { DefinitionMotionRow } from './model'

export { mount } from './view'

export function definitionMotionDefinition(
  rows: readonly DefinitionMotionRow[],
  preview = false,
) {
  const maximum = Math.max(100, ...rows.map((row) => row.actual))
  const yMaximum = Math.ceil(maximum / 20) * 20
  const guideMotion = {
    transition: {
      type: 'tween' as const,
      duration: 260,
      easing: 'ease-out' as const,
    },
  }
  return defineChart({
    motion: {
      transition: { type: 'spring', stiffness: 170, damping: 18, mass: 1 },
    },
    marks: [
      barY(rows, {
        id: 'actual',
        x: 'period',
        y: 'actual',
        key: 'id',
        fill: '#7c3aed',
        radius: 6,
        inset: 5,
        motion(context) {
          return {
            delay: context.phase === 'enter' ? context.datumIndex * 34 : 0,
            transition: context.datum?.featured
              ? { type: 'spring', mass: 1.45 }
              : undefined,
          }
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
          transition: {
            type: 'tween',
            duration: 520,
            easing: 'ease-in-out',
          },
        },
      }),
    ],
    x: {
      scale: scaleBand().domain(rows.map((row) => row.period)),
      axis: {
        motion: guideMotion,
        ticks: { motion: guideMotion },
        tickLabels: {
          motion(context) {
            return {
              delay: context.datumIndex * 18,
              transition: { type: 'tween', duration: 220 },
            }
          },
        },
        label: { text: 'Period', motion: guideMotion },
      },
    },
    y: {
      scale: scaleLinear().domain([0, yMaximum]),
      grid: true,
      axis: {
        motion: guideMotion,
        ticks: { motion: guideMotion },
        tickLabels: { motion: guideMotion },
        label: { text: 'Value', motion: guideMotion },
      },
    },
    margin: preview
      ? { top: 12, right: 4, bottom: 40, left: 46 }
      : { top: 20, right: 24 },
    maxFocusDistance: 32,
  })
}

export const catalogCase = tanstackCase(
  (input) =>
    definitionMotionDefinition(
      definitionMotionStages[
        Math.abs(input.revision) % definitionMotionStages.length
      ] ?? definitionMotionStages[0],
      input.preview === true,
    ),
  'Definition-owned chart, mark, datum, and guide motion',
  true,
  { guides: true, margin: true },
)
