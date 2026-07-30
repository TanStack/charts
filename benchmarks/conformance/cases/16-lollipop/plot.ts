import * as Plot from '@observablehq/plot'
import { categoryData } from '../../shared/data'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = categoryData(nextInput.revision)
    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Ranked lollipop chart',
      x: { label: null },
      y: { domain: [0, 180], grid: true, label: 'Total' },
      marks: [
        Plot.ruleX(
          rows,
          Plot.groupX(
            { y: 'sum' },
            {
              x: 'category',
              y: 'value',
              stroke: '#94a3b8',
              strokeWidth: 1.5,
              sort: { x: '-y' },
            },
          ),
        ),
        Plot.dot(
          rows,
          Plot.groupX(
            { y: 'sum' },
            {
              x: 'category',
              y: 'value',
              fill: '#2563eb',
              r: 4,
              sort: { x: '-y' },
            },
          ),
        ),
      ],
    })
  })
