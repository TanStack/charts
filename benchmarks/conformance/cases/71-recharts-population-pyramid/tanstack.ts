import { barX, defineChart } from '@tanstack/charts'
import { scaleBand, scaleLinear } from 'd3-scale'
import { ageBands, populationData } from './data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const definition = (input: ConformanceInput) =>
  defineChart(() => {
    const rows = populationData(input.revision)

    return {
      marks: [
        barX(rows, {
          x: 'male',
          y: 'age',
          key: 'age',
          fill: '#2563eb',
          inset: 0.5,
        }),
        barX(rows, {
          x: 'female',
          y: 'age',
          key: 'age',
          fill: '#db2777',
          inset: 0.5,
        }),
      ],
      x: {
        scale: scaleLinear().domain([-10, 10]),
        ticks: 5,
        format: (value) => `${Math.abs(value)}%`,
        label: '% of total population',
        grid: true,
      },
      y: {
        scale: scaleBand<string>()
          .domain(ageBands)
          .paddingInner(0.02)
          .paddingOuter(0.01),
      },
      margin: { top: 20, right: 20, bottom: 70, left: 80 },
    }
  })

export const mount = tanstackMount(definition, 'Population by age and sex')
