import { cars } from '@charts-poc/demo-data/cars'
import { defineChart, dot } from '@tanstack/charts'
import { forceCollide, forceSimulation, forceY } from 'd3-force'
import { scaleLinear } from 'd3-scale'
import { tanstackMount } from '../../shared/mount'
import type { CarsRow } from '@charts-poc/demo-data/cars'
import type { ConformanceInput } from '../../types'
import type { SimulationNodeDatum } from 'd3-force'

interface BeeswarmNode extends SimulationNodeDatum {
  name: string
  'economy (mpg)': number
  targetX: number
}

interface PositionedBeeswarmPoint {
  name: string
  'economy (mpg)': number
  offset: number
}

type CarWithEconomy = CarsRow & { 'economy (mpg)': number }

const completeCars = cars.filter(
  (row): row is CarWithEconomy => row['economy (mpg)'] !== null,
)

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
    const valuePosition = scaleLinear().domain([5, 50]).range([0, innerWidth])
    const nodes: BeeswarmNode[] = completeCars
      .slice(input.revision * 8, input.revision * 8 + 72)
      .map((row) => {
        const targetX = valuePosition(row['economy (mpg)'])
        return {
          name: row.name,
          'economy (mpg)': row['economy (mpg)'],
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
      name: node.name,
      'economy (mpg)': valuePosition.invert(node.x ?? node.targetX),
      offset: node.y ?? centerY,
    }))

    return {
      marks: [
        dot(rows, {
          x: 'economy (mpg)',
          y: 'offset',
          r: 4,
          fill: '#0d9488',
          stroke: '#ffffff',
          strokeWidth: 1,
        }),
      ],
      guides: false,
      margin,
      x: {
        scale: scaleLinear().domain([5, 50]),
      },
      y: {
        scale: scaleLinear().domain([0, innerHeight]),
      },
    }
  })

export const mount = tanstackMount(definition, 'Beeswarm distribution')
