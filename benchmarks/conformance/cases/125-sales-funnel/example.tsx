import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { areaX, defineChart, text } from '@tanstack/charts'
import { scaleLinear } from 'd3-scale'
import { funnelStagesForRevision } from './data'
import { funnelLayout } from './model'

const colors = ['#1e3a8a', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa']
const firstStageValue = funnelStagesForRevision(0)[0]?.value ?? 1

export const createExampleChart = (input: ChartOptions) => {
  const stages = funnelStagesForRevision(input.revision)
  const layout = funnelLayout(stages)

  return defineChart(
    {
      marks: [
        areaX(layout.points, {
          id: 'funnel-stages',
          x1: 'x1',
          x2: 'x2',
          y: 'y',
          z: 'id',
          color: 'id',
          key: (point) => `${point.id}:${point.boundary}`,
          fillOpacity: 1,
        }),
        text(layout.labels, {
          id: 'funnel-labels',
          x: 'x',
          y: 'y',
          text: 'text',
          key: 'id',
          anchor: 'start',
          fontSize: input.preview === true ? 8 : input.width < 400 ? 10 : 12,
          fontWeight: 600,
        }),
      ],
      x: { scale: scaleLinear().domain(layout.xDomain), axis: false },
      y: { scale: scaleLinear().domain(layout.yDomain), axis: false },
      color: { domain: stages.map((stage) => stage.id), range: colors },
      margin: 12,
    },
    {
      keyboard: true,
      tooltip: {
        use: exampleTooltip,
        ...{
          format: ({ datum }) =>
            `${datum.label} · ${datum.value.toLocaleString('en-US')} · ${Math.round(
              (datum.value / firstStageValue) * 100,
            )}% of visitors`,
        },
      },
    },
  )
}
export interface ChartOptions {
  width: number
  revision: number
  preview?: boolean
}

export const exampleAriaLabel = 'Sales conversion funnel'

export const chart = createExampleChart({
  width: 640,
  revision: 0,
  preview: false,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
