import { penguins } from '@charts-poc/demo-data/penguins'
import { createElement } from 'react'
import { Bar, BarChart, XAxis, YAxis } from 'recharts'
import { countPenguinsBySpecies, divergeMaleCounts } from './transform'
import { rechartsMount } from '../../shared/recharts-mount'
import type { ConformanceInput } from '../../types'

function formatCount(value: number): string {
  return Math.abs(value).toLocaleString('en-US')
}

function chart(input: ConformanceInput) {
  const sourceRows = input.revision % 2 === 0 ? penguins : penguins.slice(0, -8)
  const rows = divergeMaleCounts(countPenguinsBySpecies(sourceRows))

  return createElement(
    BarChart,
    {
      width: input.width,
      height: input.height,
      data: rows,
      layout: 'vertical',
      stackOffset: 'sign',
      barCategoryGap: 1,
      margin: { top: 20, right: 20, bottom: 30, left: 20 },
      accessibilityLayer: true,
      role: 'img',
      title: 'Palmer penguins by species and sex',
    },
    [
      createElement(XAxis, {
        key: 'x',
        type: 'number',
        domain: [-80, 80],
        ticks: [-80, -40, 0, 40, 80],
        tickFormatter: formatCount,
        height: 50,
        label: {
          value: 'Penguins observed',
          position: 'insideBottom',
        },
      }),
      createElement(YAxis, {
        key: 'y',
        type: 'category',
        dataKey: 'species',
        width: 70,
      }),
      createElement(Bar, {
        key: 'male',
        dataKey: 'male',
        stackId: 'penguins',
        fill: '#2563eb',
        isAnimationActive: false,
      }),
      createElement(Bar, {
        key: 'female',
        dataKey: 'female',
        stackId: 'penguins',
        fill: '#db2777',
        isAnimationActive: false,
      }),
    ],
  )
}

export const mount = rechartsMount(chart, 'Palmer penguins by species and sex')
