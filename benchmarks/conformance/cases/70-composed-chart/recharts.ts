import { weather } from '@tanstack/charts-data/weather'
import { createElement } from 'react'
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
} from 'recharts'
import { rechartsMount } from '../../shared/recharts-mount'
import type { ConformanceInput } from '../../types'

const dateFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

function chart(input: ConformanceInput) {
  const start = input.revision % 2 === 0 ? 37 : 68
  const rows = weather.slice(start, start + 6)

  return createElement(
    ComposedChart,
    {
      width: input.width,
      height: input.height,
      data: rows,
      margin: { top: 20, right: 20, bottom: 20, left: 20 },
      accessibilityLayer: true,
      role: 'img',
      title: 'Layered Seattle weather',
    },
    [
      createElement(CartesianGrid, {
        key: 'grid',
        stroke: '#e2e8f0',
      }),
      createElement(XAxis, {
        key: 'x',
        dataKey: 'date',
        scale: 'band',
        tickFormatter: (value: unknown) =>
          value instanceof Date ? dateFormat.format(value) : String(value),
      }),
      createElement(YAxis, {
        key: 'y',
        tickCount: 5,
        width: 60,
      }),
      createElement(Area, {
        key: 'area',
        type: 'monotone',
        dataKey: 'temp_max',
        fill: '#8884d8',
        fillOpacity: 0.2,
        stroke: '#8884d8',
        isAnimationActive: false,
      }),
      createElement(Bar, {
        key: 'bar',
        dataKey: 'precipitation',
        barSize: 20,
        fill: '#413ea0',
        isAnimationActive: false,
      }),
      createElement(Line, {
        key: 'line',
        type: 'monotone',
        dataKey: 'temp_min',
        stroke: '#ff7300',
        strokeWidth: 2,
        dot: false,
        isAnimationActive: false,
      }),
      createElement(Scatter, {
        key: 'scatter',
        dataKey: 'wind',
        fill: '#ef4444',
        isAnimationActive: false,
      }),
    ],
  )
}

export const mount = rechartsMount(chart, 'Layered Seattle weather')
