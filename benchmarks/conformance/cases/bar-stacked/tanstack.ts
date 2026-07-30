import { crimeanWar } from '@charts-poc/demo-data/crimean-war'
import { defineChart, rect, ruleY } from '@tanstack/charts'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { stack, stackOrderReverse } from 'd3-shape'
import { tanstackMount } from '../../shared/mount'
import type { CrimeanWarRow } from '@charts-poc/demo-data/crimean-war'
import type { ConformanceInput } from '../../types'

const causes = ['disease', 'wounds', 'other'] as const
const causeColors = ['#4269d0', '#ff725c', '#efb118']
type Cause = (typeof causes)[number]

interface MortalityInterval {
  date: Date
  nextMonth: Date
  cause: Cause
  deaths: number
  y1: number
  y2: number
}

const definition = (input: ConformanceInput) => {
  const intervals = stackRows(crimeanWar.slice(input.revision))

  return defineChart({
    marks: [
      rect(intervals, {
        x1: 'date',
        x2: 'nextMonth',
        y1: 'y1',
        y2: 'y2',
        color: 'cause',
      }),
      ruleY([0]),
    ],
    x: {
      scale: scaleUtc,
      ticks: 6,
      format: (value) => month.format(value),
    },
    y: {
      scale: scaleLinear,
      label: 'Deaths',
      ticks: 5,
      grid: true,
    },
    color: { domain: causes, range: causeColors },
  })
}

export const mount = tanstackMount(definition, 'Crimean War deaths by cause')

const month = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  timeZone: 'UTC',
})

function stackRows(rows: readonly CrimeanWarRow[]): MortalityInterval[] {
  return stack<CrimeanWarRow, Cause>()
    .keys(causes)
    .order(stackOrderReverse)
    .value((row, cause) => row[cause])(rows)
    .flatMap((layer) =>
      layer.map((point) => ({
        date: point.data.date,
        nextMonth: new Date(
          Date.UTC(
            point.data.date.getUTCFullYear(),
            point.data.date.getUTCMonth() + 1,
            1,
          ),
        ),
        cause: layer.key,
        deaths: point[1] - point[0],
        y1: point[0],
        y2: point[1],
      })),
    )
}
