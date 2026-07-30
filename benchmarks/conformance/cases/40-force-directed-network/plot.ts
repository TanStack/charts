import * as Plot from '@observablehq/plot'
import { networkColors, networkGroups } from './data'
import { networkLayout } from './layout'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const graph = networkLayout(nextInput.revision)

    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Force-directed service dependency network',
      x: { domain: graph.xDomain, axis: null },
      y: { domain: graph.yDomain, axis: null },
      color: {
        domain: networkGroups,
        range: networkColors,
      },
      marks: [
        Plot.link(graph.links, {
          x1: 'x1',
          y1: 'y1',
          x2: 'x2',
          y2: 'y2',
          stroke: '#94a3b8',
          strokeOpacity: 0.6,
          strokeWidth: 2,
        }),
        Plot.dot(graph.nodes, {
          x: 'x',
          y: 'y',
          fill: 'group',
          r: 7,
          stroke: '#ffffff',
          strokeWidth: 1.5,
        }),
        Plot.text(graph.nodes, {
          x: 'x',
          y: 'y',
          text: 'label',
          dy: -12,
          fontSize: 10,
          fontWeight: 600,
        }),
      ],
    })
  })
