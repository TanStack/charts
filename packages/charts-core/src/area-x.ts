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

export interface AreaXCurve {
  areaX: (
    right: readonly (readonly [number, number])[],
    left: readonly (readonly [number, number])[],
  ) => string
}

export interface AreaXOptions<TDatum> {
  id?: string
  x?: Channel<TDatum, number | null | undefined>
  x1?: number | Channel<TDatum, number | null | undefined>
  x2?: number | Channel<TDatum, number | null | undefined>
  y?: Channel<TDatum, ChartValue | null | undefined>
  z?: Channel<TDatum, ChartKey | null | undefined>
  color?: Channel<TDatum, ChartKey | null | undefined>
  key?: Channel<TDatum, ChartKey>
  fill?: VisualChannel<TDatum, string>
  fillOpacity?: number
  stroke?: VisualChannel<TDatum, string>
  strokeWidth?: number
  curve?: AreaXCurve
}

export function areaX<TDatum>(
  source: Iterable<TDatum>,
): ChartMark<TDatum, number, number>
export function areaX<
  TDatum,
  const TOptions extends AreaXOptions<NoInfer<TDatum>> | undefined,
>(
  source: Iterable<TDatum>,
  options: TOptions,
): ChartMark<TDatum, number, OptionChannelOutput<TDatum, TOptions, 'y', number>>
export function areaX<TDatum>(
  source: Iterable<TDatum>,
  options: AreaXOptions<NoInfer<TDatum>> = {},
): ChartMark<TDatum, any, any> {
  const data = Array.isArray(source) ? source : Array.from(source)

  return createMark(({ markIndex }) => {
    const id = options.id ?? `area-x-${markIndex}`
    const x2 = options.x2 ?? options.x
    const xValues =
      typeof x2 === 'number'
        ? data.map(() => x2)
        : channelValues(data, x2, (datum) =>
            typeof datum === 'number' ? datum : undefined,
          )
    const x1Values =
      typeof options.x1 === 'number'
        ? data.map(() => options.x1 as number)
        : channelValues(data, options.x1, () => 0)
    const yValues = channelValues(data, options.y, (_datum, index) => index)
    const zValues = channelValues(data, options.z, () => null)
    const colorValues =
      options.color === undefined
        ? zValues
        : channelValues(data, options.color, () => null)
    const groupValues =
      options.z === undefined && options.color !== undefined
        ? colorValues
        : zValues
    const keys = inferredKeyValues(data, options.key, {
      groups: groupValues,
      candidates: [yValues],
      markId: id,
      warningIdentity: options,
    })
    const groups = new Map<string, number[]>()
    groupValues.forEach((value, index) => {
      const key = valueKey(value ?? null)
      const group = groups.get(key)
      if (group) group.push(index)
      else groups.set(key, [index])
    })

    return {
      id,
      channels: {
        x: {
          scale: 'x',
          values: [
            ...xValues.filter(isFiniteNumber),
            ...x1Values.filter(isFiniteNumber),
          ],
          includeZero: options.x1 === undefined,
        },
        y: { scale: 'y', values: yValues.filter(isChartValue) },
        color: {
          scale: 'color',
          values: colorValues.filter(isChartKey),
        },
      },
      render: ({ scales, color: resolveColor }) => {
        const nodes: SceneNode[] = []
        const points: ChartPoint<TDatum>[] = []

        for (const [groupKey, indices] of groups) {
          const firstIndex = indices[0]
          if (firstIndex === undefined) continue
          const group = groupValues[firstIndex] ?? null
          const datum = data[firstIndex]
          const resolvedColor = resolveColor(colorValues[firstIndex] ?? null)
          const fill = visualValue(
            options.fill,
            datum,
            firstIndex,
            data,
            resolvedColor,
          )
          const stroke =
            options.stroke === undefined
              ? undefined
              : visualValue(
                  options.stroke,
                  datum,
                  firstIndex,
                  data,
                  resolvedColor,
                )
          let right: (readonly [number, number])[] = []
          let left: (readonly [number, number])[] = []
          let segmentIndex = 0

          const flush = () => {
            if (!right.length) return
            const lower = [...left].reverse()
            const path = options.curve?.areaX(right, left)
            nodes.push({
              kind: 'area',
              key: `${id}:${groupKey}:segment:${segmentIndex}`,
              points: [...right, ...lower],
              path,
              style: {
                fill,
                fillOpacity: options.fillOpacity ?? 0.2,
                stroke,
                strokeWidth: options.strokeWidth,
              },
            })
            right = []
            left = []
            segmentIndex += 1
          }

          for (const datumIndex of indices) {
            const xValue = xValues[datumIndex]
            const x1Value = x1Values[datumIndex]
            const yValue = yValues[datumIndex]
            if (
              !isFiniteNumber(xValue) ||
              !isFiniteNumber(x1Value) ||
              !isChartValue(yValue)
            ) {
              flush()
              continue
            }
            const x = scales.x.map(xValue)
            const y = scales.y.map(yValue)
            right.push([x, y])
            left.push([scales.x.map(x1Value), y])
            const key = `${id}:${groupKey}:${valueKey(keys[datumIndex])}`
            points.push({
              key,
              markId: id,
              group,
              groupLabel: group == null ? id : String(group),
              datum: data[datumIndex],
              datumIndex,
              xValue,
              yValue,
              x1Value,
              x2Value: xValue,
              xInterval: 'difference',
              x,
              y,
              color: fill,
            })
          }
          flush()
        }

        return {
          nodes: [
            {
              kind: 'group',
              key: id,
              className: 'ts-chart__area',
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
