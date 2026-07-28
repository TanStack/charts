import * as Plot from '@observablehq/plot'
import { indexedData, indexedDateDomain, indexedSeries } from './data'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

const colors = ['#2563eb', '#ea580c', '#059669', '#7c3aed']
const formatIndex = (value: number) => `${Math.round((value - 1) * 100)}%`

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = indexedData(nextInput.revision)

    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Indexed performance from first observation',
      marginRight: 68,
      x: {
        type: 'utc',
        domain: indexedDateDomain,
        label: 'Month',
      },
      y: {
        domain: [0.72, 1.65],
        nice: false,
        grid: true,
        tickFormat: formatIndex,
        label: 'Change from first observation',
      },
      color: { domain: indexedSeries, range: colors },
      marks: [
        Plot.ruleY([1], { strokeOpacity: 0.65 }),
        Plot.line(
          rows,
          Plot.normalizeY('first', {
            x: 'date',
            y: 'value',
            stroke: 'series',
            strokeWidth: 2.25,
          }),
        ),
        Plot.text(
          rows,
          Plot.selectLast(
            Plot.normalizeY('first', {
              x: 'date',
              y: 'value',
              z: 'series',
              text: 'series',
              fill: 'series',
              textAnchor: 'start',
              dx: 5,
            }),
          ),
        ),
      ],
    })
  })
