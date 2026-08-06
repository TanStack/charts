import { boxY, defineChart } from '@tanstack/charts'
import { scaleBand, scaleLinear } from 'd3-scale'
import { morley } from '@charts-poc/demo-data/morley'
import { tanstackMount } from '../../shared/mount'

export const boxplotDefinition = () =>
  defineChart({
    marks: [
      boxY(morley, {
        id: 'morley-boxplot',
        x: 'Expt',
        y: 'Speed',
        key: 'Run',
        fill: '#bfdbfe',
        stroke: '#2563eb',
        inset: 18,
        r: 2.5,
      }),
    ],
    x: {
      scale: () => scaleBand<number>().padding(0.22),
      axis: { label: 'Experiment' },
    },
    y: {
      scale: scaleLinear,
      grid: true,
      axis: { label: 'Speed of light (km/s minus 299,000)' },
    },
  })

export const mount = tanstackMount(boxplotDefinition, 'Grouped boxplots', {
  format: ({ datum }) =>
    datum.kind === 'summary'
      ? `Experiment ${datum.category} · median ${datum.median.toLocaleString(
          'en-US',
          {
            maximumFractionDigits: 1,
          },
        )} · IQR ${datum.q1.toLocaleString('en-US', {
          maximumFractionDigits: 1,
        })}–${datum.q3.toLocaleString('en-US', {
          maximumFractionDigits: 1,
        })}`
      : `Experiment ${datum.category} outlier · ${datum.value.toLocaleString(
          'en-US',
          {
            maximumFractionDigits: 1,
          },
        )}`,
})
