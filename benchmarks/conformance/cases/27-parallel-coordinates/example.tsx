import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import {
  colorLegend,
  defineChart,
  dot,
  lineY,
  normalize,
  select,
} from '@tanstack/charts'
import { fold } from '@tanstack/charts/transform/fold'
import { decathlon } from '@tanstack/charts-data/decathlon'
import { scaleBand, scaleLinear } from 'd3-scale'
import { decathlonEvents, timedEvents } from './selection'

const colors = [
  '#2563eb',
  '#ea580c',
  '#059669',
  '#7c3aed',
  '#db2777',
  '#0891b2',
  '#ca8a04',
]

export const foldedDecathlon = fold(decathlon, {
  fields: decathlonEvents,
  as: { key: 'event', value: 'result' },
})
export const normalizedDecathlon = normalize(foldedDecathlon, {
  by: 'event',
  value: (datum) =>
    timedEvents.has(datum.event) ? -datum.result : datum.result,
  basis: 'extent',
  as: 'relativePerformance',
})
export const representativeProfiles = select(normalizedDecathlon, {
  by: { Country: 'Country', event: 'event' },
  select: 'last',
})

export const createExampleChart = () =>
  defineChart(
    {
      marks: [
        lineY(representativeProfiles, {
          id: 'country-lines',
          x: 'event',
          y: ({ relativePerformance }) => relativePerformance * 100,
          color: 'Country',
          key: ({ Country, event }) => `${Country}:${event}`,
          strokeWidth: 1.75,
        }),
        dot(representativeProfiles, {
          id: 'country-points',
          x: 'event',
          y: ({ relativePerformance }) => relativePerformance * 100,
          color: 'Country',
          key: ({ Country, event }) => `${Country}:${event}`,
          r: 2.75,
        }),
      ],
      x: {
        scale: scaleBand<string>().domain(decathlonEvents).padding(0.1),
      },
      y: {
        scale: scaleLinear().domain([0, 100]),
        grid: true,
        axis: { label: 'Relative performance within sample' },
      },
      color: {
        range: colors,
        legend: colorLegend({ label: 'Country' }),
      },
    },
    { keyboard: true, tooltip: exampleTooltip },
  )

export const exampleAriaLabel = 'Parallel coordinates model comparison'

export const chart = createExampleChart()

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
