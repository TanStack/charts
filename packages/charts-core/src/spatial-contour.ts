import { thresholdSturges } from 'd3-array'
import { contours as createContours } from 'd3-contour'
import {
  channelValues,
  createMark,
  isChartKey,
  isFiniteNumber,
  visualValue,
} from './mark'
import {
  identifyContourLevels,
  mapContourPolygons,
  normalizeContourThresholds,
} from './spatial-contour-internal'
import type { ContourLevelIdentity } from './spatial-contour-internal'
import type { TransformLineage } from './transform'
import type {
  Channel,
  ChartKey,
  ChartMark,
  ChartMarkMotionOptions,
  SceneNode,
  VisualChannel,
} from './types'
import type { ContourMultiPolygon } from 'd3-contour'

export interface ContourDatum<TDatum> extends TransformLineage<TDatum> {
  /** Scalar threshold represented by this level set. */
  readonly value: number
}

export interface ContourOptions<TDatum> extends ChartMarkMotionOptions<never> {
  id?: string
  /** Number of row-major grid columns. */
  width: number
  /** Number of row-major grid rows. */
  height: number
  /** Scalar grid value. Numeric source data defaults to identity. */
  value?: Channel<TDatum, number | null | undefined>
  /** Exact levels or an approximate level count. Defaults to Sturges. */
  thresholds?: number | Iterable<number>
  /** Linear marching-squares interpolation. Defaults to true. */
  smooth?: boolean
  color?: Channel<ContourDatum<TDatum>, ChartKey | null | undefined>
  fill?: VisualChannel<ContourDatum<TDatum>, string>
  fillOpacity?: number
  stroke?: VisualChannel<ContourDatum<TDatum>, string>
  strokeOpacity?: number
  strokeWidth?: number
  strokeDasharray?: string
  opacity?: number
}

interface PreparedContour<TDatum> {
  readonly datum: ContourDatum<TDatum>
  readonly geometry: ContourMultiPolygon
  readonly identity: ContourLevelIdentity
}

/** Generates scalar-grid contours and projects them into final plot bounds. */
export function contour<TDatum>(
  source: Iterable<TDatum>,
  options: ContourOptions<NoInfer<TDatum>>,
): ChartMark<never, never, never> {
  const data = Array.isArray(source) ? source : Array.from(source)
  const { width, height } = options
  if (!Number.isInteger(width) || width <= 0) {
    throw new TypeError('contour: width must be a positive integer')
  }
  if (!Number.isInteger(height) || height <= 0) {
    throw new TypeError('contour: height must be a positive integer')
  }
  if (data.length !== width * height) {
    throw new TypeError(
      `contour: source length must equal width * height (${width * height})`,
    )
  }

  const rawValues = channelValues(data, options.value, (datum) =>
    typeof datum === 'number' ? datum : undefined,
  )
  const sourceIndexes: number[] = []
  const values = rawValues.map((value, index) => {
    if (!isFiniteNumber(value)) return Number.NaN
    sourceIndexes.push(index)
    return value
  })
  const finiteValues = sourceIndexes.map((index) => values[index] as number)
  const thresholds = normalizeContourThresholds(
    options.thresholds,
    thresholdSturges(finiteValues),
    'contour',
  )
  const generated = createContours()
    .size([width, height])
    .smooth(options.smooth ?? true)
    .thresholds(typeof thresholds === 'number' ? thresholds : [...thresholds])(
    values,
  )
  const identified = identifyContourLevels(
    generated.map(({ value }) => value),
    typeof thresholds === 'number'
      ? { kind: 'generated', count: thresholds }
      : { kind: 'explicit' },
  )
  const lineageSource = sourceIndexes.map((index) => data[index] as TDatum)
  const prepared: readonly PreparedContour<TDatum>[] = generated.flatMap(
    (geometry, index) => {
      const level = identified[index]
      if (!level || geometry.coordinates.length === 0) return []
      return [
        {
          datum: {
            value: level.value,
            source: lineageSource,
            sourceIndexes,
          },
          geometry,
          identity: level.identity,
        },
      ]
    },
  )
  const derivedData = prepared.map(({ datum }) => datum)
  const colorValues = channelValues(
    derivedData,
    options.color,
    (datum) => datum.value,
  )

  return createMark<never, never, never>(({ markIndex }) => {
    const id = options.id ?? `contour-${markIndex}`
    return {
      id,
      channels: {
        color: {
          scale: 'color',
          values: colorValues.filter(isChartKey),
        },
      },
      render: ({ chart, color: resolveColor }) => ({
        nodes: [
          {
            kind: 'group',
            key: id,
            className: 'ts-chart__area ts-chart__contour',
            ariaHidden: true,
            translateX: chart.x,
            translateY: chart.y,
            clip: { x: 0, y: 0, width: chart.width, height: chart.height },
            children: prepared.map(({ datum, geometry, identity }, index) => {
              const colorValue = colorValues[index]
              const fallback = resolveColor(
                isChartKey(colorValue) ? colorValue : null,
              )
              return {
                kind: 'area',
                key: JSON.stringify([id, identity]),
                points: [],
                polygons: mapContourPolygons(geometry.coordinates, (x, y) => [
                  (x / width) * chart.width,
                  chart.height - (y / height) * chart.height,
                ]),
                style: {
                  fill: visualValue(
                    options.fill,
                    datum,
                    index,
                    derivedData,
                    fallback,
                  ),
                  fillOpacity: options.fillOpacity,
                  stroke:
                    options.stroke === undefined
                      ? undefined
                      : visualValue(
                          options.stroke,
                          datum,
                          index,
                          derivedData,
                          fallback,
                        ),
                  strokeOpacity: options.strokeOpacity,
                  strokeWidth: options.strokeWidth,
                  strokeDasharray: options.strokeDasharray,
                  opacity: options.opacity,
                },
              } satisfies SceneNode
            }),
          },
        ],
      }),
    }
  }, options.motion)
}
