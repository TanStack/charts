import { createElement } from 'react'
import {
  CartesianGrid,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import { cars } from '@charts-poc/demo-data/cars'
import { selectManyPointData } from './selection'
import { groupCarsByCylinder } from './transform'
import { rechartsMount } from '../../shared/recharts-mount'
import type { ConformanceInput } from '../../types'

const colors = ['#2563eb', '#7c3aed', '#db2777', '#f97316', '#0f766e']

function chart(input: ConformanceInput) {
  const series = groupCarsByCylinder(selectManyPointData(cars, input.revision))
  const children = [
    createElement(CartesianGrid, {
      key: 'grid',
      stroke: '#e2e8f0',
    }),
    createElement(XAxis, {
      key: 'x',
      type: 'number',
      dataKey: 'weight (lb)',
    }),
    createElement(YAxis, {
      key: 'y',
      type: 'number',
      dataKey: '0-60 mph (s)',
      width: 60,
    }),
    createElement(ZAxis, {
      key: 'z',
      type: 'number',
      dataKey: 'displacement (cc)',
      range: [16, 64],
    }),
    ...series.map((item, index) =>
      createElement(Scatter, {
        key: item.cylinders,
        name: `${item.cylinders} cylinders`,
        data: item.rows,
        fill: colors[index % colors.length],
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

export const mount = rechartsMount(chart, 'Automobile specifications scatter')
