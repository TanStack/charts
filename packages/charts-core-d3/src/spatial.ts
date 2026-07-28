import type { ChartPoint, ChartSpatialIndex } from './types'
import { nearestPoint } from './nearest'

export interface GridPointIndexOptions {
  cellSize?: number
}

export function createGridPointIndex<TDatum>(
  points: readonly ChartPoint<TDatum>[],
  options: GridPointIndexOptions = {},
): ChartSpatialIndex<TDatum> {
  const cellSize = Math.max(1, options.cellSize ?? 32)
  const cells = new Map<string, ChartPoint<TDatum>[]>()

  for (const point of points) {
    const key = cellKey(
      Math.floor(point.x / cellSize),
      Math.floor(point.y / cellSize),
    )
    const cell = cells.get(key)
    if (cell) cell.push(point)
    else cells.set(key, [point])
  }

  return {
    findNearest(x, y, maxDistance = Infinity) {
      if (!Number.isFinite(maxDistance)) {
        return nearestPoint(points, x, y, maxDistance)
      }
      const radius = Math.max(0, maxDistance)
      const centerX = Math.floor(x / cellSize)
      const centerY = Math.floor(y / cellSize)
      const cellRadius = Math.ceil(radius / cellSize)
      const candidates: ChartPoint<TDatum>[] = []
      for (
        let cellY = centerY - cellRadius;
        cellY <= centerY + cellRadius;
        cellY += 1
      ) {
        for (
          let cellX = centerX - cellRadius;
          cellX <= centerX + cellRadius;
          cellX += 1
        ) {
          const cell = cells.get(cellKey(cellX, cellY))
          if (cell) candidates.push(...cell)
        }
      }
      return nearestPoint(candidates, x, y, radius)
    },
  }
}

function cellKey(x: number, y: number): string {
  return `${x}:${y}`
}
