import { channelValues, createMark } from './mark'
import { valueKey } from './scales'
import { createChartScene } from './scene'
import type {
  Channel,
  ChartKey,
  ChartMark,
  ChartPoint,
  ChartSpec,
  StaticChartDefinition,
} from './types'

export interface FacetOptions<TDatum> {
  id?: string
  by: Channel<TDatum, ChartKey>
  chart: (data: readonly TDatum[], key: ChartKey) => ChartSpec
  columns?: number
  minWidth?: number
  gap?: number
  label?: boolean | ((key: ChartKey) => string)
}

export function facet<TDatum>(
  source: Iterable<TDatum>,
  options: FacetOptions<TDatum>,
): ChartMark<TDatum> {
  const data = Array.isArray(source) ? source : Array.from(source)

  return createMark(({ markIndex }) => {
    const id = options.id ?? `facet-${markIndex}`
    const keys = channelValues(data, options.by, () => '')
    const groups = new Map<string, { key: ChartKey; data: TDatum[] }>()
    data.forEach((datum, index) => {
      const key = keys[index]
      if (!isKey(key)) return
      const identity = valueKey(key)
      const group = groups.get(identity)
      if (group) group.data.push(datum)
      else groups.set(identity, { key, data: [datum] })
    })

    return {
      id,
      channels: {},
      render: ({ chart, theme }) => {
        const entries = [...groups.values()]
        const gap = Math.max(0, options.gap ?? 16)
        const automaticColumns = Math.max(
          1,
          Math.floor((chart.width + gap) / ((options.minWidth ?? 220) + gap)),
        )
        const columns = Math.max(
          1,
          Math.min(
            entries.length || 1,
            Math.floor(options.columns ?? automaticColumns),
          ),
        )
        const rows = Math.max(1, Math.ceil(entries.length / columns))
        const cellWidth = Math.max(
          1,
          (chart.width - gap * (columns - 1)) / columns,
        )
        const cellHeight = Math.max(1, (chart.height - gap * (rows - 1)) / rows)
        const showLabel = options.label !== false
        const labelHeight = showLabel ? 22 : 0
        const points: ChartPoint<TDatum>[] = []
        const children = entries.map((entry, index) => {
          const column = index % columns
          const row = Math.floor(index / columns)
          const translateX = chart.x + column * (cellWidth + gap)
          const translateY = chart.y + row * (cellHeight + gap)
          const nestedSpec = options.chart(entry.data, entry.key)
          const nestedScene = createChartScene(
            {
              ...nestedSpec,
              theme: {
                ...theme,
                ...nestedSpec.theme,
                palette: nestedSpec.theme?.palette ?? theme.palette,
              },
            },
            {
              width: cellWidth,
              height: Math.max(1, cellHeight - labelHeight),
            },
          )
          const identity = valueKey(entry.key)
          points.push(
            ...(nestedScene.points as readonly ChartPoint<TDatum>[]).map(
              (point) => ({
                ...point,
                key: `${id}:${identity}:${point.key}`,
                x: point.x + translateX,
                y: point.y + translateY + labelHeight,
              }),
            ),
          )

          return {
            kind: 'group' as const,
            key: `${id}:${identity}`,
            className: 'ts-chart__facet-cell',
            translateX,
            translateY,
            children: [
              ...(showLabel
                ? [
                    {
                      kind: 'label' as const,
                      key: `${id}:${identity}:label`,
                      x: cellWidth / 2,
                      y: 11,
                      text:
                        typeof options.label === 'function'
                          ? options.label(entry.key)
                          : String(entry.key),
                      anchor: 'middle' as const,
                      fontSize: 11,
                      fontWeight: 600,
                      style: {
                        fill: theme.foreground,
                        fillOpacity: 0.78,
                      },
                    },
                  ]
                : []),
              {
                kind: 'group' as const,
                key: `${id}:${identity}:chart`,
                translateY: labelHeight,
                children: nestedScene.nodes,
              },
            ],
          }
        })

        return {
          nodes: [
            {
              kind: 'group',
              key: id,
              className: 'ts-chart__facet',
              children,
            },
          ],
          points,
        }
      },
    }
  })
}

export function facetChart<TDatum>(
  source: Iterable<TDatum>,
  options: FacetOptions<TDatum>,
): StaticChartDefinition<TDatum> {
  return {
    marks: [facet(source, options)],
    guides: false,
    margin: 0,
  }
}

function isKey(value: unknown): value is ChartKey {
  return typeof value === 'string' || typeof value === 'number'
}
