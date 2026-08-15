import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { crimeanWar } from '@tanstack/charts-data/crimean-war'
import { barY, defineChart, fold, ruleY, stack } from '@tanstack/charts'
import { scaleLinear, scaleUtc } from 'd3-scale'

const causes = ['disease', 'wounds', 'other'] as const
const causeColors = ['#4269d0', '#ff725c', '#efb118']

export const createExampleChart = (input: ChartOptions) => {
  const rows = fold(crimeanWar.slice(input.revision), {
    fields: causes,
    as: { key: 'cause', value: 'deaths' },
  })

  return defineChart(
    {
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
    },
    { keyboard: true, tooltip: exampleTooltip },
  )
}

const month = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  timeZone: 'UTC',
})
export interface ChartOptions {
  revision: number
}

export const exampleAriaLabel = 'Crimean War deaths by cause'

export const chart = createExampleChart({
  revision: 0,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
