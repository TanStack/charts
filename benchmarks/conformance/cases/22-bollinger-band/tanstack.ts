import { areaY, defineChart, lineY } from '@tanstack/charts'
import { deviation, mean } from 'd3-array'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { aapl } from '@charts-poc/demo-data/aapl'
import type { AaplRow } from '@charts-poc/demo-data/aapl'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput, ConformanceMount } from '../../types'
import { selectBollingerData } from './selection'

interface BollingerPoint extends AaplRow {
  meanClose: number
  lowerClose: number
  upperClose: number
}

const windowSize = 20
const deviationMultiplier = 2

const definition = (input: ConformanceInput) => {
  const rows = bollingerIntervals(selectBollingerData(aapl, input.revision))

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

export const mount: ConformanceMount = tanstackMount(
  definition,
  'Twenty-day Apple Bollinger band',
)

function bollingerIntervals(
  rows: readonly AaplRow[],
): readonly BollingerPoint[] {
  const output: BollingerPoint[] = []

  for (let index = windowSize - 1; index < rows.length; index++) {
    const row = rows[index]
    if (!row) continue
    const window = rows.slice(index - windowSize + 1, index + 1)
    const meanClose = mean(window, (point) => point.Close)
    if (meanClose === undefined) continue
    const spread =
      (deviation(window, (point) => point.Close) ?? 0) * deviationMultiplier
    output.push({
      ...row,
      meanClose,
      lowerClose: meanClose - spread,
      upperClose: meanClose + spread,
    })
  }

  return output
}
