import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { usCountyUnemployment } from '@tanstack/charts-data/us-county-unemployment'
import { defineChart } from '@tanstack/charts'
import {
  pie,
  polar,
  radialArc,
  radialDot,
  radialRule,
  radialText,
} from '@tanstack/charts/polar'
import { scaleLinear } from 'd3-scale'
import {
  gaugeBands,
  gaugeMaximum,
  gaugeTicks,
  type GaugeBand,
} from './transform'

const startAngle = -Math.PI / 2
const endAngle = Math.PI / 2
const angleScale = scaleLinear().domain([0, gaugeMaximum])
const radiusScale = scaleLinear().domain([0, 1])
const arcs = pie(gaugeBands, {
  value: 'value',
  startAngle,
  endAngle,
})
const bandIds: readonly GaugeBand['id'][] = ['low', 'elevated', 'high']
const bandColors = ['#22c55e', '#f59e0b', '#ef4444']

export const createExampleChart = (input: ChartOptions) => {
  const reading = usCountyUnemployment[(input.revision % 2) * 2]
  if (!reading) {
    throw new Error('County unemployment data is incomplete.')
  }

  return defineChart(
    {
      marks: [
        polar({
          angle: { scale: angleScale },
          radius: { scale: radiusScale },
          startAngle,
          endAngle,
          radiusRatio: 0.82,
          marks: [
            radialArc(arcs, {
              id: 'gauge-bands',
              key: 'id',
              innerRadius: ({ radius }) => radius * 0.72,
              color: 'id',
            }),
            radialRule(gaugeTicks, {
              id: 'gauge-ticks',
              key: 'id',
              angle: 'value',
              radius1: 0.76,
              radius2: 0.94,
              stroke: '#ffffff',
              strokeOpacity: 0.85,
              strokeWidth: 2,
            }),
            radialRule([reading], {
              id: 'gauge-needle',
              key: 'id',
              angle: 'rate',
              radius1: 0,
              radius2: 0.64,
              stroke: 'currentColor',
              strokeWidth: 4,
            }),
            radialDot([reading], {
              id: 'gauge-hub',
              key: 'id',
              angle: 'rate',
              radius: 0,
              r: 8,
              fill: 'currentColor',
            }),
            radialText([reading], {
              id: 'gauge-value',
              key: 'id',
              angle: 'rate',
              radius: 0,
              text: (row) => `${row.rate}%`,
              dy: 34,
              anchor: 'middle',
              baseline: 'middle',
              fill: 'currentColor',
              fontSize: 18,
              fontWeight: 700,
            }),
          ],
        }),
      ],
      color: { domain: bandIds, range: bandColors },
      margin: 0,
    },
    {
      keyboard: true,
      tooltip: {
        use: exampleTooltip,
        ...{
          format: ({ datum }) => {
            if ('label' in datum) {
              return `${datum.label} · ${datum.value} percentage-point band`
            }
            return `${datum.county}, ${datum.state} · ${datum.rate}% unemployment`
          },
        },
      },
    },
  )
}
export interface ChartOptions {
  revision: number
}

export const exampleAriaLabel = 'County unemployment gauge'

export const chart = createExampleChart({
  revision: 0,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
