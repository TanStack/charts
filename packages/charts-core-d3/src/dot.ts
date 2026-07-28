import { channelValues, createMark, isChartKey, isChartValue } from './mark'
import { scaleRadius, type ChartRadiusScale } from './radius-scale'
import { valueKey } from './scales'
import type {
  Channel,
  ChartKey,
  ChartMark,
  ChartPoint,
  ChartValue,
  SceneNode,
} from './types'

export interface DotOptions<TDatum> {
  id?: string
  x?: Channel<TDatum, ChartValue | null | undefined>
  y?: Channel<TDatum, ChartValue | null | undefined>
  z?: Channel<TDatum, ChartKey | null | undefined>
  key?: Channel<TDatum, ChartKey>
  r?: number | Channel<TDatum, number | null | undefined>
  rScale?: ChartRadiusScale | false
  fill?: string
  fillOpacity?: number
  stroke?: string
  strokeWidth?: number
}

export function dot<TDatum>(
  source: Iterable<TDatum>,
  options: DotOptions<TDatum> = {},
): ChartMark<TDatum> {
  const data = Array.isArray(source) ? source : Array.from(source)

  return createMark(({ markIndex }) => {
    const id = options.id ?? `dot-${markIndex}`
    const xValues = channelValues(data, options.x, (_datum, index) => index)
    const yValues = channelValues(data, options.y, (datum) =>
      typeof datum === 'number' ? datum : undefined,
    )
    const zValues = channelValues(data, options.z, () => null)
    const keys = channelValues(data, options.key, (_datum, index) => index)
    const rawRadii =
      typeof options.r === 'number'
        ? data.map(() => options.r as number)
        : channelValues(data, options.r, () => 3.5)
    const radiusMapper =
      options.r !== undefined &&
      typeof options.r !== 'number' &&
      options.rScale !== false
        ? (options.rScale ?? scaleRadius()).resolve(
            rawRadii.filter(validRadius),
          )
        : undefined
    const radii = radiusMapper
      ? rawRadii.map((value) =>
          validRadius(value) ? radiusMapper(value) : Number.NaN,
        )
      : rawRadii

    return {
      id,
      channels: {
        x: { scale: 'x', values: xValues.filter(isChartValue) },
        y: { scale: 'y', values: yValues.filter(isChartValue) },
        color: {
          scale: 'color',
          values: zValues.filter(isChartKey),
        },
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
            !validRadius(radius)
          )
            return
          const group = zValues[datumIndex] ?? null
          const groupKey = valueKey(group)
          const color = options.fill ?? resolveColor(group)
          const x = scales.x.map(xValue)
          const y = scales.y.map(yValue)
          const key = `${id}:${groupKey}:${valueKey(keys[datumIndex])}`
          nodes.push({
            kind: 'dot',
            key,
            x,
            y,
            radius,
            style: {
              fill: color,
              fillOpacity: options.fillOpacity,
              stroke: options.stroke,
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
            color,
          })
        })

        return {
          nodes: [
            {
              kind: 'group',
              key: id,
              className: 'ts-chart__dot',
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

function validRadius(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}
