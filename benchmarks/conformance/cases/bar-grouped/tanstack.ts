import { penguins } from '@charts-poc/demo-data/penguins'
import { barY, colorLegend, defineChart, group } from '@tanstack/charts'
import { rollups } from 'd3-array'
import { scaleBand, scaleLinear } from 'd3-scale'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const sexDomain = ['FEMALE', 'MALE']
const sexColors = ['#2563eb', '#f97316']

const definition = (input: ConformanceInput) =>
  defineChart(({ width }) => {
    const rows = rollups(
      penguins
        .slice(0, penguins.length - input.revision * 12)
        .filter((row) => row.sex !== null),
      (values) => values.length,
      (row) => row.species,
      (row) => row.sex,
    ).flatMap(([species, groups]) =>
      groups.map(([sex, count]) => ({ species, sex, count })),
    )

    return {
      marks: [
        barY(rows, {
          x: 'species',
          y: 'count',
          color: 'sex',
          layout: group({
            scale: scaleBand<string>().domain(sexDomain).paddingInner(0.08),
          }),
          inset: 1,
        }),
      ],
      x: {
        scale: () => scaleBand<string>().paddingInner(0.14).paddingOuter(0.06),
        axis: { tickLabels: { rotate: width < 640 ? -32 : 0 } },
      },
      y: {
        scale: scaleLinear,
        grid: true,
        axis: { ticks: { count: 5 }, label: 'Penguins' },
      },
      color: {
        range: sexColors,
        legend: colorLegend({
          label: 'Sex',
        }),
      },
    }
  })

export const mount = tanstackMount(definition, 'Penguins grouped by species')
