import * as Plot from '@observablehq/plot'
import { hierarchyData } from './data'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = hierarchyData(nextInput.revision)
    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Tidy product hierarchy',
      marginTop: 22,
      marginRight: 76,
      marginBottom: 22,
      marginLeft: 76,
      x: { domain: [0, 2], axis: null },
      y: { domain: [-3.5, 3.5], axis: null },
      marks: [
        Plot.tree(rows, {
          path: 'path',
          text: 'label',
          curve: 'linear',
          fill: '#2563eb',
          stroke: '#94a3b8',
          strokeOpacity: 0.55,
          strokeWidth: 1.5,
          r: 3.5,
        }),
      ],
    })
  })
