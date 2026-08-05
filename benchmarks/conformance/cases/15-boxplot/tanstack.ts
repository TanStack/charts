import { barY, defineChart, dot, link, tickY } from '@tanstack/charts'
import { group, max, min, quantileSorted } from 'd3-array'
import { scaleBand, scaleLinear } from 'd3-scale'
import { morley } from '@charts-poc/demo-data/morley'
import type { MorleyRow } from '@charts-poc/demo-data/morley'
import { tanstackCase } from '../../shared/mount'

interface BoxSummary {
  Expt: number
  q1: number
  median: number
  q3: number
  low: number
  high: number
}

const { summaries, outliers } = summarizeBoxplots(morley)

const definition = () =>
  defineChart({
    marks: [
      link(summaries, {
        x1: 'Expt',
        y1: 'low',
        x2: 'Expt',
        y2: 'high',
        stroke: '#2563eb',
      }),
      barY(summaries, {
        x: 'Expt',
        y1: 'q1',
        y2: 'q3',
        fill: '#bfdbfe',
        inset: 18,
      }),
      tickY(summaries, {
        x: 'Expt',
        y: 'median',
        stroke: '#2563eb',
        strokeWidth: 2,
        inset: 18,
      }),
      dot(outliers, {
        x: 'Expt',
        y: 'Speed',
        key: (row) => `${row.Expt}:${row.Run}`,
        fill: '#ffffff',
        stroke: '#2563eb',
        r: 2.5,
      }),
    ],
    x: {
      scale: () => scaleBand<number>().padding(0.22),
    },
    y: {
      scale: scaleLinear,
      grid: true,
      axis: { label: 'Speed of light (km/s minus 299,000)' },
    },
  })

function summarizeBoxplots(rows: readonly MorleyRow[]) {
  const summaries: BoxSummary[] = []
  const outliers: MorleyRow[] = []

  for (const [experiment, observations] of group(rows, (row) => row.Expt)) {
    const values = observations.map((row) => row.Speed).sort((a, b) => a - b)
    const q1 = quantileSorted(values, 0.25) ?? 0
    const median = quantileSorted(values, 0.5) ?? 0
    const q3 = quantileSorted(values, 0.75) ?? 0
    const lowerFence = q1 - (q3 - q1) * 1.5
    const upperFence = q3 + (q3 - q1) * 1.5
    const inside = observations.filter(
      (row) => row.Speed >= lowerFence && row.Speed <= upperFence,
    )
    summaries.push({
      Expt: experiment,
      q1,
      median,
      q3,
      low: min(inside, (row) => row.Speed) ?? q1,
      high: max(inside, (row) => row.Speed) ?? q3,
    })
    outliers.push(
      ...observations.filter(
        (row) => row.Speed < lowerFence || row.Speed > upperFence,
      ),
    )
  }
  return { summaries, outliers }
}

export const catalogCase = tanstackCase(definition, 'Grouped boxplots', {
  format: ({ datum }) =>
    'median' in datum
      ? `Experiment ${datum.Expt} · median ${datum.median.toLocaleString(
          'en-US',
          {
            maximumFractionDigits: 1,
          },
        )} · IQR ${datum.q1.toLocaleString('en-US', {
          maximumFractionDigits: 1,
        })}–${datum.q3.toLocaleString('en-US', {
          maximumFractionDigits: 1,
        })}`
      : `Experiment ${datum.Expt} outlier · ${datum.Speed.toLocaleString(
          'en-US',
          {
            maximumFractionDigits: 1,
          },
        )}`,
})

export const mount = catalogCase.mount
