import * as Plot from '@observablehq/plot'
import { industries } from '@tanstack/charts-data/industries'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

const colors = ['#2563eb', '#ea580c', '#059669', '#7c3aed']
const formatIndex = (value: number) => `${Math.round((value - 1) * 100)}%`
const includedIndustries = new Set([
  'Construction',
  'Finance',
  'Government',
  'Manufacturing',
])
const observations = industries.filter(
  (row) =>
    row.date >= new Date(Date.UTC(2008, 0, 1)) &&
    includedIndustries.has(row.industry),
)

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) =>
    Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Indexed U.S. industry unemployment',
      marginRight: 108,
      x: {
        type: 'utc',
        label: 'Month',
      },
      y: {
        grid: true,
        tickFormat: formatIndex,
        label: 'Change from January 2008',
      },
      color: { range: colors },
      marks: [
        Plot.ruleY([1], { strokeOpacity: 0.65 }),
        Plot.line(
          observations,
          Plot.normalizeY('first', {
            x: 'date',
            y: 'unemployed',
            stroke: 'industry',
            strokeWidth: 2.25,
          }),
        ),
        Plot.text(
          observations,
          Plot.selectLast(
            Plot.normalizeY('first', {
              x: 'date',
              y: 'unemployed',
              z: 'industry',
              text: 'industry',
              fill: 'industry',
              textAnchor: 'start',
              dx: 5,
            }),
          ),
        ),
      ],
    }),
  )
