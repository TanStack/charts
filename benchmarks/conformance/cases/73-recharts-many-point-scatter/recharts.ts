import { createElement } from 'react'
import {
  CartesianGrid,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import { manyPointSeries } from './data'
import { rechartsMount } from '../../shared/recharts-mount'
import type { ConformanceInput } from '../../types'

function chart(input: ConformanceInput) {
  const series = manyPointSeries(input.revision)
  const children = [
    createElement(CartesianGrid, {
      key: 'grid',
      stroke: '#e2e8f0',
    }),
    createElement(XAxis, {
      key: 'x',
      type: 'number',
      dataKey: 'x',
      domain: [0, 100],
      ticks: [0, 20, 40, 60, 80, 100],
    }),
    createElement(YAxis, {
      key: 'y',
      type: 'number',
      dataKey: 'y',
      domain: [0, 100],
      ticks: [0, 20, 40, 60, 80, 100],
      width: 60,
    }),
    createElement(ZAxis, {
      key: 'z',
      type: 'number',
      dataKey: 'z',
      domain: [0, 100],
      range: [16, 64],
    }),
    ...series.map((item) =>
      createElement(Scatter, {
        key: item.name,
        name: item.name,
        data: item.points,
        fill: item.status === 'passed' ? '#22c55e' : '#ef4444',
        fillOpacity: 0.72,
        isAnimationActive: false,
      }),
    ),
  ]

  return createElement(
    ScatterChart,
    {
      width: input.width,
      height: input.height,
      margin: { top: 20, right: 20, bottom: 20, left: 20 },
      accessibilityLayer: true,
    },
    children,
  )
}

export const mount = rechartsMount(chart, 'Many-point scatter performance')
