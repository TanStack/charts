import { geoCentroid, geoPath } from 'd3-geo'
import type {
  GeoPermissibleObjects,
  GeoProjection,
  GeoStreamWrapper,
} from 'd3-geo'
import {
  channelValues,
  createMark,
  isChartKey,
  isNonnegativeFiniteNumber,
  visualValue,
} from './mark'
import { valueKey } from './scales'
import type {
  Channel,
  ChartBounds,
  ChartKey,
  ChartMark,
  ChartPoint,
  SceneNode,
  VisualChannel,
} from './types'

export interface GeoProjectionContext<TDatum> {
  chart: ChartBounds
  data: readonly TDatum[]
}

export interface GeoShapeOptions<TDatum extends GeoPermissibleObjects> {
  id?: string
  className?: string
  projection: (
    context: GeoProjectionContext<TDatum>,
  ) => GeoProjection | GeoStreamWrapper | null
  key?: Channel<TDatum, ChartKey>
  color?: Channel<TDatum, ChartKey | null | undefined>
  /** Pixel radius for Point and MultiPoint geometry. Defaults to 4.5. */
  r?: number | Channel<TDatum, number | null | undefined>
  /** Maps a quantitative radius value to a nonnegative pixel radius. */
  rScale?: (value: number) => number
  fill?: VisualChannel<TDatum, string>
  fillOpacity?: number
  stroke?: VisualChannel<TDatum, string>
  strokeOpacity?: number
  strokeWidth?: number
  strokeDasharray?: string
  opacity?: number
  anchor?: (
    datum: TDatum,
    index: number,
    data: readonly TDatum[],
  ) => readonly [longitude: number, latitude: number]
}

/**
 * Projects GeoJSON through a caller-supplied D3 projection factory.
 *
 * The projection factory receives the final responsive plot bounds. Each
 * datum is rendered with `d3-geo`'s path generator and contributes an
 * interaction point at its projected centroid when both centroids are finite.
 */
export function geoShape<TDatum extends GeoPermissibleObjects>(
  source: Iterable<TDatum>,
  options: GeoShapeOptions<NoInfer<TDatum>>,
): ChartMark<TDatum, number, number> {
  const data = Array.isArray(source) ? source : Array.from(source)

  return createMark<TDatum, number, number>(({ markIndex }) => {
    const id = options.id ?? `geo-shape-${markIndex}`
    const keys = channelValues(data, options.key, (_datum, index) => index)
    const colorValues = channelValues(data, options.color, () => null)
    const rawRadii =
      typeof options.r === 'number'
        ? data.map(() => options.r as number)
        : channelValues(data, options.r, () => 4.5)
    const radiusMapper = options.rScale
    const radii = radiusMapper
      ? rawRadii.map((value) =>
          isNonnegativeFiniteNumber(value) ? radiusMapper(value) : Number.NaN,
        )
      : rawRadii

    return {
      id,
      channels: {
        color: {
          scale: 'color',
          values: colorValues.filter(isChartKey),
        },
      },
      render: ({ chart, color: resolveColor }) => {
        const projection = options.projection({ chart, data })
        const path = geoPath<TDatum>(projection)
        const nodes: SceneNode[] = []
        const points: ChartPoint<TDatum, number, number>[] = []

        data.forEach((datum, datumIndex) => {
          const radius = radii[datumIndex]
          if (!isNonnegativeFiniteNumber(radius)) return
          path.pointRadius(radius)
          const pathData = path(datum)
          if (typeof pathData !== 'string' || pathData.length === 0) return

          const group = colorValues[datumIndex] ?? null
          const fill = visualValue(
            options.fill,
            datum,
            datumIndex,
            data,
            resolveColor(group),
          )
          const stroke = visualValue(
            options.stroke,
            datum,
            datumIndex,
            data,
            'none',
          )
          const key = `${id}:${valueKey(group)}:${valueKey(keys[datumIndex])}`

          nodes.push({
            kind: 'area',
            key,
            points: [],
            path: pathData,
            style: {
              fill,
              fillOpacity: options.fillOpacity,
              stroke,
              strokeOpacity: options.strokeOpacity,
              strokeWidth: options.strokeWidth,
              strokeDasharray: options.strokeDasharray,
              opacity: options.opacity,
              lineJoin: 'round',
            },
          })

          const [x, y] = path.centroid(datum)
          const [longitude, latitude] =
            options.anchor?.(datum, datumIndex, data) ?? geoCentroid(datum)
          if (
            !Number.isFinite(x) ||
            !Number.isFinite(y) ||
            !Number.isFinite(longitude) ||
            !Number.isFinite(latitude)
          ) {
            return
          }

          points.push({
            key,
            markId: id,
            group,
            groupLabel: group == null ? id : String(group),
            datum,
            datumIndex,
            xValue: longitude,
            yValue: latitude,
            x,
            y,
            color: fill,
          })
        })

        return {
          nodes: [
            {
              kind: 'group',
              key: id,
              className: options.className
                ? `ts-chart__geo ${options.className}`
                : 'ts-chart__geo',
              ariaHidden: true,
              children: nodes,
            },
          ],
          points,
        }
      },
    }
  })
}
