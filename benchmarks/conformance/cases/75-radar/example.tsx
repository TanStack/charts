import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { defineChart, normalize, select } from '@tanstack/charts'
import { fold } from '@tanstack/charts/transform/fold'
import {
  angleGrid,
  polar,
  radialArea,
  radialGrid,
} from '@tanstack/charts/polar'
import { decathlon } from '@tanstack/charts-data/decathlon'
import { scaleLinear, scalePoint } from 'd3-scale'
import { curveLinearClosed } from 'd3-shape'
import { radarEvents, timedEvents } from './selection'
import type { PolarGuideLabelContext } from '@tanstack/charts/polar'

const ringValues = [0.2, 0.4, 0.6, 0.8, 1] as const
const angleScale = scalePoint<string>().domain(radarEvents)
const radiusScale = scaleLinear().domain([0, 1])

export const foldedDecathlon = fold(decathlon, {
  fields: radarEvents,
  as: { key: 'event', value: 'result' },
})
export const normalizedDecathlon = normalize(foldedDecathlon, {
  by: 'event',
  value: (datum) =>
    timedEvents.has(datum.event) ? -datum.result : datum.result,
  basis: 'extent',
  as: 'relativePerformance',
})
export const radarProfile = select(normalizedDecathlon, {
  by: 'event',
  select: 'first',
})

function angleLabelIsTopOrBottom(angle: number): boolean {
  return Math.abs(Math.sin(angle)) <= Math.SQRT1_2
}

function angleLabelDy({ angle, y }: PolarGuideLabelContext): number {
  if (!angleLabelIsTopOrBottom(angle)) return 1.1
  return y > 0 ? -1.1 : 0
}

export const createExampleChart = (input: ChartOptions) => {
  const margin =
    input.width < 480
      ? { top: 20, right: 55, bottom: 20, left: 105 }
      : { top: 20, right: 20, bottom: 20, left: 20 }

  return defineChart(
    {
      marks: [
        polar({
          angle: { scale: angleScale, wrap: true },
          radius: { scale: radiusScale },
          inset: 0,
          radiusRatio: input.preview === true ? 0.94 : 0.8,
          guides: [
            radialGrid({
              values: ringValues,
              shape: 'polygon',
              labels: input.preview !== true,
              labelAngle: Math.PI / 3,
              labelRotate: 60,
              labelBaseline: 'auto',
              labelFontSize: 12,
              format: (value) => String(Number(value) * 100),
              labelFill: '#cccccc',
              stroke: '#cbd5e1',
            }),
            angleGrid({
              values: radarEvents,
              labels: input.preview !== true,
              labelOffset: 8,
              labelDy: angleLabelDy,
              labelFill: '#808080',
              labelFontSize: 12,
              format: String,
              stroke: '#cbd5e1',
            }),
          ],
          marks: [
            radialArea(radarProfile, {
              id: 'athlete-profile',
              angle: 'event',
              radius: 'relativePerformance',
              key: 'event',
              className: 'ts-chart__radar',
              curve: curveLinearClosed,
              fill: '#8884d8',
              fillOpacity: 0.6,
              stroke: '#8884d8',
              strokeWidth: 2,
            }),
          ],
        }),
      ],
      margin: input.preview === true ? 0 : margin,
    },
    {
      keyboard: true,
      tooltip: {
        use: exampleTooltip,
        ...{
          format: ({ datum }) =>
            `${datum.Country} · ${datum.event} · ${(datum.relativePerformance * 100).toFixed(1)}%`,
        },
      },
    },
  )
}
export interface ChartOptions {
  width: number
  preview?: boolean
}

export const exampleAriaLabel = 'Decathlon radar chart'

export const chart = createExampleChart({
  width: 640,
  preview: false,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
