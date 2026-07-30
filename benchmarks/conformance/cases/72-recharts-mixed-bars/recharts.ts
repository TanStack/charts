import { weather } from '@charts-poc/demo-data/weather'
import { createElement } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { rechartsMount } from '../../shared/recharts-mount'
import type { ConformanceInput } from '../../types'

const dateFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

function chart(input: ConformanceInput) {
  const start = input.revision % 2 === 0 ? 37 : 68
  const rows = weather.slice(start, start + 7)

  return createElement(
    BarChart,
    {
      width: input.width,
      height: input.height,
      data: rows,
      margin: { top: 20, right: 20, bottom: 20, left: 20 },
      accessibilityLayer: true,
      role: 'img',
      title: 'Stacked and adjacent Seattle weather bars',
    },
    [
      createElement(CartesianGrid, {
        key: 'grid',
        stroke: '#e2e8f0',
      }),
      createElement(XAxis, {
        key: 'x',
        dataKey: 'date',
        tickFormatter: (value: unknown) =>
          value instanceof Date ? dateFormat.format(value) : String(value),
      }),
      createElement(YAxis, {
        key: 'y',
        tickCount: 5,
        width: 60,
      }),
      createElement(Bar, {
        key: 'precipitation',
        dataKey: 'precipitation',
        stackId: 'stack',
        fill: '#8884d8',
        isAnimationActive: false,
      }),
      createElement(Bar, {
        key: 'wind',
        dataKey: 'wind',
        stackId: 'stack',
        fill: '#82ca9d',
        isAnimationActive: false,
      }),
      createElement(Bar, {
        key: 'temp_max',
        dataKey: 'temp_max',
        fill: '#ffc658',
        isAnimationActive: false,
      }),
    ],
  )
}

export const mount = rechartsMount(
  chart,
  'Stacked and adjacent Seattle weather bars',
)
