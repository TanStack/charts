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
      title: 'Seattle weather with three y axes',
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
        key: 'temperature-axis',
        yAxisId: 'temperature',
        tickCount: 5,
        width: 60,
        label: {
          value: 'Temperature (°C)',
          angle: -90,
          position: 'insideLeft',
          fill: '#8884d8',
          fontSize: 12,
          fontWeight: 700,
          opacity: 0.8,
        },
      }),
      createElement(YAxis, {
        key: 'precipitation-axis',
        yAxisId: 'precipitation',
        orientation: 'right',
        tickCount: 5,
        width: 72,
        label: {
          value: 'Precipitation (mm)',
          angle: 90,
          position: 'insideRight',
          fill: '#413ea0',
          fontSize: 12,
          fontWeight: 700,
          opacity: 0.8,
        },
      }),
      createElement(YAxis, {
        key: 'wind-axis',
        yAxisId: 'wind',
        orientation: 'right',
        tickCount: 5,
        width: 60,
        label: {
          value: 'Wind (m/s)',
          angle: 90,
          position: 'insideRight',
          fill: '#ef4444',
          fontSize: 12,
          fontWeight: 700,
          opacity: 0.8,
        },
      }),
      createElement(Area, {
        key: 'area',
        type: 'monotone',
        dataKey: 'temp_max',
        yAxisId: 'temperature',
        fill: '#8884d8',
        fillOpacity: 0.2,
        stroke: '#8884d8',
        isAnimationActive: false,
      }),
      createElement(Bar, {
        key: 'bar',
        dataKey: 'precipitation',
        yAxisId: 'precipitation',
        barSize: 20,
        fill: '#413ea0',
        isAnimationActive: false,
      }),
      createElement(Line, {
        key: 'line',
        type: 'monotone',
        dataKey: 'temp_min',
        yAxisId: 'temperature',
        stroke: '#ff7300',
        strokeWidth: 2,
        dot: false,
        isAnimationActive: false,
      }),
      createElement(Scatter, {
        key: 'scatter',
        dataKey: 'wind',
        yAxisId: 'wind',
        fill: '#ef4444',
        isAnimationActive: false,
      }),
    ],
  )
}

export const mount = rechartsMount(chart, 'Seattle weather with three y axes')
