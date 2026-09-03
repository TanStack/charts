import { barY } from '@tanstack/charts/bar'
import { dot } from '@tanstack/charts/dot'
import { link } from '@tanstack/charts/link'
import { compositeMark } from '@tanstack/charts/mark/composite'
import { createChartScene, defineChart } from '@tanstack/charts/scene'
import { renderChartSvg } from '@tanstack/charts/svg'
import { tickY } from '@tanstack/charts/tick'
import { scaleBand, scaleLinear } from 'd3-scale'

const summaries = [
  {
    category: 'A',
    q1: 2,
    median: 3,
    q3: 5,
    whiskerLow: 1,
    whiskerHigh: 7,
  },
]
const outliers = [{ category: 'A', value: 10 }]
const definition = defineChart({
  marks: [
    compositeMark(
      [
        link(summaries, {
          id: 'whisker',
          x1: 'category',
          y1: 'whiskerLow',
          x2: 'category',
          y2: 'whiskerHigh',
        }),
        barY(summaries, {
          id: 'box',
          x: 'category',
          y: 'median',
          y1: 'q1',
          y2: 'q3',
        }),
        tickY(summaries, {
          id: 'median',
          x: 'category',
          y: 'median',
        }),
        dot(outliers, {
          id: 'outlier',
          x: 'category',
          y: 'value',
        }),
      ],
      { id: 'summary' },
    ),
  ],
  guides: false,
  scales: {
    x: { scale: scaleBand<string> },
    y: { scale: scaleLinear },
  },
})

export function render(width: number, height: number) {
  return renderChartSvg(createChartScene(definition, { width, height }), {
    ariaLabel: 'Composite mark',
  })
}
