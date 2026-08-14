import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { defineChart } from '@tanstack/charts'
import {
  pie,
  polar,
  radialArc,
  radialRule,
  radialText,
} from '@tanstack/charts/polar'
import { alphabet } from '@charts-poc/demo-data/alphabet'
import { scaleLinear } from 'd3-scale'
import { selectLabeledPieData } from './selection'

const tau = Math.PI * 2
const radiusRatio = 0.56
const labelOffset = 20
const colors = ['#2563eb', '#7c3aed', '#db2777', '#f59e0b']

export const labeledPieDefinition = (input: ExampleOptions) => {
  const arcs = pie(selectLabeledPieData(alphabet, input.revision), {
    value: 'frequency',
  })

  return defineChart({
    marks: [
      polar({
        radiusRatio,
        angle: { scale: scaleLinear().domain([0, tau]) },
        radius: { scale: scaleLinear().domain([0, 1]) },
        marks: [
          radialArc(arcs, {
            id: 'letter-slices',
            key: 'letter',
            color: 'letter',
          }),
          radialRule(arcs, {
            id: 'letter-leaders',
            angle: 'angle',
            radius1: 1,
            radius2: 1,
            radius2Offset: labelOffset,
            key: 'letter',
            stroke: '#94a3b8',
            strokeWidth: 1,
          }),
          radialText(arcs, {
            id: 'letter-labels',
            angle: 'angle',
            radius: 1,
            radiusOffset: labelOffset,
            text: 'letter',
            key: 'letter',
            color: 'letter',
            fontSize: 12,
            fontWeight: 500,
            anchor: 'outside',
          }),
        ],
      }),
    ],
    color: { range: colors },
    margin: 0,
  })
}
export interface ExampleOptions {
  width: number
  height: number
  revision: number
  preview?: boolean
}

export const exampleAriaLabel = 'Letter frequency pie with labels'

export const createExampleChart = (options: ExampleOptions) =>
  defineChart(labeledPieDefinition(options), {
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
