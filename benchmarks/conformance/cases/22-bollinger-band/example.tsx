import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import {
  areaY,
  defineChart,
  deviation,
  lineY,
  rollingWindow,
} from '@tanstack/charts'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { aapl } from '@charts-poc/demo-data/aapl'
import { selectBollingerData } from './selection'

const windowSize = 20
const deviationMultiplier = 2

function bollingerRows(input: ExampleOptions) {
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

export const bollingerDefinition = (input: ExampleOptions) =>
  bollingerChart(bollingerRows(input))

export const catalogBollingerDefinition = (input: ExampleOptions) => {
  const rows = bollingerRows(input)
  return bollingerChart(rows)
}
export interface ExampleOptions {
  width: number
  height: number
  revision: number
  preview?: boolean
}

export const exampleAriaLabel = 'Twenty-day Apple Bollinger band'

export const createExampleChart = (options: ExampleOptions) =>
  defineChart(catalogBollingerDefinition(options), {
    keyboard: true,
    tooltip: exampleTooltip,
  })

export const chart = createExampleChart({
  width: 640,
  height: 480,
  revision: 0,
  preview: false,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
