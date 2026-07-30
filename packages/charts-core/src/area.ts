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
  ChartCurve,
  OptionChannelOutput,
  SceneNode,
  VisualChannel,
} from './types'

export interface AreaYOptions<TDatum> {
  id?: string
  x?: Channel<TDatum, ChartValue | null | undefined>
  y?: Channel<TDatum, number | null | undefined>
  y1?: number | Channel<TDatum, number | null | undefined>
  y2?: number | Channel<TDatum, number | null | undefined>
  z?: Channel<TDatum, ChartKey | null | undefined>
  key?: Channel<TDatum, ChartKey>
  fill?: VisualChannel<TDatum, string>
  fillOpacity?: number
  stroke?: VisualChannel<TDatum, string>
  strokeWidth?: number
  curve?: ChartCurve
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
    const y2 = options.y2 ?? options.y
    const yValues =
      typeof y2 === 'number'
        ? data.map(() => y2)
        : channelValues(data, y2, (datum) =>
            typeof datum === 'number' ? datum : undefined,
          )
    const y1Values =
      typeof options.y1 === 'number'
        ? data.map(() => options.y1 as number)
        : channelValues(data, options.y1, () => 0)
    const zValues = channelValues(data, options.z, () => null)
    const keys = inferredKeyValues(data, options.key, {
      groups: zValues,
      candidates: [xValues],
      markId: id,
    })
    const groups = new Map<string, number[]>()
    zValues.forEach((value, index) => {
      const key = valueKey(value ?? null)
      const group = groups.get(key)
      if (group) group.push(index)
      else groups.set(key, [index])
    })

    return {
      id,
      channels: {
        x: { scale: 'x', values: xValues.filter(isChartValue) },
        y: {
          scale: 'y',
          values: [
            ...yValues.filter(isFiniteNumber),
            ...y1Values.filter(isFiniteNumber),
          ],
          includeZero: options.y1 === undefined,
        },
        color: {
          scale: 'color',
          values: zValues.filter(isChartKey),
        },
      },
      render: ({ scales, color: resolveColor }) => {
        const nodes: SceneNode[] = []
        const points: ChartPoint<TDatum>[] = []

        for (const [groupKey, indices] of groups) {
          const group = zValues[indices[0]] ?? null
          const firstIndex = indices[0]
          if (firstIndex === undefined) continue
          const datum = data[firstIndex]
          const resolvedColor = resolveColor(group)
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
              style: {
                fill,
                fillOpacity: options.fillOpacity ?? 0.2,
                stroke,
                strokeWidth: options.strokeWidth,
              },
            })
            top = []
            bottom = []
            segmentIndex += 1
          }

          for (const datumIndex of indices) {
            const xValue = xValues[datumIndex]
            const yValue = yValues[datumIndex]
            const y1Value = y1Values[datumIndex]
            if (
              !isChartValue(xValue) ||
              !isFiniteNumber(yValue) ||
              !isFiniteNumber(y1Value)
            ) {
              flush()
              continue
            }
            const x = scales.x.map(xValue)
            const y = scales.y.map(yValue)
            top.push([x, y])
            bottom.push([x, scales.y.map(y1Value)])
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
              y1Value,
              y2Value: yValue,
              yInterval: 'difference',
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
