import { defineChart } from '@tanstack/charts'
import { sunburst } from '@tanstack/charts/hierarchy/sunburst'
import { polar } from '@tanstack/charts/polar'
import { flare } from '@charts-poc/demo-data/flare'
import { selectSunburstData } from './selection'
import { tanstackCase } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

export const sunburstDefinition = (input: ConformanceInput) => {
  const data = selectSunburstData(flare, input.revision)

  return defineChart({
    marks: [
      polar({
        radiusRatio: 0.88,
        startAngle: Math.PI / 2,
        endAngle: Math.PI / 2 - Math.PI * 2,
        marks: [
          sunburst(data, {
            id: 'sunburst-arcs',
            path: 'name',
            delimiter: '.',
            value: 'size',
            innerRadius: ({ radius }) => radius * 0.14,
            outerRadius: ({ radius }) => {
              const innerRadius = radius * 0.14
              return innerRadius + ((radius - innerRadius) * 2) / 3 + 2
            },
            ringPadding: 2,
            color: 'branchId',
            stroke: '#ffffff',
            strokeWidth: 2,
          }),
        ],
      }),
    ],
    color: {
      range: ['#7c3aed', '#0ea5e9', '#14b8a6'],
    },
    margin: 0,
  })
}

export const catalogCase = tanstackCase(
  sunburstDefinition,
  'Flare analytics sunburst',
  {
    format: ({ datum }) =>
      `${(datum.data?.name ?? datum.id).replaceAll('.', ' › ')} · ${datum.value.toLocaleString('en-US')}`,
  },
)

export const mount = catalogCase.mount
