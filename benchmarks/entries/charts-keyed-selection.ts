import { controlledSignal } from '@tanstack/charts/interaction/signal'
import { keyedSelection } from '@tanstack/charts/selection'
import type { ChartPoint } from '@tanstack/charts/types'

interface Row {
  id: 'a' | 'b'
  x: number
  y: number
}

export function activateSelection(
  selected: Row['id'] | null,
  point: ChartPoint<Row, number, number> | null,
) {
  let change: unknown
  const selection = keyedSelection<Row, Row['id'], number, number>({
    selected: controlledSignal(selected, (next, reason) => {
      change = { next, reason }
    }),
    key: (datum) => datum.id,
  })
  selection.change(point, 'pointer')
  return change
}
