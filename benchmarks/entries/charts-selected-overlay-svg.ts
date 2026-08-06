import { dot } from '@tanstack/charts/dot'
import { controlledSignal } from '@tanstack/charts/interaction/signal'
import { createChartScene, defineChart } from '@tanstack/charts/scene'
import {
  keyedSelection,
  whenSelected,
  type KeyedSelectionChange,
} from '@tanstack/charts/selection'
import { renderChartSvg } from '@tanstack/charts/svg'
import { scaleLinear } from 'd3-scale'

const rows = [
  { id: 'a' as const, x: 1, y: 2 },
  { id: 'b' as const, x: 2, y: 4 },
  { id: 'c' as const, x: 3, y: 3 },
]
type Row = (typeof rows)[number]
type RowId = Row['id']
const selection = keyedSelection<Row, RowId, number, number>({
  selected: controlledSignal<
    RowId | null,
    KeyedSelectionChange<Row, RowId, number, number>
  >('b', () => {}),
  key: (datum) => datum.id,
})
const definition = defineChart({
  marks: [
    dot(rows, {
      id: 'observations',
      x: 'x',
      y: 'y',
      key: 'id',
      r: 4,
    }),
    whenSelected(
      dot(rows, {
        id: 'selected-observation',
        x: 'x',
        y: 'y',
        key: 'id',
        r: 7,
        fill: '#f97316',
      }),
      selection,
    ),
  ],
  guides: false,
  x: { scale: scaleLinear().domain([0, 4]) },
  y: { scale: scaleLinear().domain([0, 5]) },
  selection,
})

export function render(width: number, height: number) {
  return renderChartSvg(createChartScene(definition, { width, height }), {
    ariaLabel: 'Selected dot chart',
  })
}
