import { cars } from '@charts-poc/demo-data/cars'
import { createMark, defineChart, dot, mountChart } from '@tanstack/charts'
import { Delaunay } from 'd3-delaunay'
import { scaleLinear } from 'd3-scale'
import type { CarsRow } from '@charts-poc/demo-data/cars'
import type { ChartHostOptions, SceneNode } from '@tanstack/charts'
import type {
  ConformanceHandle,
  ConformanceInput,
  ConformanceMount,
  ConformanceTestDriver,
} from '../../types'

type CompleteCar = CarsRow & {
  readonly 'economy (mpg)': number
}

const colors = ['#2563eb', '#0d9488', '#d97706']

function voronoiCells(rows: readonly CompleteCar[]) {
  return createMark<CompleteCar, number, number>(({ markIndex }) => {
    const id = `voronoi-cells-${markIndex}`

    return {
      id,
      channels: {
        x: {
          scale: 'x',
          values: rows.map((row) => row['weight (lb)']),
        },
        y: {
          scale: 'y',
          values: rows.map((row) => row['economy (mpg)']),
        },
        color: {
          scale: 'color',
          values: rows.map(cylinderLabel),
        },
      },
      render: ({ chart, scales, color }) => {
        const delaunay = Delaunay.from(
          rows,
          (row) => scales.x.map(row['weight (lb)']),
          (row) => scales.y.map(row['economy (mpg)']),
        )
        const cells = delaunay.voronoi([
          chart.x,
          chart.y,
          chart.x + chart.width,
          chart.y + chart.height,
        ])
        const children: SceneNode[] = []

        rows.forEach((row, index) => {
          const path = cells.renderCell(index)
          if (path === null) return
          children.push({
            kind: 'area',
            key: `${id}:${carKey(row)}`,
            points: [],
            path,
            style: {
              fill: color(cylinderLabel(row)),
              fillOpacity: 0.14,
              stroke: '#ffffff',
              strokeWidth: 1,
            },
          })
        })

        return {
          nodes: [
            {
              kind: 'group',
              key: id,
              className: 'ts-chart__voronoi',
              ariaHidden: true,
              children,
            },
          ],
        }
      },
    }
  })
}

const definition = (rows: readonly CompleteCar[]) =>
  defineChart({
    marks: [
      voronoiCells(rows),
      dot(rows, {
        x: 'weight (lb)',
        y: 'economy (mpg)',
        color: cylinderLabel,
        stroke: '#ffffff',
        strokeWidth: 1,
        r: 4,
      }),
    ],
    x: { scale: scaleLinear, grid: true, axis: { label: 'Weight (lb)' } },
    y: {
      scale: scaleLinear,
      grid: true,
      axis: { label: 'Fuel economy (mpg)' },
    },
    color: {
      range: colors,
    },
  })

const configuredDefinition = (rows: readonly CompleteCar[]) =>
  defineChart(definition(rows), {
    animate: false,
    keyboard: true,
    tooltip: {
      anchor: 'pointer',
      items: [
        {
          id: 'car',
          label: 'Car',
          text: (point) =>
            `${point.datum.name} · ${cylinderLabel(point.datum)}`,
        },
      ],
    },
  })

export const mount: ConformanceMount = (
  container,
  input,
): ConformanceHandle => {
  let rows = selectedCars(input.revision)
  let focusedIds: string[] = []
  const options: ChartHostOptions<CompleteCar> = {
    definition: configuredDefinition(rows),
    width: input.width,
    height: input.height,
    ariaLabel: 'Voronoi nearest-point interaction',
    onFocusGroupChange(points) {
      focusedIds = points.map((point) => carKey(point.datum))
    },
  }
  const host = mountChart(container, options)
  const driver: ConformanceTestDriver = {
    resolveTarget(target) {
      if (target.view && target.view !== 'main') return null
      const key = target.anchor.startsWith('car:')
        ? target.anchor.slice('car:'.length)
        : ''
      const row = rows.find((candidate) => carKey(candidate) === key)
      const point = host
        .getScene()
        .points.find((candidate) => candidate.datum === row)
      const svg = container.querySelector('svg')
      if (!point || !svg) return null
      const scene = host.getScene()
      const bounds = svg.getBoundingClientRect()
      return {
        x: bounds.left + (point.x / scene.width) * bounds.width,
        y: bounds.top + (point.y / scene.height) * bounds.height,
        focusElement: svg,
      }
    },
    readState() {
      const tooltip = container.querySelector<HTMLElement>('.ts-chart-tooltip')
      return {
        focus: { ids: [...focusedIds] },
        tooltip: {
          visible: Boolean(tooltip && !tooltip.hidden),
          text: tooltip?.textContent?.trim() ?? '',
        },
      }
    },
  }

  return {
    driver,
    update(nextInput) {
      rows = selectedCars(nextInput.revision)
      host.update({
        ...options,
        definition: configuredDefinition(rows),
        width: nextInput.width,
        height: nextInput.height,
      })
    },
    destroy() {
      host.destroy()
    },
  }
}

function selectedCars(revision: number): CompleteCar[] {
  return cars
    .filter((row): row is CompleteCar => row['economy (mpg)'] !== null)
    .slice(revision * 3, revision * 3 + 18)
}

function cylinderLabel(row: CarsRow): string {
  return `${row.cylinders} cylinders`
}

function carKey(row: CarsRow): string {
  return `${row.name}:${row.year}:${row['weight (lb)']}`
}
