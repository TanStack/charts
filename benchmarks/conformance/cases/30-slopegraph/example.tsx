import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { citywages } from '@tanstack/charts-data/citywages'
import { defineChart, dot, lineY, select, text } from '@tanstack/charts'
import { fold } from '@tanstack/charts/transform/fold'
import { scaleBand, scaleLinear } from 'd3-scale'
import { wageFields, wageYear } from './selection'

const colors = [
  '#2563eb',
  '#f97316',
  '#10b981',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#ca8a04',
  '#64748b',
]
const previewLabelOffsets = new Map([
  ['Houston', 7],
  ['New York', 12],
  ['Los Angeles', 18],
  ['Washington, D.C.', 12],
  ['Dallas', 6],
  ['Chicago', 0],
  ['Philadelphia', 12],
  ['Miami', 24],
])

export const createExampleChart = (input: ChartOptions) => {
  const source = citywages.slice(input.revision * 4, input.revision * 4 + 8)
  const rows = fold(source, {
    fields: wageFields,
    as: { key: 'wageField', value: 'inequality' },
  })
  const labels = select(rows, {
    by: 'Metro',
    select: 'last',
  })

  return defineChart(
    {
      marks: [
        lineY(rows, {
          id: 'metro-lines',
          x: ({ wageField }) => wageYear(wageField),
          y: 'inequality',
          color: 'nyt_display',
          key: ({ Metro, wageField }) => `${Metro}:${wageField}`,
        }),
        dot(rows, {
          id: 'metro-points',
          x: ({ wageField }) => wageYear(wageField),
          y: 'inequality',
          color: 'nyt_display',
          key: ({ Metro, wageField }) => `${Metro}:${wageField}`,
          r: 3,
        }),
        text(labels, {
          id: 'endpoint-labels',
          x: ({ wageField }) => wageYear(wageField),
          y: 'inequality',
          text: 'nyt_display',
          color: 'nyt_display',
          key: ({ Metro, wageField }) => `${Metro}:${wageField}`,
          dx: ({ wageField }) =>
            input.preview === true && wageField === wageFields[1] ? -6 : 6,
          anchor: ({ wageField }) =>
            input.preview === true && wageField === wageFields[1]
              ? 'end'
              : 'start',
          dy: ({ nyt_display }) =>
            input.preview === true
              ? (previewLabelOffsets.get(nyt_display) ?? 0)
              : 0,
          fontSize: input.preview === true ? 9 : 12,
        }),
      ],
      x: {
        scale: () => scaleBand<string>().paddingInner(0.2).paddingOuter(0.08),
      },
      y: {
        scale: scaleLinear,
        grid: true,
        axis: { label: '90th/10th percentile wage ratio' },
      },
      color: {
        range: colors,
      },
      margin: { right: 76 },
    },
    { keyboard: true, tooltip: exampleTooltip },
  )
}
export interface ChartOptions {
  revision: number
  preview?: boolean
}

export const exampleAriaLabel = 'Metropolitan wage inequality, 1980 to 2015'

export const chart = createExampleChart({
  revision: 0,
  preview: false,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
