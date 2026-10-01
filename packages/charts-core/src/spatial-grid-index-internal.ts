import type { ChartPoint, ChartSpatialIndex, ChartValue } from './types'

/** Counts grid cells examined by queries; tests use it to bound work. */
export interface GridIndexProbe {
  cells: number
}

export function createGridIndex<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  probe?: GridIndexProbe,
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
  // Aim for about one point per cell. Each axis is capped at the point count,
  // so the table and the number of rings stay linear in the point count.
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
  const cellCount = columns * rows
  const cellOf = new Int32Array(count)
  const starts = new Int32Array(cellCount + 1)
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
  for (let cell = 0; cell < cellCount; cell += 1) {
    starts[cell + 1]! += starts[cell]!
  }
  const fill = starts.slice(0, cellCount)
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
      const visitCell = (column: number, row: number) => {
        if (probe) probe.cells += 1
        const cell = row * columns + column
        for (let slot = starts[cell]!; slot < starts[cell + 1]!; slot += 1) {
          visit(members[slot]!)
        }
      }
      // Squared distance from the query to an axis-aligned rectangle.
      const rectDistance = (
        left: number,
        top: number,
        right: number,
        bottom: number,
      ) => {
        const dx = x < left ? left - x : x > right ? x - right : 0
        const dy = y < top ? top - y : y > bottom ? y - bottom : 0
        return dx * dx + dy * dy
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
          const firstColumn = Math.max(0, left)
          const lastColumn = Math.min(columns - 1, right)
          // Visit only the ring's cells that exist: its top and bottom rows,
          // then its left and right columns between them.
          if (top >= 0) {
            for (let cell = firstColumn; cell <= lastColumn; cell += 1) {
              visitCell(cell, top)
            }
          }
          if (ring > 0 && bottom < rows) {
            for (let cell = firstColumn; cell <= lastColumn; cell += 1) {
              visitCell(cell, bottom)
            }
          }
          const firstRow = Math.max(0, top + 1)
          const lastRow = Math.min(rows - 1, bottom - 1)
          if (left >= 0) {
            for (let cell = firstRow; cell <= lastRow; cell += 1) {
              visitCell(left, cell)
            }
          }
          if (ring > 0 && right < columns) {
            for (let cell = firstRow; cell <= lastRow; cell += 1) {
              visitCell(right, cell)
            }
          }

          // Lower bound on the distance to any unvisited cell: the nearest of
          // the grid strips beyond each side of the visited square.
          let bound = Infinity
          if (left > 0) {
            const edge = minX + left * cellWidth + slackX
            bound = Math.min(bound, rectDistance(minX, minY, edge, maxY))
          }
          if (right < columns - 1) {
            const edge = minX + (right + 1) * cellWidth - slackX
            bound = Math.min(bound, rectDistance(edge, minY, maxX, maxY))
          }
          if (top > 0) {
            const edge = minY + top * cellHeight + slackY
            bound = Math.min(bound, rectDistance(minX, minY, maxX, edge))
          }
          if (bottom < rows - 1) {
            const edge = minY + (bottom + 1) * cellHeight - slackY
            bound = Math.min(bound, rectDistance(minX, edge, maxX, maxY))
          }
          if (bound === Infinity || bound > bestDistance || bound > limit) {
            break
          }
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
