import { areaY, defineChart, deviation, lineY, window } from '@tanstack/charts'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { aapl } from '@charts-poc/demo-data/aapl'
import type { AaplRow } from '@charts-poc/demo-data/aapl'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'
import { selectBollingerData } from './selection'
import { samplePreviewData } from '../../shared/preview'

interface BollingerPoint extends AaplRow {
  meanClose: number
  lowerClose: number
  upperClose: number
}

const windowSize = 20
const deviationMultiplier = 2

const definition = (input: ConformanceInput) => {
  const rows = samplePreviewData(
    bollingerIntervals(selectBollingerData(aapl, input.revision)),
    input,
    80,
    [
      (row) => row.Date.getTime(),
      (row) => row.lowerClose,
      (row) => row.upperClose,
    ],
  )

  return defineChart({
    marks: [
      areaY(rows, {
        x: 'Date',
        y1: 'lowerClose',
        y2: 'upperClose',
        fill: '#7c3aed',
        fillOpacity: 0.18,
      }),
      lineY(rows, {
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

export const mount = tanstackMount(
  definition,
  'Twenty-day Apple Bollinger band',
)

function bollingerIntervals(
  rows: readonly AaplRow[],
): readonly BollingerPoint[] {
  return window(rows, {
    size: windowSize,
    orderBy: 'Date',
    partial: false,
    outputs: {
      meanClose: { value: 'Close', reduce: 'mean' },
      closeDeviation: { value: 'Close', reduce: deviation },
    },
  }).map(({ closeDeviation, ...row }) => {
    const spread = closeDeviation * deviationMultiplier
    return {
      ...row,
      lowerClose: row.meanClose - spread,
      upperClose: row.meanClose + spread,
    }
  })
}
