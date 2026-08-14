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
import { survey } from '@charts-poc/demo-data/survey'
import { isMosaicResponse, mosaicResponses } from './selection'

const percent = format('.0%')
const colors = ['#991b1b', '#ef4444', '#cbd5e1', '#60a5fa', '#1d4ed8']

export const marimekkoDefinition = (input?: ExampleOptions) => {
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

  return defineChart({
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
  })
}
export interface ExampleOptions {
  width: number
  height: number
  revision: number
  preview?: boolean
}

export const exampleAriaLabel = 'Marimekko survey composition'

export const createExampleChart = (options: ExampleOptions) =>
  defineChart(marimekkoDefinition(options), {
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
