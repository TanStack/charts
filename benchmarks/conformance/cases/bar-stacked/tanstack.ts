import { crimeanWar } from '@charts-poc/demo-data/crimean-war'
import { barY, defineChart, ruleY, stack } from '@tanstack/charts'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const causes = ['disease', 'wounds', 'other'] as const
const causeColors = ['#4269d0', '#ff725c', '#efb118']

const definition = (input: ConformanceInput) => {
  const rows = crimeanWar.slice(input.revision).flatMap((row) =>
    causes.map((cause) => ({
      date: row.date,
      cause,
      deaths: row[cause],
    })),
  )

  return defineChart({
    marks: [
      barY(rows, {
        x: 'date',
        y: 'deaths',
        z: 'cause',
        color: 'cause',
        layout: stack({ order: [...causes].reverse() }),
      }),
      ruleY([0]),
    ],
    x: {
      scale: scaleUtc,
      axis: { ticks: { count: 6, format: (value) => month.format(value) } },
    },
    y: {
      scale: scaleLinear,
      grid: true,
      axis: { ticks: { count: 5 }, label: 'Deaths' },
    },
    color: { domain: causes, range: causeColors },
  })
}

export const mount = tanstackMount(definition, 'Crimean War deaths by cause')

const month = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  timeZone: 'UTC',
})
