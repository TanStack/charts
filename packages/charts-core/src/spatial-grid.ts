import type {
  ChartPoint,
  ChartSpatialIndex,
  ChartSpatialIndexFactoryContext,
  ChartValue,
} from './types'

/**
 * Builds a uniform-grid nearest-point index for the `spatialIndex` option.
 *
 * It returns exactly the point a linear anchor scan returns: the smallest
 * squared distance from each point's `x`/`y` anchor, the earliest point on a
 * tie, and `null` beyond `maxDistance`. It does not test scene shapes, so
 * rectangles, areas, and lines are matched by their anchor points only.
 */
export function gridSpatialIndex<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  _context?: ChartSpatialIndexFactoryContext<TDatum, TXValue, TYValue>,
): ChartSpatialIndex<TDatum, TXValue, TYValue> {
  const count = points.length
  const xs = new Float64Array(count)
  const ys = new Float64Array(count)
  // Points with a non-finite anchor stay outside the grid and are scanned.
  const outside: number[] = []
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (let index = 0; index < count; index += 1) {
    const { x, y } = points[index]!
    xs[index] = x
    ys[index] = y
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      outside.push(index)
      continue
    }
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }

  const inside = count - outside.length
  const width = inside ? maxX - minX : 0
  const height = inside ? maxY - minY : 0
  // Aim for about one point per cell; a degenerate axis gets one column/row.
  const cellSize =
    width > 0 && height > 0
      ? Math.sqrt((width * height) / Math.max(1, inside))
      : Math.max(width, height) / Math.max(1, inside)
  const columns = axisCells(width, cellSize, inside)
  const rows = axisCells(height, cellSize, inside)
  const cellWidth = columns > 1 ? width / columns : 0
  const cellHeight = rows > 1 ? height / rows : 0
  const scaleX = columns > 1 ? columns / width : 0
  const scaleY = rows > 1 ? rows / height : 0
  // A float can land a point one ulp across a cell edge; pad search bounds.
  const slackX = cellWidth * 1e-6
  const slackY = cellHeight * 1e-6

  // Counting sort into a compact cell table keeps each cell in point order.
  const cellOf = new Int32Array(count)
  const starts = new Int32Array(columns * rows + 1)
  for (let index = 0; index < count; index += 1) {
    const x = xs[index]!
    const y = ys[index]!
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      cellOf[index] = -1
      continue
    }
    const cell =
      clampCell((y - minY) * scaleY, rows) * columns +
      clampCell((x - minX) * scaleX, columns)
    cellOf[index] = cell
    starts[cell + 1]! += 1
  }
  for (let cell = 0; cell < columns * rows; cell += 1) {
    starts[cell + 1]! += starts[cell]!
  }
  const fill = starts.slice(0, columns * rows)
  const members = new Int32Array(inside)
  for (let index = 0; index < count; index += 1) {
    const cell = cellOf[index]!
    if (cell >= 0) members[fill[cell]!++] = index
  }

  return {
    findNearest(x, y, maxDistance = Infinity) {
      const limit = Math.max(0, maxDistance) ** 2
      let best = -1
      let bestDistance = Infinity

      const visit = (index: number) => {
        const dx = xs[index]! - x
        const dy = ys[index]! - y
        const distance = dx * dx + dy * dy
        if (
          distance < bestDistance ||
          (distance === bestDistance && (best < 0 || index < best))
        ) {
          best = index
          bestDistance = distance
        }
      }

      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        for (let index = 0; index < count; index += 1) visit(index)
      } else if (inside) {
        const column = clampCell((x - minX) * scaleX, columns)
        const row = clampCell((y - minY) * scaleY, rows)
        for (let ring = 0; ; ring += 1) {
          const left = column - ring
          const right = column + ring
          const top = row - ring
          const bottom = row + ring
          const firstRow = Math.max(0, top)
          const lastRow = Math.min(rows - 1, bottom)
          const firstColumn = Math.max(0, left)
          const lastColumn = Math.min(columns - 1, right)
          for (let cellRow = firstRow; cellRow <= lastRow; cellRow += 1) {
            const edgeRow = cellRow === top || cellRow === bottom
            const step = edgeRow ? 1 : Math.max(1, right - left)
            for (
              let cellColumn = edgeRow ? firstColumn : left;
              cellColumn <= lastColumn;
              cellColumn += step
            ) {
              if (cellColumn < 0) continue
              const cell = cellRow * columns + cellColumn
              for (let slot = starts[cell]!; slot < starts[cell + 1]!; slot++) {
                visit(members[slot]!)
              }
            }
          }

          // Lower bound on the distance to any cell outside this square.
          let reach = Infinity
          if (left > 0) {
            reach = Math.min(reach, x - (minX + left * cellWidth) - slackX)
          }
          if (right < columns - 1) {
            reach = Math.min(reach, minX + (right + 1) * cellWidth - x - slackX)
          }
          if (top > 0) {
            reach = Math.min(reach, y - (minY + top * cellHeight) - slackY)
          }
          if (bottom < rows - 1) {
            reach = Math.min(
              reach,
              minY + (bottom + 1) * cellHeight - y - slackY,
            )
          }
          if (reach === Infinity) break
          const bound = Math.max(0, reach) ** 2
          if (bound > bestDistance || bound > limit) break
        }
      }
      for (const index of outside) visit(index)

      return best >= 0 && bestDistance <= limit ? points[best]! : null
    },
  }
}

function axisCells(extent: number, cellSize: number, count: number): number {
  if (!(extent > 0) || !(cellSize > 0)) return 1
  return Math.max(1, Math.min(count, Math.ceil(extent / cellSize)))
}

function clampCell(position: number, cells: number): number {
  const cell = Math.floor(position)
  return cell < 0 ? 0 : cell >= cells ? cells - 1 : cell
}
