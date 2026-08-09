import {
  areaY,
  defineChart,
  deviation,
  lineY,
  rollingWindow,
} from '@tanstack/charts'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { aapl } from '@charts-poc/demo-data/aapl'
import { tanstackCase } from '../../shared/mount'
import { samplePreviewData } from '../../shared/preview'
import type { ConformanceInput } from '../../types'
import { selectBollingerData } from './selection'

const windowSize = 20
const deviationMultiplier = 2

function bollingerRows(input: ConformanceInput) {
  const rows = rollingWindow(selectBollingerData(aapl, input.revision), {
    size: windowSize,
    orderBy: 'Date',
    anchor: 'end',
    partial: false,
    outputs: {
      meanClose: { value: 'Close', reduce: 'mean' },
      closeDeviation: { value: 'Close', reduce: deviation },
    },
  })
  return rows
}

function bollingerChart(
  rows: readonly ReturnType<typeof bollingerRows>[number][],
) {
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

export const bollingerDefinition = (input: ConformanceInput) =>
  bollingerChart(bollingerRows(input))

const catalogBollingerDefinition = (input: ConformanceInput) => {
  const rows = bollingerRows(input)
  return bollingerChart(
    samplePreviewData(rows, input, 80, [
      (row) => row.Date.getTime(),
      (row) => row.meanClose - row.closeDeviation * deviationMultiplier,
      (row) => row.meanClose + row.closeDeviation * deviationMultiplier,
    ]),
  )
}

export const catalogCase = tanstackCase(
  catalogBollingerDefinition,
  'Twenty-day Apple Bollinger band',
)

export const mount = catalogCase.mount
