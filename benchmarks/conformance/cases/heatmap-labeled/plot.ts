import * as Plot from '@observablehq/plot'
import { heatmapData } from '../../shared/data'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

const hours = ['00', '04', '08', '12', '16', '20']
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const contrastThreshold = 48

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = heatmapData(nextInput.revision)
    const darkLabels = rows.filter((row) => row.value < contrastThreshold)
    const lightLabels = rows.filter((row) => row.value >= contrastThreshold)

    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Labeled day and hour heatmap',
      marginTop: 24,
      marginRight: 24,
      marginBottom: 40,
      marginLeft: 48,
      x: {
        domain: hours,
        label: 'Hour',
      },
      y: {
        domain: days,
        label: 'Day',
      },
      color: {
        type: 'linear',
        domain: [8, 80],
        range: ['#eff6ff', '#1d4ed8'],
        legend: true,
      },
      marks: [
        Plot.cell(rows, {
          x: 'hour',
          y: 'day',
          fill: 'value',
          inset: 1,
        }),
        Plot.text(darkLabels, {
          x: 'hour',
          y: 'day',
          text: 'value',
          fill: '#0f172a',
          fontSize: 10,
          fontWeight: 600,
        }),
        Plot.text(lightLabels, {
          x: 'hour',
          y: 'day',
          text: 'value',
          fill: '#f8fafc',
          fontSize: 10,
          fontWeight: 600,
        }),
      ],
    })
  })
