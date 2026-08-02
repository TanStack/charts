import {
  channelValues,
  createMark,
  inferredKeyValues,
  isChartKey,
  isChartValue,
  isFiniteNumber,
  markStates,
  visualValue,
} from './mark'
import { valueKey } from './scales'
import { stackValues } from './stack-internal'
import type {
  Channel,
  ChartKey,
  ChartMark,
  ChartMarkState,
  ChartAreaStateStyle,
  ChartPoint,
  ChartValue,
  OptionChannelOutput,
  ScenePathGeometry,
  SceneNode,
  VisualChannel,
} from './types'
import type { StackLayout } from './stack'

export interface AreaXCurve {
  areaX: (
    right: readonly (readonly [number, number])[],
    left: readonly (readonly [number, number])[],
  ) => string
  geometry?: {
    areaX: (
      right: readonly (readonly [number, number])[],
      left: readonly (readonly [number, number])[],
    ) => ScenePathGeometry
  }
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
  layout?: StackLayout
  states?: readonly ChartMarkState<TDatum, ChartAreaStateStyle<TDatum>>[]
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
    const rawX = options.x ?? options.x2
    const rawXValues =
      typeof rawX === 'number'
        ? data.map(() => rawX)
        : channelValues(data, rawX, (datum) =>
            typeof datum === 'number' ? datum : undefined,
          )
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
    const explicitExtent = options.x1 !== undefined || options.x2 !== undefined
    if (explicitExtent && options.layout) {
      throw new TypeError(
        'An area with explicit x1 or x2 endpoints cannot also configure a stack layout',
      )
    }
    const stacked = explicitExtent
      ? undefined
      : stackValues(yValues, rawXValues, groupValues, options.layout)
    const x1Values = explicitExtent
      ? typeof options.x1 === 'number'
        ? data.map(() => options.x1 as number)
        : channelValues(data, options.x1, () => 0)
      : stacked!.starts
    const x2Values = explicitExtent
      ? typeof options.x2 === 'number'
        ? data.map(() => options.x2 as number)
        : channelValues(data, options.x2 ?? options.x, () => undefined)
      : stacked!.ends
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
      states: markStates(data, options.states),
      seriesFromColor: options.z === undefined && options.color !== undefined,
      channels: {
        x: {
          scale: 'x',
          values: [
            ...x2Values.filter(isFiniteNumber),
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
          let segmentPoints: ChartPoint<TDatum>[] = []
          let segmentIndex = 0

          const flush = () => {
            if (!right.length) return
            const lower = [...left].reverse()
            const pathGeometry = options.curve?.geometry?.areaX(right, left)
            const path = pathGeometry?.data ?? options.curve?.areaX(right, left)
            nodes.push({
              kind: 'area',
              key: `${id}:${groupKey}:segment:${segmentIndex}`,
              points: [...right, ...lower],
              path,
              pathGeometry,
              interaction: { points: segmentPoints, affinity: 'y' },
              style: {
                fill,
                fillOpacity: options.fillOpacity ?? 0.2,
                stroke,
                strokeWidth: options.strokeWidth,
              },
            })
            right = []
            left = []
            segmentPoints = []
            segmentIndex += 1
          }

          for (const datumIndex of indices) {
            const xValue = rawXValues[datumIndex]
            const x1Value = x1Values[datumIndex]
            const x2Value = x2Values[datumIndex]
            const yValue = yValues[datumIndex]
            if (
              !isFiniteNumber(xValue) ||
              !isFiniteNumber(x1Value) ||
              !isFiniteNumber(x2Value) ||
              !isChartValue(yValue)
            ) {
              flush()
              continue
            }
            const x = scales.x.map(x2Value)
            const y = scales.y.map(yValue)
            right.push([x, y])
            left.push([scales.x.map(x1Value), y])
            const key = `${id}:${groupKey}:${valueKey(keys[datumIndex])}`
            const point: ChartPoint<TDatum> = {
              key,
              markId: id,
              group,
              groupLabel: group == null ? id : String(group),
              datum: data[datumIndex],
              datumIndex,
              xValue,
              yValue,
              x1Value,
              x2Value,
              xInterval: 'difference',
              x,
              y,
              color: fill,
            }
            segmentPoints.push(point)
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
        }
      },
    }
  })
}
