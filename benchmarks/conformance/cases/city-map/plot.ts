import * as Plot from '@observablehq/plot'
import { mountObservablePlot } from '../../shared/mount'
import { districtMasks, districtColors, storesForRevision } from './data'
import { referenceLots } from './transform'
import type { ConformanceInput } from '../../types'

// Plot compares the semantic district layout. The interactive example paints
// that same data as a Three.js city; Plot does not implement its WebGL surface.
function render(input: ConformanceInput) {
  const rows = referenceLots(storesForRevision(input.revision))
  return Plot.plot({
    ariaLabel: 'Store health city',
    width: input.width,
    height: input.height,
    margin: 0,
    x: { axis: null, nice: false },
    y: { axis: null, nice: false },
    color: { domain: districtMasks, range: districtColors },
    marks: [
      Plot.rect(rows, {
        x1: 'x',
        x2: 'x',
        y1: 'z',
        y2: 'z',
        fill: 'mask',
        inset: -3,
        rx: 1,
      }),
    ],
  })
}

export const mount = (container: HTMLElement, input: ConformanceInput) =>
  mountObservablePlot(container, input, render)
