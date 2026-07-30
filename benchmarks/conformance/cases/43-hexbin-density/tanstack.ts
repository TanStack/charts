import { cars } from '@charts-poc/demo-data/cars'
import { defineChart, hexagon } from '@tanstack/charts'
import { hexbin } from 'd3-hexbin'
import { scaleLinear, scaleThreshold } from 'd3-scale'
import { tanstackMount } from '../../shared/mount'
import type { CarsRow } from '@charts-poc/demo-data/cars'
import type { ConformanceInput } from '../../types'

type CompleteCar = CarsRow & {
  readonly 'economy (mpg)': number
}

interface HexbinCell {
  id: string
  x: number
  y: number
  count: number
}

const margin = { top: 20, right: 20, bottom: 40, left: 48 } as const
const colors = ['#dbeafe', '#93c5fd', '#3b82f6', '#1d4ed8']
const coordinate = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
})

const definition = (input: ConformanceInput) => {
  const rows = cars
    .filter((row): row is CompleteCar => row['economy (mpg)'] !== null)
    .slice(input.revision * 8, input.revision * 8 + 360)

  return defineChart(({ width, height }) => {
    const xScale = scaleLinear()
      .domain([1500, 5500])
      .range([margin.left, width - margin.right])
    const yScale = scaleLinear()
      .domain([5, 50])
      .range([height - margin.bottom, margin.top])
    const bins = hexbin<CompleteCar>()
      .x((row) => xScale(row['weight (lb)']))
      .y((row) => yScale(row['economy (mpg)']))
      .radius(24 / Math.sqrt(3))
      .extent([
        [margin.left, margin.top],
        [width - margin.right, height - margin.bottom],
      ])(rows)
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
          color: 'count',
          r: 11,
          stroke: '#ffffff',
          strokeWidth: 0.75,
        }),
      ],
      x: {
        scale: scaleLinear().domain([1500, 5500]),
        grid: true,
        label: 'Weight (lb)',
      },
      y: {
        scale: scaleLinear().domain([5, 50]),
        grid: true,
        label: 'Fuel economy (mpg)',
      },
      color: {
        scale: scaleThreshold<number, string>,
        domain: [5, 12, 24],
        range: colors,
      },
      margin,
    }
  })
}

export const mount = tanstackMount(
  definition,
  'Hexagonally binned point density',
  {
    format: (point) =>
      `Bin center: ${coordinate.format(point.datum.x)} lb, ${coordinate.format(point.datum.y)} mpg · Cars: ${point.datum.count}`,
  },
)
