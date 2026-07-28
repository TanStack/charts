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
import { composedData } from './data'
import type { ConformanceInput } from '../../types'

function chart(input: ConformanceInput) {
  return createElement(
    ComposedChart,
    {
      width: input.width,
      height: input.height,
      data: composedData(input.revision),
      margin: { top: 20, right: 20, bottom: 20, left: 20 },
      accessibilityLayer: true,
      role: 'img',
      title: 'Layered categorical measures',
    },
    [
      createElement(CartesianGrid, {
        key: 'grid',
        stroke: '#e2e8f0',
      }),
      createElement(XAxis, {
        key: 'x',
        dataKey: 'name',
        scale: 'band',
      }),
      createElement(YAxis, {
        key: 'y',
        domain: [0, 1_800],
        ticks: [0, 450, 900, 1_350, 1_800],
        width: 60,
      }),
      createElement(Area, {
        key: 'area',
        type: 'monotone',
        dataKey: 'amt',
        fill: '#8884d8',
        fillOpacity: 0.2,
        stroke: '#8884d8',
        isAnimationActive: false,
      }),
      createElement(Bar, {
        key: 'bar',
        dataKey: 'pv',
        barSize: 20,
        fill: '#413ea0',
        isAnimationActive: false,
      }),
      createElement(Line, {
        key: 'line',
        type: 'monotone',
        dataKey: 'uv',
        stroke: '#ff7300',
        strokeWidth: 2,
        dot: false,
        isAnimationActive: false,
      }),
      createElement(Scatter, {
        key: 'scatter',
        dataKey: 'cnt',
        fill: '#ef4444',
        isAnimationActive: false,
      }),
    ],
  )
}

export const mount = rechartsMount(chart, 'Layered categorical measures')
