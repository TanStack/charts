import { usCountyUnemployment } from '@tanstack/charts-data/us-county-unemployment'
import { createElement } from 'react'
import { Cell, Pie, PieChart } from 'recharts'
import { gaugeBands, gaugeMaximum, gaugeTicks } from './transform'
import { rechartsMount } from '../../shared/recharts-mount'
import type { ConformanceInput } from '../../types'

const bandColors = ['#22c55e', '#f59e0b', '#ef4444']

function chart(input: ConformanceInput) {
  const reading = usCountyUnemployment[(input.revision % 2) * 2]
  if (!reading) {
    throw new Error('County unemployment data is incomplete.')
  }
  const radius = Math.min(input.width, input.height) * 0.41
  const cx = input.width / 2
  const cy = input.height / 2
  const angle = -Math.PI / 2 + (reading.rate / gaugeMaximum) * Math.PI
  const needleRadius = radius * 0.64
  const x2 = cx + Math.sin(angle) * needleRadius
  const y2 = cy - Math.cos(angle) * needleRadius

  return createElement(
    PieChart,
    {
      width: input.width,
      height: input.height,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      accessibilityLayer: true,
    },
    [
      createElement(
        Pie,
        {
          key: 'bands',
          data: gaugeBands,
          dataKey: 'value',
          nameKey: 'label',
          cx,
          cy,
          innerRadius: radius * 0.72,
          outerRadius: radius,
          startAngle: 180,
          endAngle: 0,
          stroke: 'none',
          isAnimationActive: false,
        },
        gaugeBands.map((band, index) =>
          createElement(Cell, {
            key: band.id,
            fill: bandColors[index],
            stroke: 'none',
          }),
        ),
      ),
      ...gaugeTicks.map((tick) => {
        const tickAngle = -Math.PI / 2 + (tick.value / gaugeMaximum) * Math.PI

        return createElement('line', {
          key: tick.id,
          className: 'recharts-reference-line-line',
          x1: cx + Math.sin(tickAngle) * radius * 0.76,
          y1: cy - Math.cos(tickAngle) * radius * 0.76,
          x2: cx + Math.sin(tickAngle) * radius * 0.94,
          y2: cy - Math.cos(tickAngle) * radius * 0.94,
          stroke: '#ffffff',
          strokeOpacity: 0.85,
          strokeWidth: 2,
        })
      }),
      createElement('line', {
        key: 'needle',
        className: 'recharts-reference-line-line',
        x1: cx,
        y1: cy,
        x2,
        y2,
        stroke: 'currentColor',
        strokeWidth: 4,
      }),
      createElement('circle', {
        key: 'hub',
        className: 'recharts-dot',
        cx,
        cy,
        r: 8,
        fill: 'currentColor',
      }),
      createElement(
        'text',
        {
          key: 'value',
          className: 'recharts-text',
          x: cx,
          y: cy + 34,
          fill: 'currentColor',
          fontSize: 18,
          fontWeight: 700,
          textAnchor: 'middle',
          dominantBaseline: 'middle',
        },
        `${reading.rate}%`,
      ),
    ],
  )
}

export const mount = rechartsMount(chart, 'County unemployment gauge')
