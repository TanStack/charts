import { penguins } from '@tanstack/charts-data/penguins'
import * as Plot from '@observablehq/plot'
import { deviation, mean } from 'd3-array'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

const lowerDeviation = (values: number[]) => {
  const center = mean(values)
  const spread = deviation(values)
  return center === undefined || spread === undefined
    ? Number.NaN
    : center - spread
}

const upperDeviation = (values: number[]) => {
  const center = mean(values)
  const spread = deviation(values)
  return center === undefined || spread === undefined
    ? Number.NaN
    : center + spread
}

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = penguins
      .slice(nextInput.revision * 8)
      .filter((row) => row.body_mass_g !== null)
    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Point estimates with error bars',
      x: { label: null },
      y: { grid: true, label: 'Body mass (g)' },
      marks: [
        Plot.ruleX(
          rows,
          Plot.groupX(
            { y1: lowerDeviation, y2: upperDeviation },
            {
              x: 'species',
              y1: 'body_mass_g',
              y2: 'body_mass_g',
              stroke: '#2563eb',
              strokeWidth: 1.5,
            },
          ),
        ),
        Plot.tickY(
          rows,
          Plot.groupX(
            { y: lowerDeviation },
            {
              x: 'species',
              y: 'body_mass_g',
              stroke: '#2563eb',
              strokeWidth: 1.5,
            },
          ),
        ),
        Plot.tickY(
          rows,
          Plot.groupX(
            { y: upperDeviation },
            {
              x: 'species',
              y: 'body_mass_g',
              stroke: '#2563eb',
              strokeWidth: 1.5,
            },
          ),
        ),
        Plot.dot(
          rows,
          Plot.groupX(
            { y: 'mean' },
            {
              x: 'species',
              y: 'body_mass_g',
              fill: '#2563eb',
              r: 3.5,
            },
          ),
        ),
      ],
    })
  })
