import { createMark, defineChart, dot, mountChart } from '@tanstack/charts'
import { Delaunay } from 'd3-delaunay'
import { scaleLinear, scaleOrdinal } from 'd3-scale'
import { voronoiColors, voronoiData, voronoiGroups } from './data'
import type { ChartPoint, ChartHostOptions, SceneNode } from '@tanstack/charts'
import type {
  ConformanceHandle,
  ConformanceInput,
  ConformanceMount,
  ConformanceTestDriver,
} from '../../types'
import type { VoronoiGroup, VoronoiPoint } from './data'

function voronoiCells(rows: readonly VoronoiPoint[]) {
  return createMark<VoronoiPoint, number, number>(({ markIndex }) => {
    const id = `voronoi-cells-${markIndex}`

    return {
      id,
      channels: {
        x: { scale: 'x', values: rows.map((row) => row.x) },
        y: { scale: 'y', values: rows.map((row) => row.y) },
      },
      render: ({ chart, scales }) => {
        const delaunay = Delaunay.from(
          rows,
          (row) => scales.x.map(row.x),
          (row) => scales.y.map(row.y),
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
            key: `${id}:${row.id}`,
            points: [],
            path,
            style: {
              fill: voronoiColors[row.group],
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

const definition = (input: ConformanceInput) =>
  defineChart(() => {
    const rows = voronoiData(input.revision)

    return {
      marks: [
        voronoiCells(rows),
        dot(rows, {
          x: 'x',
          y: 'y',
          z: 'group',
          key: 'id',
          stroke: '#ffffff',
          strokeWidth: 1,
          r: 4,
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
      color: {
        scale: scaleOrdinal<VoronoiGroup, string>()
          .domain(voronoiGroups)
          .range(voronoiGroups.map((group) => voronoiColors[group])),
      },
    }
  })

const configuredDefinition = (input: ConformanceInput) =>
  defineChart(definition(input), {
    animate: false,
    keyboard: true,
    tooltip: {
      anchor: 'pointer',
      items: [
        {
          id: 'point',
          label: 'Point',
          text: (point) => `${point.datum.label} · ${point.datum.group}`,
        },
      ],
    },
  })

export const mount: ConformanceMount = (
  container,
  input,
): ConformanceHandle => {
  let focusedIds: string[] = []
  const options: ChartHostOptions<VoronoiPoint> = {
    definition: configuredDefinition(input),
    width: input.width,
    height: input.height,
    ariaLabel: 'Voronoi nearest-point interaction',
    onFocusGroupChange(points) {
      focusedIds = points.map((point) => point.datum.id)
    },
  }
  const host = mountChart(container, options)
  const driver: ConformanceTestDriver = {
    resolveTarget(target) {
      if (target.view && target.view !== 'main') return null
      const id = target.anchor.startsWith('point:')
        ? target.anchor.slice('point:'.length)
        : null
      const point = host
        .getScene()
        .points.find((candidate) => candidate.datum.id === id)
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
      host.update({
        ...options,
        definition: configuredDefinition(nextInput),
        width: nextInput.width,
        height: nextInput.height,
      })
    },
    destroy() {
      host.destroy()
    },
  }
}
