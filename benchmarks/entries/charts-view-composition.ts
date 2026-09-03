import { dot } from '@tanstack/charts/dot'
import { createChartScene, defineChart } from '@tanstack/charts/scene'
import { renderChartSvg } from '@tanstack/charts/svg'
import { composeViews, grid, shareX } from '@tanstack/charts/view'
import { scaleLinear } from 'd3-scale'

const rows = [
  { x: 0, y: 2 },
  { x: 1, y: 5 },
]
const x = scaleLinear().domain([0, 1])
const definition = composeViews({
  views: {
    overview: defineChart({
      marks: [dot(rows, { x: 'x', y: 'y', r: 2 })],
      scales: {
        x: { scale: x },
        y: { scale: scaleLinear().domain([0, 5]) },
      },

      guides: false,
    }),
    main: defineChart({
      marks: [dot(rows, { x: 'x', y: 'y' })],
      scales: {
        x: { scale: x },
        y: { scale: scaleLinear().domain([0, 5]) },
      },
    }),
  },
  layout: grid({
    rows: [
      { id: 'overview', size: 52 },
      { id: 'main', grow: 1 },
    ],
    columns: [{ id: 'main', grow: 1 }],
    gap: 8,
    cells: {
      overview: { row: 'overview', column: 'main' },
      main: { row: 'main', column: 'main' },
    },
  }),
  links: [shareX('overview', 'main')],
})

export const output = renderChartSvg(
  createChartScene(definition, { width: 320, height: 180 }),
  { ariaLabel: 'Coordinated view composition' },
)
