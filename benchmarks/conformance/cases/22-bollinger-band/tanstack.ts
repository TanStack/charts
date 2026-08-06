import { areaY, defineChart, deviation, lineY, window } from '@tanstack/charts'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { aapl } from '@charts-poc/demo-data/aapl'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput, ConformanceMount } from '../../types'
import { selectBollingerData } from './selection'

const windowSize = 20
const deviationMultiplier = 2

export const bollingerDefinition = (input: ConformanceInput) => {
  const rows = window(selectBollingerData(aapl, input.revision), {
    size: windowSize,
    orderBy: 'Date',
    anchor: 'end',
    partial: false,
    outputs: {
      meanClose: { value: 'Close', reduce: 'mean' },
      closeDeviation: { value: 'Close', reduce: deviation },
    },
  })

  return defineChart({
    marks: [
      areaY(rows, {
        id: 'bollinger-band',
        x: 'Date',
        y1: (row) => row.meanClose - row.closeDeviation * deviationMultiplier,
        y2: (row) => row.meanClose + row.closeDeviation * deviationMultiplier,
        fill: '#7c3aed',
        fillOpacity: 0.18,
      }),
      lineY(rows, {
        id: 'bollinger-mean',
        x: 'Date',
        y: 'meanClose',
        stroke: '#7c3aed',
        strokeWidth: 2.25,
      }),
    ],
    x: { scale: scaleUtc, axis: { label: 'Date' } },
    y: { scale: scaleLinear, grid: true, axis: { label: 'Apple close (USD)' } },
  })
}

export const mount: ConformanceMount = tanstackMount(
  bollingerDefinition,
  'Twenty-day Apple Bollinger band',
)
