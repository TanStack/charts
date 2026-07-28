import { createElement } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { rechartsMount } from '../../shared/recharts-mount'
import { mixedBarData } from './data'
import type { ConformanceInput } from '../../types'

function chart(input: ConformanceInput) {
  return createElement(
    BarChart,
    {
      width: input.width,
      height: input.height,
      data: mixedBarData(input.revision),
      margin: { top: 20, right: 20, bottom: 20, left: 20 },
      accessibilityLayer: true,
      role: 'img',
      title: 'Stacked and adjacent category bars',
    },
    [
      createElement(CartesianGrid, {
        key: 'grid',
        stroke: '#e2e8f0',
      }),
      createElement(XAxis, {
        key: 'x',
        dataKey: 'name',
      }),
      createElement(YAxis, {
        key: 'y',
        domain: [0, 13_000],
        ticks: [0, 3_250, 6_500, 9_750, 13_000],
        width: 60,
      }),
      createElement(Bar, {
        key: 'pv',
        dataKey: 'pv',
        stackId: 'stack',
        fill: '#8884d8',
        isAnimationActive: false,
      }),
      createElement(Bar, {
        key: 'amt',
        dataKey: 'amt',
        stackId: 'stack',
        fill: '#82ca9d',
        isAnimationActive: false,
      }),
      createElement(Bar, {
        key: 'uv',
        dataKey: 'uv',
        fill: '#ffc658',
        isAnimationActive: false,
      }),
    ],
  )
}

export const mount = rechartsMount(chart, 'Stacked and adjacent category bars')
