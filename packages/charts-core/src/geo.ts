import { geoCentroid, geoPath } from 'd3-geo'
import type {
  GeoPermissibleObjects,
  GeoGeometryObjects,
  GeoIdentityTransform,
  GeoProjection,
  GeoSphere,
  GeoStreamWrapper,
} from 'd3-geo'
import {
  channelValues,
  inferredKeyValues,
  isChartKey,
  isNonnegativeFiniteNumber,
  visualValue,
} from './mark'
import { createMarkWithScaleValues } from './mark-with-scale-values'
import { resolveNumericScale } from './scale-input'
import { valueKey } from './scales'
import type {
  Channel,
  ChannelAccessor,
  ChartBounds,
  ChartKey,
  ChartMark,
  ChartMarkMotionOptions,
  ChartNumericScale,
  ChartPoint,
  SceneNode,
  VisualChannel,
} from './types'

export interface GeoProjectionContext<TDatum> {
  chart: ChartBounds
  data: readonly TDatum[]
}

export interface GeoProjectionDescriptor {
  type: () => GeoProjection | GeoIdentityTransform
  /**
   * Geometry fitted into the final plot bounds.
   * Use "sphere" to retain a complete world frame.
   */
  fit: 'data' | 'sphere' | GeoPermissibleObjects
  inset?: number
}

export type GeoProjectionInput<TDatum> =
  | ((
      context: GeoProjectionContext<TDatum>,
    ) => GeoProjection | GeoStreamWrapper | null)
  | GeoProjectionDescriptor

export interface GeoShapeOptions<
  TDatum extends GeoPermissibleObjects,
> extends ChartMarkMotionOptions<TDatum> {
  id?: string
  className?: string
  projection: GeoProjectionInput<TDatum>
  key?: Channel<TDatum, ChartKey>
  color?: Channel<TDatum, ChartKey | null | undefined>
  /** Pixel radius for Point and MultiPoint geometry. Defaults to 4.5. */
  r?: number | Channel<TDatum, number | null | undefined>
  /** Maps a quantitative radius value to a nonnegative pixel radius. */
  rScale?: ChartNumericScale
  fill?: VisualChannel<TDatum, string>
  fillOpacity?: number
  stroke?: VisualChannel<TDatum, string>
  strokeOpacity?: number
  strokeWidth?: number
  strokeDasharray?: string
  opacity?: number
  anchor?: ChannelAccessor<
    TDatum,
    readonly [longitude: number, latitude: number]
  >
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
): ChartMark<TDatum, number, number, never, never> {
  const data = Array.isArray(source) ? source : Array.from(source)

  return createMarkWithScaleValues<TDatum, number, number, never, never>(
    ({ markIndex }) => {
      const id = options.id ?? `geo-shape-${markIndex}`
      const colorValues = channelValues(data, options.color, () => null)
      const keys = inferredKeyValues(data, options.key)
      const rawRadii =
        typeof options.r === 'number'
          ? data.map(() => options.r as number)
          : channelValues(data, options.r, () => 4.5)
      const radiusMapper = resolveNumericScale(options.rScale, rawRadii)
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
          const projection = resolveGeoProjection(
            options.projection,
            chart,
            data,
          )
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
            const color = resolveColor(group)
            const paint = geoPaint(datum)
            const fill = visualValue(
              options.fill,
              datum,
              datumIndex,
              data,
              paint & 2 ? color : 'none',
            )
            const stroke = visualValue(
              options.stroke,
              datum,
              datumIndex,
              data,
              paint & 1 ? color : 'none',
            )
            const key = `${id}:${valueKey(keys[datumIndex])}`

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
              options.anchor?.(datum, { index: datumIndex, data }) ??
              geoCentroid(datum)
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
              group: null,
              groupLabel: id,
              datum,
              datumIndex,
              xValue: longitude,
              yValue: latitude,
              x,
              y,
              color: paint === 1 ? stroke : fill,
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
    },
    options.motion,
  )
}

const sphere: GeoSphere = { type: 'Sphere' }

function resolveGeoProjection<TDatum extends GeoPermissibleObjects>(
  input: GeoProjectionInput<TDatum>,
  chart: ChartBounds,
  data: readonly TDatum[],
): GeoProjection | GeoIdentityTransform | GeoStreamWrapper | null {
  if (typeof input === 'function') return input({ chart, data })

  const projection = input.type()
  const fit =
    input.fit === 'sphere'
      ? sphere
      : input.fit === 'data'
        ? geoDataGeometry(data)
        : input.fit
  if (!fit) return projection

  const inset =
    input.inset !== undefined && Number.isFinite(input.inset)
      ? Math.min(
          Math.max(0, input.inset),
          Math.max(0, (Math.min(chart.width, chart.height) - 1) / 2),
        )
      : 0
  return projection.fitExtent(
    [
      [chart.x + inset, chart.y + inset],
      [chart.x + chart.width - inset, chart.y + chart.height - inset],
    ],
    fit,
  )
}

function geoDataGeometry(
  data: readonly GeoPermissibleObjects[],
): GeoPermissibleObjects | null {
  const geometries: GeoGeometryObjects[] = []
  for (const datum of data) collectGeometries(datum, geometries)
  if (geometries.length === 0) return null
  if (geometries.length === 1) return geometries[0] ?? null
  return { type: 'GeometryCollection', geometries }
}

function collectGeometries(
  object: GeoPermissibleObjects,
  output: GeoGeometryObjects[],
): void {
  if ('geometry' in object) {
    if (object.geometry) collectGeometries(object.geometry, output)
    return
  }
  if ('features' in object) {
    for (const feature of object.features) collectGeometries(feature, output)
    return
  }
  if ('geometries' in object) {
    for (const geometry of object.geometries) {
      collectGeometries(geometry, output)
    }
    return
  }
  output.push(object)
}

function geoPaint(object: GeoPermissibleObjects): number {
  if ('geometry' in object) {
    return object.geometry ? geoPaint(object.geometry) : 0
  }
  if ('features' in object) {
    return object.features.reduce(
      (paint, feature) => paint | geoPaint(feature),
      0,
    )
  }
  if ('geometries' in object) {
    return object.geometries.reduce(
      (paint, geometry) => paint | geoPaint(geometry),
      0,
    )
  }
  return object.type === 'LineString' || object.type === 'MultiLineString'
    ? 1
    : 2
}
