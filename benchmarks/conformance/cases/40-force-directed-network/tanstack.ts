import { defineChart, dot, link, text } from '@tanstack/charts'
import { scaleLinear, scaleOrdinal } from 'd3-scale'
import { networkColors, networkGroups, networkLayout } from './data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'
import type { NetworkGroup } from './data'

const definition = defineChart<ConformanceInput>()(({ input }) => {
  const graph = networkLayout(input.revision)

  return {
    marks: [
      link(graph.links, {
        x1: 'x1',
        y1: 'y1',
        x2: 'x2',
        y2: 'y2',
        key: 'id',
        stroke: '#94a3b8',
        strokeOpacity: 0.6,
        strokeWidth: 2,
      }),
      dot(graph.nodes, {
        x: 'x',
        y: 'y',
        z: 'group',
        key: 'id',
        r: 7,
        stroke: '#ffffff',
        strokeWidth: 1.5,
      }),
      text(graph.nodes, {
        x: 'x',
        y: 'y',
        text: 'label',
        key: 'id',
        dy: -12,
        fontSize: 10,
        fontWeight: 600,
      }),
    ],
    x: {
      scale: scaleLinear().domain(graph.xDomain),
    },
    y: {
      scale: scaleLinear().domain(graph.yDomain),
    },
    guides: false,
    color: {
      scale: scaleOrdinal<NetworkGroup, string>()
        .domain(networkGroups)
        .range(networkColors),
    },
  }
})

export const mount = tanstackMount(
  definition,
  'Force-directed service dependency network',
)
