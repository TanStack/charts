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
  ChartCurve,
  OptionChannelOutput,
  SceneNode,
  VisualChannel,
} from './types'
import type { StackLayout } from './stack'

export interface AreaYOptions<TDatum> {
  id?: string
  x?: Channel<TDatum, ChartValue | null | undefined>
  y?: Channel<TDatum, number | null | undefined>
  y1?: number | Channel<TDatum, number | null | undefined>
  y2?: number | Channel<TDatum, number | null | undefined>
  z?: Channel<TDatum, ChartKey | null | undefined>
  color?: Channel<TDatum, ChartKey | null | undefined>
  key?: Channel<TDatum, ChartKey>
  fill?: VisualChannel<TDatum, string>
  fillOpacity?: number
  stroke?: VisualChannel<TDatum, string>
  strokeWidth?: number
  curve?: ChartCurve
  layout?: StackLayout
  states?: readonly ChartMarkState<TDatum, ChartAreaStateStyle<TDatum>>[]
}

export function areaY<TDatum>(
  source: Iterable<TDatum>,
): ChartMark<TDatum, number, number>
export function areaY<
  TDatum,
  const TOptions extends AreaYOptions<NoInfer<TDatum>> | undefined,
>(
  source: Iterable<TDatum>,
  options: TOptions,
): ChartMark<TDatum, OptionChannelOutput<TDatum, TOptions, 'x', number>, number>
export function areaY<TDatum>(
  source: Iterable<TDatum>,
  options: AreaYOptions<NoInfer<TDatum>> = {},
): ChartMark<TDatum, any, any> {
  const data = Array.isArray(source) ? source : Array.from(source)

  return createMark(({ markIndex }) => {
    const id = options.id ?? `area-y-${markIndex}`
    const xValues = channelValues(data, options.x, (_datum, index) => index)
    const rawY = options.y ?? options.y2
    const rawYValues =
      typeof rawY === 'number'
        ? data.map(() => rawY)
        : channelValues(data, rawY, (datum) =>
            typeof datum === 'number' ? datum : undefined,
          )
    const zValues = channelValues(data, options.z, () => null)
    const colorValues =
      options.color === undefined
        ? zValues
        : channelValues(data, options.color, () => null)
    const groupValues =
      options.z === undefined && options.color !== undefined
        ? colorValues
        : zValues
    const explicitExtent = options.y1 !== undefined || options.y2 !== undefined
    if (explicitExtent && options.layout) {
      throw new TypeError(
        'An area with explicit y1 or y2 endpoints cannot also configure a stack layout',
      )
    }
    const stacked = explicitExtent
      ? undefined
      : stackValues(xValues, rawYValues, groupValues, options.layout)
    const y1Values = explicitExtent
      ? typeof options.y1 === 'number'
        ? data.map(() => options.y1 as number)
        : channelValues(data, options.y1, () => 0)
      : stacked!.starts
    const y2Values = explicitExtent
      ? typeof options.y2 === 'number'
        ? data.map(() => options.y2 as number)
        : channelValues(data, options.y2 ?? options.y, () => undefined)
      : stacked!.ends
    const keys = inferredKeyValues(data, options.key, {
      groups: groupValues,
      candidates: [xValues],
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
        x: { scale: 'x', values: xValues.filter(isChartValue) },
        y: {
          scale: 'y',
          values: [
            ...y2Values.filter(isFiniteNumber),
            ...y1Values.filter(isFiniteNumber),
          ],
          includeZero: options.y1 === undefined,
        },
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
          let top: (readonly [number, number])[] = []
          let bottom: (readonly [number, number])[] = []
          let segmentPoints: ChartPoint<TDatum>[] = []
          let segmentIndex = 0

          const flush = () => {
            if (!top.length) return
            const lower = [...bottom].reverse()
            const path = options.curve?.area(top, bottom)
            nodes.push({
              kind: 'area',
              key: `${id}:${groupKey}:segment:${segmentIndex}`,
              points: [...top, ...lower],
              path,
              interaction: { points: segmentPoints, affinity: 'x' },
              style: {
                fill,
                fillOpacity: options.fillOpacity ?? 0.2,
                stroke,
                strokeWidth: options.strokeWidth,
              },
            })
            top = []
            bottom = []
            segmentPoints = []
            segmentIndex += 1
          }

          for (const datumIndex of indices) {
            const xValue = xValues[datumIndex]
            const yValue = rawYValues[datumIndex]
            const y1Value = y1Values[datumIndex]
            const y2Value = y2Values[datumIndex]
            if (
              !isChartValue(xValue) ||
              !isFiniteNumber(yValue) ||
              !isFiniteNumber(y1Value) ||
              !isFiniteNumber(y2Value)
            ) {
              flush()
              continue
            }
            const x = scales.x.map(xValue)
            const y = scales.y.map(y2Value)
            top.push([x, y])
            bottom.push([x, scales.y.map(y1Value)])
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
              y1Value,
              y2Value,
              yInterval: 'difference',
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
