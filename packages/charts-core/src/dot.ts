import {
  channelValues,
  compositeKeyValues,
  inferredKeyValues,
  isChartKey,
  isChartValue,
  isNonnegativeFiniteNumber,
  markStates,
} from './mark'
import { createMarkWithScaleValues } from './mark-with-scale-values'
import { resolveDotLayout } from './dot-layout'
import { projectLayoutX, projectLayoutY } from './resolved-layout-position'
import { resolveNumericScale } from './scale-input'
import { valueKey } from './scales'
import type { DotLayout } from './dot-layout'
import type {
  LayoutSourceRow,
  ResolvedLayoutX,
  ResolvedLayoutY,
} from './resolved-layout-position'
import type {
  Channel,
  CartesianChartMark,
  CartesianScaleBindings,
  ChartBounds,
  ChartKey,
  ChartMark,
  ChartMarkMotionOptions,
  ChartMarkState,
  ChartDotStateStyle,
  ChartNumericScale,
  ChartPoint,
  ChartValue,
  OptionChannelOutput,
  ResolvedScale,
  SceneNode,
} from './types'

export interface DotOptions<TDatum>
  extends ChartMarkMotionOptions<TDatum>, CartesianScaleBindings {
  id?: string
  x?: Channel<TDatum, ChartValue | null | undefined>
  y?: Channel<TDatum, ChartValue | null | undefined>
  z?: Channel<TDatum, ChartKey | null | undefined>
  color?: Channel<TDatum, ChartKey | null | undefined>
  key?: Channel<TDatum, ChartKey>
  r?: number | Channel<TDatum, number | null | undefined>
  rScale?: ChartNumericScale
  fill?: string
  fillOpacity?: number
  layout?: DotLayout
  stroke?: string
  strokeOpacity?: number
  strokeWidth?: number
  states?: readonly ChartMarkState<TDatum, ChartDotStateStyle<TDatum>>[]
}

type DotOptionLayout<TOptions> = TOptions extends {
  readonly layout?: infer TLayout
}
  ? NonNullable<TLayout>
  : never

type DotPointX<TDatum, TOptions> = [DotOptionLayout<TOptions>] extends [never]
  ? OptionChannelOutput<TDatum, TOptions, 'x', number>
  : DotOptionLayout<TOptions> extends DotLayout<'x', infer TAnchor>
    ? TAnchor
    : OptionChannelOutput<TDatum, TOptions, 'x', number>

type DotPointY<TDatum, TOptions> = [DotOptionLayout<TOptions>] extends [never]
  ? OptionChannelOutput<TDatum, TOptions, 'y', number>
  : DotOptionLayout<TOptions> extends DotLayout<'y', infer TAnchor>
    ? TAnchor
    : OptionChannelOutput<TDatum, TOptions, 'y', number>

type DotScaleX<TDatum, TOptions> = [DotOptionLayout<TOptions>] extends [never]
  ? OptionChannelOutput<TDatum, TOptions, 'x', number>
  : DotOptionLayout<TOptions> extends DotLayout<'x'>
    ? never
    : OptionChannelOutput<TDatum, TOptions, 'x', number>

type DotScaleY<TDatum, TOptions> = [DotOptionLayout<TOptions>] extends [never]
  ? OptionChannelOutput<TDatum, TOptions, 'y', number>
  : DotOptionLayout<TOptions> extends DotLayout<'y'>
    ? never
    : OptionChannelOutput<TDatum, TOptions, 'y', number>

export function dot<TDatum>(
  source: Iterable<TDatum>,
): ChartMark<TDatum, number, number>
export function dot<
  TDatum,
  const TOptions extends DotOptions<NoInfer<TDatum>> | undefined,
>(
  source: Iterable<TDatum>,
  options: TOptions,
): CartesianChartMark<
  TDatum,
  DotPointX<TDatum, TOptions>,
  DotPointY<TDatum, TOptions>,
  DotScaleX<TDatum, TOptions>,
  DotScaleY<TDatum, TOptions>,
  TOptions
