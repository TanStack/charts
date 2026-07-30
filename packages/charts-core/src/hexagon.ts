import {
  channelValues,
  createMark,
  inferredKeyValues,
  isChartKey,
  isChartValue,
  isNonnegativeFiniteNumber,
  visualValue,
} from './mark'
import { resolveNumericScale } from './scale-input'
import { valueKey } from './scales'
import type {
  Channel,
  ChartKey,
  ChartMark,
  ChartNumericScale,
  ChartPoint,
  ChartValue,
  OptionChannelOutput,
  SceneNode,
  VisualChannel,
} from './types'

export interface HexagonOptions<TDatum> {
  id?: string
  x?: Channel<TDatum, ChartValue | null | undefined>
  y?: Channel<TDatum, ChartValue | null | undefined>
  z?: Channel<TDatum, ChartKey | null | undefined>
  key?: Channel<TDatum, ChartKey>
  r?: number | Channel<TDatum, number | null | undefined>
  rScale?: ChartNumericScale
  fill?: VisualChannel<TDatum, string>
  fillOpacity?: number
  stroke?: VisualChannel<TDatum, string>
  strokeOpacity?: number
  strokeWidth?: number
}

/** Draws pointy-topped, fixed-pixel hexagons at scaled x/y positions. */
export function hexagon<TDatum>(
  source: Iterable<TDatum>,
): ChartMark<TDatum, number, number>
export function hexagon<
  TDatum,
  const TOptions extends HexagonOptions<NoInfer<TDatum>> | undefined,
>(
  source: Iterable<TDatum>,
  options: TOptions,
): ChartMark<
  TDatum,
  OptionChannelOutput<TDatum, TOptions, 'x', number>,
  OptionChannelOutput<TDatum, TOptions, 'y', number>
>
export function hexagon<TDatum>(
  source: Iterable<TDatum>,
  options: HexagonOptions<NoInfer<TDatum>> = {},
): ChartMark<TDatum> {
  const data = Array.isArray(source) ? source : Array.from(source)

  return createMark(({ markIndex }) => {
    const id = options.id ?? `hexagon-${markIndex}`
    const xValues = channelValues(data, options.x, (_datum, index) => index)
    const yValues = channelValues(data, options.y, (datum) =>
      typeof datum === 'number' ? datum : undefined,
    )
    const zValues = channelValues(data, options.z, () => null)
    const keys = inferredKeyValues(data, options.key, { groups: zValues })
    const radiusOption = options.r
    const rawRadii =
      typeof radiusOption === 'number'
        ? data.map(() => radiusOption)
        : channelValues(data, radiusOption, () => 6)
    const radiusMapper = resolveNumericScale(options.rScale, rawRadii)
    const radii = radiusMapper
      ? rawRadii.map((radius) =>
          isNonnegativeFiniteNumber(radius) ? radiusMapper(radius) : Number.NaN,
        )
      : rawRadii

    return {
      id,
      channels: {
        x: { scale: 'x', values: xValues.filter(isChartValue) },
        y: { scale: 'y', values: yValues.filter(isChartValue) },
        color: { scale: 'color', values: zValues.filter(isChartKey) },
      },
      render: ({ scales, color: resolveColor }) => {
        const nodes: SceneNode[] = []
        const points: ChartPoint<TDatum>[] = []

        data.forEach((datum, datumIndex) => {
          const xValue = xValues[datumIndex]
          const yValue = yValues[datumIndex]
          const radius = radii[datumIndex]
          if (
            !isChartValue(xValue) ||
            !isChartValue(yValue) ||
            !isNonnegativeFiniteNumber(radius)
          ) {
            return
          }
          const x = scales.x.map(xValue)
          const y = scales.y.map(yValue)
          const group = zValues[datumIndex] ?? null
          const fallback = resolveColor(group)
          const fill = visualValue(
            options.fill,
            datum,
            datumIndex,
            data,
            fallback,
          )
          const stroke =
            options.stroke === undefined
              ? undefined
              : visualValue(options.stroke, datum, datumIndex, data, fallback)
          const key = `${id}:${valueKey(group)}:${valueKey(keys[datumIndex])}`
          const vertices = Array.from({ length: 6 }, (_, vertex) => {
            const angle = ((vertex * 60 - 90) * Math.PI) / 180
            return [
              x + Math.cos(angle) * radius,
              y + Math.sin(angle) * radius,
            ] as const
          })

          nodes.push({
            kind: 'area',
            key,
            points: vertices,
            style: {
              fill,
              fillOpacity: options.fillOpacity,
              stroke,
              strokeOpacity: options.strokeOpacity,
              strokeWidth: options.strokeWidth,
            },
          })
          points.push({
            key,
            markId: id,
            group,
            groupLabel: group == null ? id : String(group),
            datum,
            datumIndex,
            xValue,
            yValue,
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
              className: 'ts-chart__hexagon',
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
