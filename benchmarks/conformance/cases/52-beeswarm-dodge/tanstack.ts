import { defineChart, dot } from '@tanstack/charts'
import { forceCollide, forceSimulation, forceY } from 'd3-force'
import { scaleLinear } from 'd3-scale'
import { beeswarmData } from './data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'
import type { SimulationNodeDatum } from 'd3-force'

interface BeeswarmNode extends SimulationNodeDatum {
  id: number
  value: number
  targetX: number
}

interface PositionedBeeswarmPoint {
  id: number
  x: number
  y: number
}

const margin = {
  top: 20,
  right: 20,
  bottom: 20,
  left: 20,
}
const layoutTicks = 60

const definition = (input: ConformanceInput) =>
  defineChart(({ width, height }) => {
    const innerWidth = Math.max(1, width - margin.left - margin.right)
    const innerHeight = Math.max(1, height - margin.top - margin.bottom)
    const centerY = innerHeight / 2
    const valuePosition = scaleLinear().domain([20, 90]).range([0, innerWidth])
    const nodes: BeeswarmNode[] = beeswarmData(input.revision).map((row) => {
      const targetX = valuePosition(row.value)
      return {
        id: row.id,
        value: row.value,
        targetX,
        x: targetX,
        fx: targetX,
        y: centerY,
      }
    })
    const simulation = forceSimulation(nodes)
      .alphaDecay(1 - Math.pow(0.001, 1 / layoutTicks))
      .force('y', forceY<BeeswarmNode>(centerY).strength(0.06))
      .force('collide', forceCollide<BeeswarmNode>(4.5).iterations(2))
      .stop()

    simulation.tick(layoutTicks)

    const rows: readonly PositionedBeeswarmPoint[] = nodes.map((node) => ({
      id: node.id,
      x: valuePosition.invert(node.x ?? node.targetX),
      y: node.y ?? centerY,
    }))

    return {
      marks: [
        dot(rows, {
          x: 'x',
          y: 'y',
          key: 'id',
          r: 4,
          fill: '#0d9488',
          stroke: '#ffffff',
          strokeWidth: 1,
        }),
      ],
      guides: false,
      margin,
      x: {
        scale: scaleLinear().domain([20, 90]),
      },
      y: {
        scale: scaleLinear().domain([0, innerHeight]),
      },
    }
  })

export const mount = tanstackMount(definition, 'Beeswarm distribution')
