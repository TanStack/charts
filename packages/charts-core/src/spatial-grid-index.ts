import { createGridIndex } from './spatial-grid-index-internal'
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
  return createGridIndex(points)
}
