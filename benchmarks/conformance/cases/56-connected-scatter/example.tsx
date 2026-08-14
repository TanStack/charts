import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import {
  arrow,
  d3Curve,
  defineChart,
  dot,
  lineY,
  text,
  rollingWindow,
} from '@tanstack/charts'
import { scaleLinear } from 'd3-scale'
import { curveCatmullRom } from 'd3-shape'
import { driving } from '@charts-poc/demo-data/driving'

export const directionTargetIndexes = [14, 28, 42] as const
const directionTargetIndexSet: ReadonlySet<number> = new Set(
  directionTargetIndexes,
)
export const directionPairs = rollingWindow(driving, {
  orderBy: 'year',
  size: 2,
  partial: false,
  outputs: {},
}).filter(({ sourceIndexes }) =>
  directionTargetIndexSet.has(sourceIndexes[1] ?? -1),
)
const labels = driving.filter((row) => row.year % 5 === 0)

export const connectedScatterDefinition = (input?: ExampleOptions) =>
  defineChart({
    marks: [
      lineY(driving, {
        id: 'driving-path',
        x: 'miles',
        y: 'gas',
        stroke: '#64748b',
        strokeWidth: 2.25,
        curve: d3Curve(curveCatmullRom.alpha(0.5)),
      }),
      dot(driving, {
        id: 'driving-points',
        x: 'miles',
        y: 'gas',
        fill: '#0f766e',
        r: 3.25,
      }),
      arrow(directionPairs, {
        id: 'direction-arrows',
        x1: ({ source }) => source[0]?.miles,
        y1: ({ source }) => source[0]?.gas,
        x2: 'miles',
        y2: 'gas',
        stroke: '#0f766e',
        strokeWidth: 1.5,
        headLength: 7,
      }),
      ...(input?.preview === true
        ? []
        : [
            text(labels, {
              id: 'year-labels',
              x: 'miles',
              y: 'gas',
              text: (row) => `${row.year}`,
              fill: '#0f172a',
              anchor: 'middle',
              dy: -9,
            }),
          ]),
    ],
    x: {
      scale: scaleLinear,
      grid: true,
      axis: { label: 'Miles driven per person' },
    },
    y: {
      scale: scaleLinear,
      grid: true,
      axis: { label: 'Cost of gasoline ($ per gallon)' },
    },
  })
export interface ExampleOptions {
  width: number
  height: number
  revision: number
  preview?: boolean
}

export const exampleAriaLabel = 'Directed connected scatterplot over time'

export const createExampleChart = (options: ExampleOptions) =>
  defineChart(connectedScatterDefinition(options), {
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