>
export function dot<TDatum>(
  source: Iterable<TDatum>,
  options: DotOptions<NoInfer<TDatum>> = {},
): CartesianChartMark<TDatum, any, any, any, any, DotOptions<TDatum>> {
  const data = Array.isArray(source) ? source : Array.from(source)
  const xScale = options.xScale ?? 'x'
  const yScale = options.yScale ?? 'y'

  return createMarkWithScaleValues<TDatum, any, any, any, any, string, string>(
    ({ markIndex }) => {
      const id = options.id ?? `dot-${markIndex}`
      const layout = options.layout
      if (layout?.axis === 'x' && options.x !== undefined) {
        throw new TypeError(
          'dot: x is derived by its layout and cannot be configured',
        )
      }
      if (layout?.axis === 'y' && options.y !== undefined) {
        throw new TypeError(
          'dot: y is derived by its layout and cannot be configured',
        )
      }
      const xValues =
        layout?.axis === 'x'
          ? data.map(() => layout.anchor)
          : channelValues(data, options.x, (_datum, { index }) => index)
      const yValues =
        layout?.axis === 'y'
          ? data.map(() => layout.anchor)
          : channelValues(data, options.y, (datum) =>
              typeof datum === 'number' ? datum : undefined,
            )
      const zValues = channelValues(data, options.z, () => null)
      const colorValues =
        options.color === undefined
          ? zValues
          : channelValues(data, options.color, () => null)
      const keys = inferredKeyValues(data, options.key, {
        groups: zValues,
        candidates:
          layout?.axis === 'x'
            ? [yValues]
            : layout?.axis === 'y'
              ? [xValues]
              : [xValues, yValues, compositeKeyValues(xValues, yValues)],
        markId: id,
        warningIdentity: options,
      })
      const rawRadii =
        typeof options.r === 'number'
          ? data.map(() => options.r as number)
          : channelValues(data, options.r, () => 3.5)
      const radiusMapper = resolveNumericScale(options.rScale, rawRadii)
      const radii = radiusMapper
        ? rawRadii.map((value) =>
            isNonnegativeFiniteNumber(value) ? radiusMapper(value) : Number.NaN,
          )
        : rawRadii

      const sourceRows: readonly LayoutSourceRow<TDatum>[] = data.map(
        (datum, sourceIndex) => ({ datum, sourceIndex }),
      )
      type PositionedRow = LayoutSourceRow<TDatum> &
        ResolvedLayoutX<ChartValue> &
        ResolvedLayoutY<ChartValue>

      const renderPositions = (
        positions: readonly PositionedRow[],
        resolveColor: (value: ChartKey | null | undefined) => string,
      ) => {
        const nodes: SceneNode[] = []

        positions.forEach((position) => {
          const {
            datum,
            sourceIndex: datumIndex,
            xValue,
            yValue,
            x,
            y,
          } = position
          const radius = radii[datumIndex]
          if (!isNonnegativeFiniteNumber(radius)) return
          const group = zValues[datumIndex] ?? null
          const groupKey = valueKey(group)
          const color =
            options.fill ?? resolveColor(colorValues[datumIndex] ?? null)
          const key = `${id}:${groupKey}:${valueKey(keys[datumIndex])}`
          const point: ChartPoint<TDatum> = {
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
          }
          nodes.push({
            kind: 'dot',
            key,
            x,
            y,
            radius,
            interaction: {
              point,
              affinity:
                layout?.axis === 'y'
                  ? 'x'
                  : layout?.axis === 'x'
                    ? 'y'
                    : undefined,
            },
            style: {
              fill: color,
              fillOpacity: options.fillOpacity,
              stroke: options.stroke,
              strokeOpacity: options.strokeOpacity,
              strokeWidth: options.strokeWidth,
            },
          })
        })

        return {
          nodes: [
            {
              kind: 'group' as const,
              key: id,
              className: 'ts-chart__dot',
              ariaHidden: true,
              children: nodes,
            },
          ],
        }
      }

      const channels = {
        ...(layout?.axis !== 'x'
          ? { x: { scale: xScale, values: xValues.filter(isChartValue) } }
          : {}),
        ...(layout?.axis !== 'y'
          ? { y: { scale: yScale, values: yValues.filter(isChartValue) } }
          : {}),
        color: {
          scale: 'color',
          values: colorValues.filter(isChartKey),
        },
      }

      const initialized = {
        id,
        states: markStates(data, options.states),
        channels,
      }

      if (!layout) {
        return {
          ...initialized,
          render: ({ scales, color: resolveColor }) => {
            const resolvedXScale = requiredScale(scales[xScale], xScale)
            const resolvedYScale = requiredScale(scales[yScale], yScale)
            const positions = projectLayoutY(
              projectLayoutX(sourceRows, xValues, resolvedXScale),
              yValues,
              resolvedYScale,
            )
            return renderPositions(positions, resolveColor)
          },
        }
      }

      return {
        ...initialized,
        resolveLayout: ({ chart, scales }) => {
          if (layout.axis === 'y') {
            const measured = projectLayoutX(
              sourceRows,
              xValues,
              requiredScale(scales[xScale], xScale),
            ).filter((row) => isNonnegativeFiniteNumber(radii[row.sourceIndex]))
            const crossPositions = resolveCrossPositions(
              layout,
              chart,
              measured.map((row) => row.x),
              measured.map((row) => radii[row.sourceIndex]!),
            )
            const positions: readonly PositionedRow[] = measured.map(
              (row, index) => ({
                ...row,
                yValue: layout.anchor,
                y: crossPositions[index]!,
              }),
            )
            return {
              render: ({ color: resolveColor }) =>
                renderPositions(positions, resolveColor),
            }
          }

          const measured = projectLayoutY(
            sourceRows,
            yValues,
            requiredScale(scales[yScale], yScale),
          ).filter((row) => isNonnegativeFiniteNumber(radii[row.sourceIndex]))
          const crossPositions = resolveCrossPositions(
            layout,
            chart,
            measured.map((row) => row.y),
            measured.map((row) => radii[row.sourceIndex]!),
          )
          const positions: readonly PositionedRow[] = measured.map(
            (row, index) => ({
              ...row,
              xValue: layout.anchor,
              x: crossPositions[index]!,
            }),
          )

          return {
            render: ({ color: resolveColor }) =>
              renderPositions(positions, resolveColor),
          }
        },
      }
    },
    options.motion,
    options.renderer,
  )
}

function requiredScale(
  scale: ResolvedScale | undefined,
  id: string,
): ResolvedScale {
  if (!scale) throw new TypeError(`dot: missing ${id} scale`)
  return scale
}

function resolveCrossPositions(
  layout: DotLayout,
  chart: ChartBounds,
  measuredPositions: readonly number[],
  radii: readonly number[],
): readonly number[] {
  const positions = layout[resolveDotLayout]({
    chart,
    measuredPositions,
    radii,
  })
  if (
    positions.length !== measuredPositions.length ||
    positions.some((position) => !Number.isFinite(position))
  ) {
    throw new TypeError('dot: layout must resolve one finite position per row')
  }
  return positions
}
