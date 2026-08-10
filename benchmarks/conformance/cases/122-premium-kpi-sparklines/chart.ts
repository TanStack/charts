import { areaY, d3Curve, defineChart, lineY } from '@tanstack/charts'
import { motion } from '@tanstack/charts/motion'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { scalePoint } from '@tanstack/charts/scales/point'
import { curveMonotoneX } from 'd3-shape'
import type { PremiumKpiId, PremiumKpiMetric, PremiumKpiPoint } from './model'

const monotone = d3Curve(curveMonotoneX)
const accentFallbacks = {
  revenue: '#6d5dfc',
  customers: '#0f91c7',
  churn: '#0c9b6c',
} satisfies Record<PremiumKpiId, string>

export const premiumKpiSpring = {
  type: 'spring' as const,
  stiffness: 180,
  damping: 24,
  mass: 0.8,
}

export function premiumKpiDefinition(metric: PremiumKpiMetric) {
  const values = metric.rows.map((row) => row.value)
  const minimum = Math.min(...values)
  const maximum = Math.max(...values)
  const padding = Math.max((maximum - minimum) * 0.16, 0.1)
  const baseline = minimum - padding
  const accent = `var(--premium-kpi-accent, ${accentFallbacks[metric.id]})`
  const line = lineY(metric.rows, {
    id: `${metric.id}-line`,
    x: 'period',
    y: 'value',
    key: 'id',
    stroke: accent,
    strokeWidth: 2.4,
    curve: monotone,
  })
  const marks =
    metric.surface === 'area'
      ? [
          areaY(metric.rows, {
            id: `${metric.id}-area`,
            x: 'period',
            y: 'value',
            y1: baseline,
            key: 'id',
            fill: `url(#${metric.id}-fill)`,
            fillOpacity: 1,
            curve: monotone,
          }),
          line,
        ]
      : [line]

  return defineChart(
    defineChart({
      guides: false,
      marks,
      gradients:
        metric.surface === 'area'
          ? [
              {
                id: `${metric.id}-fill`,
                x1: 0,
                y1: 0,
                x2: 0,
                y2: 1,
                stops: [
                  {
                    offset: 0,
                    color: accent,
                    opacity: 0.26,
                  },
                  {
                    offset: 1,
                    color: accent,
                    opacity: 0,
                  },
                ],
              },
            ]
          : [],
      x: {
        scale: scalePoint<number>()
          .domain(metric.rows.map((row) => row.period))
          .padding(0.08),
        axis: false,
      },
      y: {
        scale: scaleLinear().domain([baseline, maximum + padding]),
        axis: false,
      },
      margin: { top: 4, right: 3, bottom: 3, left: 3 },
      clip: true,
      motion: { transition: premiumKpiSpring },
    }),
    {
      focus: false,
      pointer: false,
      keyboard: false,
      tooltip: false,
      svgAnimation: false,
    },
  )
}

export function createPremiumKpiRenderer(initial = true) {
  return motion<PremiumKpiPoint, number, number>({
    initial,
    respectReducedMotion: true,
    transition: premiumKpiSpring,
  })
}
