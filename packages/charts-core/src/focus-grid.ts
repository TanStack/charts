import { valueKey } from './scales'
import { mappedFocusCoordinate } from './focus-coordinate-internal'
import type {
  ChartFocusGroupContext,
  ChartFocusResolveContext,
  ChartFocusStepContext,
  ChartPoint,
  ChartValue,
} from './types'

/**
 * Two-dimensional keyboard focus for matrices, heatmaps, and calendars.
 *
 * Rows share a scene-pixel y coordinate and columns share a scene-pixel x
 * coordinate. Left and Right move within the row, Up and Down move within the
 * column, Home and End move to the row ends, and Control or Command with Home
 * or End moves to the first or last cell. Missing cells are skipped. Several
 * points in one cell, such as a cell and its label, resolve to the first one
 * in scene order.
 */
export const focusGrid: UniversalGridFocusStrategy = {
  resolve(points, context) {
    const grid = buildGrid(points)
    const { x, y, maxDistance } = context
    let nearest: (typeof points)[number] | undefined
    let distance = Number.POSITIVE_INFINITY
    for (const row of grid.rows) {
      for (const point of row.cells) {
        const nextDistance = Math.hypot(
          mappedFocusCoordinate(point, 'x') - x,
          mappedFocusCoordinate(point, 'y') - y,
        )
        if (nextDistance >= distance) continue
        nearest = point
        distance = nextDistance
      }
    }
    if (!nearest) return []
    if (distance < maxDistance) return [nearest]
    // A pointer anywhere inside a cell's grid pitch targets that cell, so
    // large cells do not have unfocusable corners.
    const dx = Math.abs(mappedFocusCoordinate(nearest, 'x') - x)
    const dy = Math.abs(mappedFocusCoordinate(nearest, 'y') - y)
    return dx <= grid.columnPitch / 2 && dy <= grid.rowPitch / 2
      ? [nearest]
      : []
  },
  group: (_points, context) => [context.point],
  navigation: (points) => buildGrid(points).rows.flatMap((row) => row.cells),
  step(points, context) {
    const { point, key, modifier } = context
    const grid = buildGrid(points)
    const first = grid.rows[0]?.cells[0]
    const lastRow = grid.rows[grid.rows.length - 1]
    const last = lastRow?.cells[lastRow.cells.length - 1]
    const position = point && locate(grid, point)
    // Without a focused cell, or when that cell is gone, start from the edge
    // that linear navigation would use.
    if (!point || !position) {
      return key === 'End' ? last : isGridKey(key) ? first : undefined
    }
    const { row, column, index } = position
    const cells = grid.rows[row]?.cells ?? []
    switch (key) {
      case 'ArrowRight':
        return cells[index + 1] ?? point
      case 'ArrowLeft':
        return cells[index - 1] ?? point
      case 'ArrowDown':
        return verticalNeighbor(grid, row, column, 1) ?? point
      case 'ArrowUp':
        return verticalNeighbor(grid, row, column, -1) ?? point
      case 'Home':
        return modifier ? first : (cells[0] ?? point)
      case 'End':
        return modifier ? last : (cells[cells.length - 1] ?? point)
      default:
        return undefined
    }
  },
}

interface GridRow<TPoint> {
  /** Cells ordered by column coordinate; missing cells are absent. */
  cells: TPoint[]
  /** Column index for each entry in `cells`. */
  columns: number[]
}

interface Grid<TPoint> {
  rows: GridRow<TPoint>[]
  rowKeys: Map<string, number>
  columnKeys: Map<string, number>
  rowPitch: number
  columnPitch: number
}

