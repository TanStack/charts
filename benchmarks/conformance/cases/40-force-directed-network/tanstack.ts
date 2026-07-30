import { defineChart, dot, link, text } from '@tanstack/charts'
import { miserables } from '@charts-poc/demo-data/miserables'
import { scaleLinear } from 'd3-scale'
import { networkLayout } from './layout'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const colors = ['#2563eb', '#f97316', '#10b981']

const definition = (input: ConformanceInput) => {
  const graph = networkLayout(miserables, input.revision)

  return defineChart({
    marks: [
      link(graph.links, {
        x1: 'x1',
        y1: 'y1',
        x2: 'x2',
        y2: 'y2',
        stroke: '#94a3b8',
        strokeOpacity: 0.6,
        strokeWidth: 2,
      }),
      dot(graph.nodes, {
        x: 'x',
        y: 'y',
        color: 'group',
        r: 7,
        stroke: '#ffffff',
        strokeWidth: 1.5,
      }),
      text(graph.nodes, {
        x: 'x',
        y: 'y',
        text: 'id',
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
      range: colors,
    },
  })
}

export const mount = tanstackMount(
  definition,
  'Force-directed Les Misérables character network',
  {
    format: ({ datum }) =>
      'group' in datum
        ? `${datum.id} · Group ${datum.group}`
        : `${datum.source} → ${datum.target} · Value ${datum.value}`,
  },
)
