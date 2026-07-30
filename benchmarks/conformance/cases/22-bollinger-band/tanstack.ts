import { areaY, defineChart, lineY } from '@tanstack/charts'
import { deviation, mean } from 'd3-array'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { timeDomain } from '../../shared/data'
import type { TimePoint } from '../../shared/data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput, ConformanceMount } from '../../types'
import { bollingerData, bollingerValueDomain } from './data'

interface BollingerPoint {
  id: string
  date: Date
  center: number
  lower: number
  upper: number
}

const windowSize = 8
const deviationMultiplier = 2

const definition = (input: ConformanceInput) =>
  defineChart(() => {
    const rows = bollingerIntervals(bollingerData(input.revision))

    return {
      marks: [
        areaY(rows, {
          id: 'bollinger-band',
          x: 'date',
          y1: 'lower',
          y2: 'upper',
          key: 'id',
          fill: '#7c3aed',
          fillOpacity: 0.18,
        }),
        lineY(rows, {
          id: 'bollinger-mean',
          x: 'date',
          y: 'center',
          key: 'id',
          stroke: '#7c3aed',
          strokeWidth: 2.25,
        }),
      ],
      x: {
        scale: scaleUtc().domain(timeDomain),
        label: 'Week',
      },
      y: {
        scale: scaleLinear().domain(bollingerValueDomain),
        grid: true,
        label: 'Index',
      },
    }
  })

export const mount: ConformanceMount = tanstackMount(
  definition,
  'Eight-week Bollinger band',
)

function bollingerIntervals(
  rows: readonly TimePoint[],
): readonly BollingerPoint[] {
  const output: BollingerPoint[] = []

  for (let index = windowSize - 1; index < rows.length; index++) {
    const row = rows[index]
    if (!row) continue
    const window = rows.slice(index - windowSize + 1, index + 1)
    const center = mean(window, (point) => point.value)
    if (center === undefined) continue
    const spread =
      (deviation(window, (point) => point.value) ?? 0) * deviationMultiplier
    output.push({
      id: row.id,
      date: row.date,
      center,
      lower: center - spread,
      upper: center + spread,
    })
  }

  return output
}