function buildGrid<TPoint extends ChartPoint>(
  points: readonly TPoint[],
): Grid<TPoint> {
  const rowCoordinates = new Map<string, number>()
  const columnCoordinates = new Map<string, number>()
  for (const point of points) {
    const y = mappedFocusCoordinate(point, 'y')
    const x = mappedFocusCoordinate(point, 'x')
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue
    rowCoordinates.set(valueKey(y), y)
    columnCoordinates.set(valueKey(x), x)
  }
  const rowKeys = orderedKeys(rowCoordinates)
  const columnKeys = orderedKeys(columnCoordinates)
  const cells = new Map<string, TPoint>()
  for (const point of points) {
    const rowKey = valueKey(mappedFocusCoordinate(point, 'y'))
    const columnKey = valueKey(mappedFocusCoordinate(point, 'x'))
    if (!rowKeys.has(rowKey) || !columnKeys.has(columnKey)) continue
    const cellKey = `${rowKey}|${columnKey}`
    if (!cells.has(cellKey)) cells.set(cellKey, point)
  }
  const rows: GridRow<TPoint>[] = Array.from({ length: rowKeys.size }, () => ({
    cells: [],
    columns: [],
  }))
  const entries = [...cells.entries()].map(([cellKey, point]) => {
    const [rowKey = '', columnKey = ''] = cellKey.split('|')
    return {
      point,
      row: rowKeys.get(rowKey) ?? 0,
      column: columnKeys.get(columnKey) ?? 0,
    }
  })
  entries.sort((left, right) => left.column - right.column)
  for (const entry of entries) {
    rows[entry.row]?.cells.push(entry.point)
    rows[entry.row]?.columns.push(entry.column)
  }
  return {
    // Every row key comes from a placed point, so no row is empty.
    rows,
    rowKeys,
    columnKeys,
    rowPitch: pitch(rowCoordinates),
    columnPitch: pitch(columnCoordinates),
  }
}

function orderedKeys(coordinates: Map<string, number>) {
  const ordered = [...coordinates.entries()].sort(
    (left, right) => left[1] - right[1],
  )
  return new Map(ordered.map(([key], index) => [key, index]))
}

function pitch(coordinates: Map<string, number>) {
  const sorted = [...coordinates.values()].sort((left, right) => left - right)
  let smallest = Number.POSITIVE_INFINITY
  for (let index = 1; index < sorted.length; index += 1) {
    smallest = Math.min(
      smallest,
      (sorted[index] ?? 0) - (sorted[index - 1] ?? 0),
    )
  }
  // One row or column has no pitch, so that axis never rules a pointer out.
  return smallest
}

function locate<TPoint extends ChartPoint>(grid: Grid<TPoint>, point: TPoint) {
  const row = grid.rowKeys.get(valueKey(mappedFocusCoordinate(point, 'y')))
  const column = grid.columnKeys.get(
    valueKey(mappedFocusCoordinate(point, 'x')),
  )
  if (row === undefined || column === undefined) return undefined
  const index = grid.rows[row]?.columns.indexOf(column) ?? -1
  return index < 0 ? undefined : { row, column, index }
}

function verticalNeighbor<TPoint>(
  grid: Grid<TPoint>,
  row: number,
  column: number,
  direction: 1 | -1,
) {
  for (
    let index = row + direction;
    index >= 0 && index < grid.rows.length;
    index += direction
  ) {
    const candidate = grid.rows[index]
    const at = candidate?.columns.indexOf(column) ?? -1
    if (candidate && at >= 0) return candidate.cells[at]
  }
  return undefined
}

function isGridKey(key: string) {
  return (
    key === 'ArrowRight' ||
    key === 'ArrowLeft' ||
    key === 'ArrowDown' ||
    key === 'ArrowUp' ||
    key === 'Home' ||
    key === 'End'
  )
}

interface UniversalGridFocusStrategy {
  resolve: <TDatum, TXValue extends ChartValue, TYValue extends ChartValue>(
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
    context: ChartFocusResolveContext,
  ) => readonly ChartPoint<TDatum, TXValue, TYValue>[]
  group: <TDatum, TXValue extends ChartValue, TYValue extends ChartValue>(
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
    context: ChartFocusGroupContext<TDatum, TXValue, TYValue>,
  ) => readonly ChartPoint<TDatum, TXValue, TYValue>[]
  navigation: <TDatum, TXValue extends ChartValue, TYValue extends ChartValue>(
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  ) => readonly ChartPoint<TDatum, TXValue, TYValue>[]
  step: <TDatum, TXValue extends ChartValue, TYValue extends ChartValue>(
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
    context: ChartFocusStepContext<TDatum, TXValue, TYValue>,
  ) => ChartPoint<TDatum, TXValue, TYValue> | undefined
}
