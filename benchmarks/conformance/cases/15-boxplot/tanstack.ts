import { barY, defineChart, dot, link, tickY } from '@tanstack/charts'
import { group, max, min, quantileSorted } from 'd3-array'
import { scaleBand, scaleLinear } from 'd3-scale'
import { boxData } from './data'
import type { BoxPoint } from './data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

interface BoxSummary {
  id: string
  group: BoxPoint['group']
  q1: number
  median: number
  q3: number
  low: number
  high: number
}

const definition = defineChart<ConformanceInput>()(({ input }) => {
  const rows = boxData(input.revision)
  const summaries: BoxSummary[] = []
  const outliers: BoxPoint[] = []

  for (const [groupName, observations] of group(rows, (row) => row.group)) {
    const values = observations.map((row) => row.value).sort((a, b) => a - b)
    const q1 = quantileSorted(values, 0.25) ?? 0
    const median = quantileSorted(values, 0.5) ?? 0
    const q3 = quantileSorted(values, 0.75) ?? 0
    const lowerFence = q1 - (q3 - q1) * 1.5
    const upperFence = q3 + (q3 - q1) * 1.5
    const inside = observations.filter(
      (row) => row.value >= lowerFence && row.value <= upperFence,
    )
    summaries.push({
      id: groupName,
      group: groupName,
      q1,
      median,
      q3,
      low: min(inside, (row) => row.value) ?? q1,
      high: max(inside, (row) => row.value) ?? q3,
    })
    outliers.push(
      ...observations.filter(
        (row) => row.value < lowerFence || row.value > upperFence,
      ),
    )
  }

  return {
    marks: [
      link(summaries, {
        x1: 'group',
        y1: 'low',
        x2: 'group',
        y2: 'high',
        key: 'id',
        stroke: '#2563eb',
      }),
      barY(summaries, {
        x: 'group',
        y1: 'q1',
        y2: 'q3',
        key: 'id',
        fill: '#bfdbfe',
        inset: 18,
      }),
      tickY(summaries, {
        x: 'group',
        y: 'median',
        key: 'id',
        stroke: '#2563eb',
        strokeWidth: 2,
        inset: 18,
      }),
      dot(outliers, {
        x: 'group',
        y: 'value',
        key: 'id',
        fill: '#ffffff',
        stroke: '#2563eb',
        r: 2.5,
      }),
    ],
    x: {
      scale: scaleBand<string>()
        .domain(['Alpha', 'Beta', 'Gamma'])
        .padding(0.22),
    },
    y: {
      scale: scaleLinear().domain([10, 100]),
      grid: true,
      label: 'Value',
    },
  }
})

export const mount = tanstackMount(definition, 'Grouped boxplots', {
  format: ({ datum }) =>
    'median' in datum
      ? `${datum.group} · median ${datum.median.toLocaleString('en-US', {
          maximumFractionDigits: 1,
        })} · IQR ${datum.q1.toLocaleString('en-US', {
          maximumFractionDigits: 1,
        })}–${datum.q3.toLocaleString('en-US', {
          maximumFractionDigits: 1,
        })}`
      : `${datum.group} outlier · ${datum.value.toLocaleString('en-US', {
          maximumFractionDigits: 1,
        })}`,
})
