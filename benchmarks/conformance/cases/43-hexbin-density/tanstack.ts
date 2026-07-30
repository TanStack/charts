import { defineChart, hexagon } from '@tanstack/charts'
import { hexbin } from 'd3-hexbin'
import { scaleLinear } from 'd3-scale'
import { hexbinData } from './data'
import type { HexbinPoint } from './data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

interface HexbinCell {
  id: string
  x: number
  y: number
  count: number
}

const margin = { top: 20, right: 20, bottom: 40, left: 48 } as const
const coordinate = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
})

const definition = (input: ConformanceInput) =>
  defineChart(() => {
    const xScale = scaleLinear()
      .domain([0, 100])
      .range([margin.left, input.width - margin.right])
    const yScale = scaleLinear()
      .domain([0, 100])
      .range([input.height - margin.bottom, margin.top])
    const bins = hexbin<HexbinPoint>()
      .x((row) => xScale(row.x))
      .y((row) => yScale(row.y))
      .radius(24 / Math.sqrt(3))
      .extent([
        [margin.left, margin.top],
        [input.width - margin.right, input.height - margin.bottom],
      ])(Array.from(hexbinData(input.revision)))
    const cells: readonly HexbinCell[] = bins.map((bin) => ({
      id: `${bin.x}:${bin.y}`,
      x: xScale.invert(bin.x),
      y: yScale.invert(bin.y),
      count: bin.length,
    }))

    return {
      marks: [
        hexagon(cells, {
          x: 'x',
          y: 'y',
          key: 'id',
          r: 11,
          fill: (cell) => countColor(cell.count),
          stroke: '#ffffff',
          strokeWidth: 0.75,
        }),
      ],
      x: {
        scale: scaleLinear().domain([0, 100]),
        grid: true,
        label: 'X',
      },
      y: {
        scale: scaleLinear().domain([0, 100]),
        grid: true,
        label: 'Y',
      },
      margin,
    }
  })

export const mount = tanstackMount(
  definition,
  'Hexagonally binned point density',
  {
    format: (point) =>
      `Bin center: (${coordinate.format(point.datum.x)}, ${coordinate.format(point.datum.y)}) · Points: ${point.datum.count}`,
  },
)

function countColor(count: number): string {
  if (count < 5) return '#dbeafe'
  if (count < 12) return '#93c5fd'
  if (count < 24) return '#3b82f6'
  return '#1d4ed8'
}
