import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { crimeanWar } from '@charts-poc/demo-data/crimean-war'
import { barY, defineChart, fold, ruleY, stack } from '@tanstack/charts'
import { scaleLinear, scaleUtc } from 'd3-scale'

const causes = ['disease', 'wounds', 'other'] as const
const causeColors = ['#4269d0', '#ff725c', '#efb118']

export const stackedBarDefinition = (input: ExampleOptions) => {
  const rows = fold(crimeanWar.slice(input.revision), {
    fields: causes,
    as: { key: 'cause', value: 'deaths' },
  })

  return defineChart({
    marks: [
      barY(rows, {
        id: 'death-bars',
        x: 'date',
        y: 'deaths',
        z: 'cause',
        color: 'cause',
        layout: stack({ order: [...causes].reverse() }),
      }),
      ruleY([0]),
    ],
    x: {
      scale: scaleUtc,
      axis: { ticks: { count: 6, format: (value) => month.format(value) } },
    },
    y: {
      scale: scaleLinear,
      grid: true,
      axis: { ticks: { count: 5 }, label: 'Deaths' },
    },
    color: { domain: causes, range: causeColors },
  })
}

const month = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  timeZone: 'UTC',
})
export interface ExampleOptions {
  width: number
  height: number
  revision: number
  preview?: boolean
}

export const exampleAriaLabel = 'Crimean War deaths by cause'

export const createExampleChart = (options: ExampleOptions) =>
  defineChart(stackedBarDefinition(options), {
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
