import * as Plot from '@observablehq/plot'
import { miserables } from '@tanstack/charts-data/miserables'
import { networkLayout } from './layout'
import { forceNetworkData } from './transform'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

const colors = ['#2563eb', '#f97316', '#10b981']
const network = forceNetworkData(miserables)

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const graph = networkLayout(network, nextInput.revision)

    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Force-directed Les Misérables character network',
      x: { domain: graph.xDomain, axis: null },
      y: { domain: graph.yDomain, axis: null },
      color: {
        range: colors,
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
          text: 'id',
          dy: -12,
          fontSize: 10,
          fontWeight: 600,
        }),
      ],
    })
  })
