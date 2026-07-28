import { defineChart, link } from '@tanstack/charts'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { candleData, candleDomain } from './data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const definition = defineChart<ConformanceInput>()(({ input }) => {
  const rows = candleData(input.revision)
  const gains = rows.filter((row) => row.close >= row.open)
  const losses = rows.filter((row) => row.close < row.open)
  return {
    marks: [
      link(rows, {
        x1: 'date',
        y1: 'low',
        x2: 'date',
        y2: 'high',
        key: 'id',
        stroke: '#64748b',
        strokeWidth: 1,
      }),
      link(gains, {
        x1: 'date',
        y1: 'open',
        x2: 'date',
        y2: 'close',
        key: 'id',
        stroke: '#10b981',
        strokeWidth: 5,
      }),
      link(losses, {
        x1: 'date',
        y1: 'open',
        x2: 'date',
        y2: 'close',
        key: 'id',
        stroke: '#ef4444',
        strokeWidth: 5,
      }),
    ],
    x: { scale: scaleUtc().domain(candleDomain) },
    y: {
      scale: scaleLinear().domain([75, 130]),
      grid: true,
      label: 'Price',
    },
  }
})

export const mount = tanstackMount(definition, 'Daily candlestick chart')
