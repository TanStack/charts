import { hexbin as createHexbinLayout } from 'd3-hexbin'
import { hexagon } from './hexagon'
import { createMark } from './mark'
import { adoptResolvedChildMark } from './resolved-layout-child'
import { projectLayoutX, projectLayoutY } from './resolved-layout-position'
import { toArray, transformValues } from './transform-internal'
import {
  assertTransformOutputNames,
  prepareOutputs,
  reducePreparedOutputs,
} from './transform-reduce-internal'
import type { HexagonOptions } from './hexagon'
import type {
  LayoutSourceRow,
  ResolvedLayoutX,
  ResolvedLayoutY,
} from './resolved-layout-position'
import type { TransformLineage, TransformValue } from './transform'
import type { TransformOutputRow, TransformOutputs } from './transform-reduce'
import type { ChartMark } from './types'

type DefaultHexbinOutputs = {
  readonly count: { readonly reduce: 'count' }
}

export type HexbinDatum<
  TDatum,
  TOutputs extends TransformOutputs<TDatum> = DefaultHexbinOutputs,
> = TransformLineage<TDatum> &
  Omit<TransformOutputRow<TOutputs>, 'x' | 'y' | 'source' | 'sourceIndexes'> & {
    readonly x: number
    readonly y: number
  }

export type HexbinOptions<
  TDatum,
  TOutputs extends TransformOutputs<TDatum> = DefaultHexbinOutputs,
> = {
  x: TransformValue<TDatum, number | null | undefined>
  y: TransformValue<TDatum, number | null | undefined>
  /** Horizontal distance in pixels between adjacent bin centers. */
  binWidth?: number
  outputs?: TOutputs
} & Omit<HexagonOptions<HexbinDatum<TDatum, TOutputs>>, 'x' | 'y' | 'key'>

type HexbinInput<TDatum> = LayoutSourceRow<TDatum> &
  ResolvedLayoutX<number> &
  ResolvedLayoutY<number>

interface HexbinSourceRow<TDatum> extends LayoutSourceRow<TDatum> {
  readonly xValue: number
  readonly yValue: number
}

/** Aggregates numeric x/y observations in a final-screen hexagonal lattice. */
export function hexbin<
  TDatum,
  const TOutputs extends TransformOutputs<TDatum> = DefaultHexbinOutputs,
  const TXScaleId extends string = 'x',
  const TYScaleId extends string = 'y',
>(
  source: Iterable<TDatum>,
  options: HexbinOptions<TDatum, TOutputs> & {
    xScale?: TXScaleId
    yScale?: TYScaleId
  },
): ChartMark<
  HexbinDatum<TDatum, TOutputs>,
  number,
  number,
  number,
  number,
  TXScaleId,
  TYScaleId
> {
  const data = toArray(source)
  const binWidth = options.binWidth ?? 20
  if (!Number.isFinite(binWidth) || binWidth <= 0) {
    throw new TypeError('hexbin: binWidth must be a positive finite number')
  }
  const outputs = (options.outputs ?? {
    count: { reduce: 'count' },
  }) as TOutputs
  assertTransformOutputNames(
    outputs,
    ['x', 'y', 'source', 'sourceIndexes'],
    'hexbin',
  )
  const preparedOutputs = prepareOutputs(data, outputs)
  const xValues = transformValues(data, options.x)
  const yValues = transformValues(data, options.y)
  const sourceRows: readonly HexbinSourceRow<TDatum>[] = data.flatMap(
    (datum, sourceIndex) => {
      const xValue = xValues[sourceIndex]
      const yValue = yValues[sourceIndex]
      return isFiniteNumber(xValue) && isFiniteNumber(yValue)
        ? [{ datum, sourceIndex, xValue, yValue }]
        : []
    },
  )
  const {
    x: _x,
    y: _y,
    binWidth: _binWidth,
    outputs: _outputs,
    ...presentation
  } = options
  const layoutRadius = binWidth / Math.sqrt(3)
  const xScale = (options.xScale ?? 'x') as TXScaleId
  const yScale = (options.yScale ?? 'y') as TYScaleId

  return createMark<
    HexbinDatum<TDatum, TOutputs>,
    number,
    number,
    TXScaleId,
    TYScaleId
  >(
    ({ markIndex }) => {
      const id = options.id ?? `hexbin-${markIndex}`
      return {
        id,
        channels: {
          x: {
            scale: xScale,
            values: sourceRows.map((row) => row.xValue),
          },
          y: {
            scale: yScale,
            values: sourceRows.map((row) => row.yValue),
          },
        },
        resolveLayout: ({ chart, scales }) => {
          const resolvedXScale = scales[xScale]
          const resolvedYScale = scales[yScale]
          if (!resolvedXScale?.invert || !resolvedYScale?.invert) {
            throw new TypeError('hexbin: x and y scales must support inversion')
          }
          const rows = projectLayoutY(
            projectLayoutX(sourceRows, xValues, resolvedXScale),
            yValues,
            resolvedYScale,
          )
          const layout = createHexbinLayout<HexbinInput<TDatum>>()
            .x((row) => row.x)
            .y((row) => row.y)
            .radius(layoutRadius)
            .extent([
              [chart.x, chart.y],
              [chart.x + chart.width, chart.y + chart.height],
            ])
          const bins = layout([...rows]).map((bin) => {
            const x = resolvedXScale.invert!(bin.x)
            const y = resolvedYScale.invert!(bin.y)
            if (!isFiniteNumber(x) || !isFiniteNumber(y)) {
              throw new TypeError(
                'hexbin: x and y scales must invert to finite numbers',
              )
            }
            const sourceIndexes = bin.map((row) => row.sourceIndex)
            return {
              x,
              y,
              source: sourceIndexes.map((index) => data[index] as TDatum),
              sourceIndexes,
              ...reducePreparedOutputs<TDatum, TOutputs>(
                data,
                sourceIndexes,
                {},
                preparedOutputs,
              ),
            } as HexbinDatum<TDatum, TOutputs>
          })
          const childOptions = {
            ...presentation,
            id,
            x: (datum) => datum.x,
            y: (datum) => datum.y,
            key: (datum) => `${datum.x}:${datum.y}`,
            r: presentation.r ?? Math.max(0, layoutRadius - 1),
          } satisfies HexagonOptions<HexbinDatum<TDatum, TOutputs>>
          const child = hexagon(bins, childOptions)
          return adoptResolvedChildMark(child.initialize({ markIndex }))
        },
      }
    },
    options.motion,
    options.renderer,
  )
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}
