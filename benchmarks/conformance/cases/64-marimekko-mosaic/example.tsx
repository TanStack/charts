import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import {
  colorLegend,
  defineChart,
  groupBy,
  mosaicY,
  rect,
  select,
  text,
} from '@tanstack/charts'
import { format } from 'd3-format'
import { scaleLinear } from 'd3-scale'
import { survey } from '@tanstack/charts-data/survey'
import { isMosaicResponse, mosaicResponses } from './selection'

const percent = format('.0%')
const colors = ['#991b1b', '#ef4444', '#cbd5e1', '#60a5fa', '#1d4ed8']

export const createExampleChart = (input?: ChartOptions) => {
  const observations = survey.filter(isMosaicResponse)
  const counts = groupBy(observations, {
    by: {
      Question: 'Question',
      Response: 'Response',
    },
    outputs: { count: { reduce: 'count' } },
  })
  const cells = mosaicY(counts, {
    x: 'Question',
    y: 'Response',
    value: 'count',
    yOrder: mosaicResponses,
  })
  const labels = select(cells, {
    by: 'xValue',
    select: 'first',
  })

  return defineChart(
    {
      marks: [
        rect(cells, {
          id: 'response-cells',
          x: 'x',
          x1: 'x1',
          x2: 'x2',
          y: 'y',
          y1: 'y1',
          y2: 'y2',
          color: 'yValue',
          key: (datum) => `${datum.xValue}:${datum.yValue}`,
          inset: 1,
        }),
        ...(input?.preview === true
          ? []
          : [
              text(labels, {
                id: 'question-labels',
                x: 'x',
                y: () => 1.055,
                text: 'Question',
                key: 'xValue',
                fill: '#334155',
                fontSize: 11,
              }),
            ]),
      ],
      x: {
        scale: scaleLinear().domain([0, 1]),
        axis: { ticks: { format: percent }, label: 'Share of responses' },
      },
      y: {
        scale: scaleLinear().domain([0, 1.12]),
        axis: { ticks: { format: percent }, label: 'Within-question share' },
      },
      color: {
        domain: mosaicResponses,
        range: colors,
        legend: colorLegend({ label: 'Response' }),
      },
    },
    { keyboard: true, tooltip: exampleTooltip },
  )
}
export interface ChartOptions {
  preview?: boolean
}

export const exampleAriaLabel = 'Marimekko survey composition'

export const chart = createExampleChart({
  preview: false,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
