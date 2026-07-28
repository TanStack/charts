import { createElement } from 'react'
import { Bar, BarChart, XAxis, YAxis } from 'recharts'
import { rechartsMount } from '../../shared/recharts-mount'
import { populationData } from './data'
import type { ConformanceInput } from '../../types'

function formatPercent(value: number): string {
  return `${Math.abs(value)}%`
}

function chart(input: ConformanceInput) {
  return createElement(
    BarChart,
    {
      width: input.width,
      height: input.height,
      data: populationData(input.revision),
      layout: 'vertical',
      stackOffset: 'sign',
      barCategoryGap: 1,
      margin: { top: 20, right: 20, bottom: 30, left: 20 },
      accessibilityLayer: true,
      role: 'img',
      title: 'Population by age and sex',
    },
    [
      createElement(XAxis, {
        key: 'x',
        type: 'number',
        domain: [-10, 10],
        ticks: [-10, -5, 0, 5, 10],
        tickFormatter: formatPercent,
        height: 50,
        label: {
          value: '% of total population',
          position: 'insideBottom',
        },
      }),
      createElement(YAxis, {
        key: 'y',
        type: 'category',
        dataKey: 'age',
        width: 60,
      }),
      createElement(Bar, {
        key: 'male',
        dataKey: 'male',
        stackId: 'population',
        fill: '#2563eb',
        isAnimationActive: false,
      }),
      createElement(Bar, {
        key: 'female',
        dataKey: 'female',
        stackId: 'population',
        fill: '#db2777',
        isAnimationActive: false,
      }),
    ],
  )
}

export const mount = rechartsMount(chart, 'Population by age and sex')
