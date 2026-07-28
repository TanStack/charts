import { channelValues, createMark, isChartValue } from './mark'
import { valueKey } from './scales'
import type {
  Channel,
  ChartKey,
  ChartMark,
  ChartPoint,
  ChartValue,
  SceneNode,
} from './types'

export interface TextOptions<TDatum> {
  id?: string
  x?: Channel<TDatum, ChartValue | null | undefined>
  y?: Channel<TDatum, ChartValue | null | undefined>
  text?: Channel<TDatum, string | number | null | undefined>
  key?: Channel<TDatum, ChartKey>
  fill?: string
  fontSize?: number
  fontWeight?: number
  anchor?: 'start' | 'middle' | 'end'
  rotate?: number
}

export function text<TDatum>(
  source: Iterable<TDatum>,
  options: TextOptions<TDatum> = {},
): ChartMark<TDatum> {
  const data = Array.isArray(source) ? source : Array.from(source)

  return createMark(({ markIndex }) => {
    const id = options.id ?? `text-${markIndex}`
    const xValues = channelValues(data, options.x, (_datum, index) => index)
    const yValues = channelValues(data, options.y, (datum) =>
      typeof datum === 'number' ? datum : undefined,
    )
    const textValues = channelValues(data, options.text, (datum) =>
      datum == null ? '' : String(datum),
    )
    const keys = channelValues(data, options.key, (_datum, index) => index)

    return {
      id,
      channels: {
        x: { scale: 'x', values: xValues.filter(isChartValue) },
        y: { scale: 'y', values: yValues.filter(isChartValue) },
      },
      render: ({ scales, theme }) => {
        const nodes: SceneNode[] = []
        const points: ChartPoint<TDatum>[] = []
        data.forEach((datum, datumIndex) => {
          const xValue = xValues[datumIndex]
          const yValue = yValues[datumIndex]
          const textValue = textValues[datumIndex]
          if (
            !isChartValue(xValue) ||
            !isChartValue(yValue) ||
            textValue == null
          )
            return
          const x = scales.x.map(xValue)
          const y = scales.y.map(yValue)
          const color = options.fill ?? theme.foreground
          const key = `${id}:${valueKey(keys[datumIndex])}`
          nodes.push({
            kind: 'label',
            key,
            x,
            y,
            text: String(textValue),
            anchor: options.anchor ?? 'middle',
            baseline: 'middle',
            rotate: options.rotate,
            fontSize: options.fontSize,
            fontWeight: options.fontWeight,
            style: { fill: color },
          })
          points.push({
            key,
            markId: id,
            group: null,
            groupLabel: id,
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
              className: 'ts-chart__text',
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
