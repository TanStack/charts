import { arrowGeometry } from './arrow-geometry'
import {
  channelValues,
  createMark,
  inferredKeyValues,
  isChartKey,
  isChartValue,
  isFiniteNumber,
  visualValue,
} from './mark'
import { valueKey } from './scales'
import type {
  Channel,
  ChartKey,
  ChartMark,
  ChartPoint,
  ChartValue,
  OptionChannelOutput,
  SceneNode,
  VisualChannel,
} from './types'

export type VectorAnchor = 'start' | 'middle' | 'end'

export interface VectorOptions<TDatum> {
  id?: string
  x: Channel<TDatum, ChartValue | null | undefined>
  y: Channel<TDatum, ChartValue | null | undefined>
  length?: number | Channel<TDatum, number | null | undefined>
  rotate?: number | Channel<TDatum, number | null | undefined>
  anchor?: VectorAnchor
  z?: Channel<TDatum, ChartKey | null | undefined>
  color?: Channel<TDatum, ChartKey | null | undefined>
  key?: Channel<TDatum, ChartKey>
  stroke?: VisualChannel<TDatum, string>
  strokeOpacity?: number
  strokeWidth?: number
  headLength?: number
  headAngle?: number
}

/**
 * Draws fixed-pixel vectors at scaled anchors. Rotation is clockwise in
 * degrees, with zero pointing up.
 */
export function vector<
  TDatum,
  const TOptions extends VectorOptions<NoInfer<TDatum>>,
>(
  source: Iterable<TDatum>,
  options: TOptions,
): ChartMark<
  TDatum,
  OptionChannelOutput<TDatum, TOptions, 'x', number>,
  OptionChannelOutput<TDatum, TOptions, 'y', number>
>
export function vector<TDatum>(
  source: Iterable<TDatum>,
  options: VectorOptions<NoInfer<TDatum>>,
): ChartMark<TDatum> {
  const data = Array.isArray(source) ? source : Array.from(source)

  return createMark(({ markIndex }) => {
    const id = options.id ?? `vector-${markIndex}`
    const xValues = channelValues(data, options.x, () => undefined)
    const yValues = channelValues(data, options.y, () => undefined)
    const lengthOption = options.length
    const lengthValues =
      typeof lengthOption === 'number'
        ? data.map(() => lengthOption)
        : channelValues(data, lengthOption, () => 12)
    const rotateOption = options.rotate
    const rotateValues =
      typeof rotateOption === 'number'
        ? data.map(() => rotateOption)
        : channelValues(data, rotateOption, () => 0)
    const zValues = channelValues(data, options.z, () => null)
    const colorValues =
      options.color === undefined
        ? zValues
        : channelValues(data, options.color, () => null)
    const keys = inferredKeyValues(data, options.key, { groups: zValues })

    return {
      id,
      channels: {
        x: { scale: 'x', values: xValues.filter(isChartValue) },
        y: { scale: 'y', values: yValues.filter(isChartValue) },
        color: { scale: 'color', values: colorValues.filter(isChartKey) },
      },
      render: ({ scales, color: resolveColor }) => {
        const nodes: SceneNode[] = []
        const points: ChartPoint<TDatum>[] = []
        const anchor = options.anchor ?? 'middle'
        const headLength = Math.max(0, options.headLength ?? 5)
        const headAngle = ((options.headAngle ?? 30) * Math.PI) / 180

        data.forEach((datum, datumIndex) => {
          const xValue = xValues[datumIndex]
          const yValue = yValues[datumIndex]
          const length = lengthValues[datumIndex]
          const rotate = rotateValues[datumIndex]
          if (
            !isChartValue(xValue) ||
            !isChartValue(yValue) ||
            !isFiniteNumber(length) ||
            !isFiniteNumber(rotate)
          ) {
            return
          }

          const x = scales.x.map(xValue)
          const y = scales.y.map(yValue)
          const radians = (rotate * Math.PI) / 180
          const dx = Math.sin(radians) * length
          const dy = -Math.cos(radians) * length
          const [x1, y1, x2, y2] =
            anchor === 'start'
              ? [x, y, x + dx, y + dy]
              : anchor === 'end'
                ? [x - dx, y - dy, x, y]
                : [x - dx / 2, y - dy / 2, x + dx / 2, y + dy / 2]
          const group = zValues[datumIndex] ?? null
          const color = visualValue(
            options.stroke,
            datum,
            datumIndex,
            data,
            resolveColor(colorValues[datumIndex] ?? null),
          )
          const key = `${id}:${valueKey(group)}:${valueKey(keys[datumIndex])}`
          const style = {
            stroke: color,
            strokeOpacity: options.strokeOpacity,
            strokeWidth: options.strokeWidth ?? 1.5,
            lineCap: 'round' as const,
            lineJoin: 'round' as const,
          }

          nodes.push(
            arrowGeometry({
              key,
              x1,
              y1,
              x2,
              y2,
              headLength,
              headAngle,
              style,
              className: 'ts-chart__vector-item',
            }),
          )
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
              className: 'ts-chart__vector',
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
