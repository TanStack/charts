import * as Plot from '@observablehq/plot'
import { flare } from '@tanstack/charts-data/flare'
import { selectHierarchyData } from './selection'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

function hierarchyPath(name: string): string {
  return name.slice('flare.'.length).replaceAll('.', '/')
}

function hierarchyLabel(name: string): string {
  return name.slice(name.lastIndexOf('.') + 1)
}

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const rows = selectHierarchyData(flare, nextInput.revision)
    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Tidy Flare analytics hierarchy',
      marginTop: 22,
      marginRight: 140,
      marginBottom: 22,
      marginLeft: 50,
      x: { axis: null },
      y: { axis: null },
      marks: [
        Plot.tree(rows, {
          path: (row) => hierarchyPath(row.name),
          text: (row) => hierarchyLabel(row.name),
          curve: 'linear',
          fill: '#2563eb',
          stroke: '#94a3b8',
          strokeOpacity: 0.55,
          strokeWidth: 1.5,
          r: 3.5,
          fontSize: 10,
        }),
      ],
    })
  })
