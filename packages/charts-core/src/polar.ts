import {
  arc as createArc,
  areaRadial as createAreaRadial,
  curveLinearClosed,
  lineRadial as createLineRadial,
  pointRadial,
} from 'd3-shape'
import {
  channelValues,
  inferredKeyValues,
  isChartKey,
  isChartValue,
  isFiniteNumber,
  isNonnegativeFiniteNumber,
  visualValue,
} from './mark'
import { createMarkWithScaleValues } from './mark-with-scale-values'
import { resolveNumericScale, resolveScaleInput } from './scale-input'
import { valueKey } from './scales'
import type { Arc, CurveFactory, CurveFactoryLineOnly } from 'd3-shape'
import type {
  Channel,
  ChartAxisValue,
  ChartBounds,
  ChartKey,
  ChartMark,
  ChartNumericScale,
  ChartPoint,
  ChartTheme,
  ChartValue,
  ChartScaleInput,
  MarkScene,
  OptionChannelOutput,
  SceneNode,
  VisualChannel,
} from './types'

const tau = Math.PI * 2

export interface PolarResolvedScale<TValue extends ChartValue = ChartValue> {
  domain: readonly TValue[]
  map: (value: TValue) => number
  ticks: (count: number) => readonly TValue[]
  bandwidth: number
}

export interface PolarLayoutContext {
  chart: ChartBounds
  centerX: number
  centerY: number
  radius: number
  startAngle: number
  endAngle: number
  angle?: PolarResolvedScale
  radiusScale?: PolarResolvedScale
}

export type PolarLength = number | ((context: PolarLayoutContext) => number)

export interface PolarAngleOptions<TValue extends ChartValue = any> {
  scale: ChartScaleInput<TValue>
  nice?: boolean | number
  /**
   * Avoids placing the first and last points at the same angle for point
   * scales. Defaults to true for a complete revolution and false for a
   * partial angular range.
   */
  wrap?: boolean
}

export interface PolarRadiusOptions<TValue extends ChartValue = any> {
  scale: ChartScaleInput<TValue>
  nice?: boolean | number
}

interface InitializedPolarMark<
  TDatum = unknown,
  TAngle extends ChartValue = ChartValue,
  TRadius extends ChartValue = ChartValue,
> {
  id: string
  colorValues: readonly unknown[]
  angleValues: readonly unknown[]
  radiusValues: readonly unknown[]
  includeZeroRadius: boolean
  requiresAngleScale: boolean
  requiresRadiusScale: boolean
  render: (
    context: PolarMarkRenderContext,
  ) => MarkScene<TDatum, TAngle, TRadius>
}

interface PolarMarkInitializeContext {
  markIndex: number
  parentId: string
}

interface PolarMarkRenderContext {
  layout: PolarLayoutContext
  color: (value: ChartKey | null | undefined) => string
  theme: ChartTheme
}

export interface PolarMark<
  TDatum = unknown,
  TAngle extends ChartValue = ChartValue,
  TRadius extends ChartValue = ChartValue,
> {
  initialize: (
    context: PolarMarkInitializeContext,
  ) => InitializedPolarMark<TDatum, TAngle, TRadius>
  readonly __datum?: TDatum
  readonly __angle?: TAngle
  readonly __radius?: TRadius
}

interface PolarGuideRenderContext {
  layout: PolarLayoutContext
  theme: ChartTheme
  guideIndex: number
  parentId: string
}

export interface PolarGuide {
  render: (context: PolarGuideRenderContext) => PolarGuideScene
}

export interface PolarGuideScene {
  background: readonly SceneNode[]
  foreground?: readonly SceneNode[]
}

type AnyPolarMark = PolarMark<unknown, any, any>

type PolarMarkDatum<TMark> =
  TMark extends PolarMark<infer TDatum, any, any> ? TDatum : never

type PolarMarkAngle<TMark> =
  TMark extends PolarMark<any, infer TAngle, any> ? TAngle : never

type PolarMarkRadius<TMark> =
  TMark extends PolarMark<any, any, infer TRadius> ? TRadius : never

export interface PolarOptions<
  TMarks extends readonly AnyPolarMark[] = readonly AnyPolarMark[],
> {
  id?: string
  className?: string
  marks: TMarks
  guides?: readonly PolarGuide[]
  angle?: PolarAngleOptions<ChartAxisValue<PolarMarkAngle<TMarks[number]>>>
  radius?: PolarRadiusOptions<ChartAxisValue<PolarMarkRadius<TMarks[number]>>>
  startAngle?: number
  endAngle?: number
  /** Pixel inset applied before radiusRatio. */
  inset?: number
  /** Multiplier applied to the final available radius. Defaults to 1. */
  radiusRatio?: number
}

export function polar<const TMarks extends readonly AnyPolarMark[]>(
  options: PolarOptions<TMarks>,
): ChartMark<
  PolarMarkDatum<TMarks[number]>,
  PolarMarkAngle<TMarks[number]>,
  PolarMarkRadius<TMarks[number]>,
  never,
  never
>
export function polar(
  options: PolarOptions,
): ChartMark<any, any, any, never, never> {
  return createMarkWithScaleValues<any, any, any, never, never>(
    ({ markIndex }) => {
      const id = options.id ?? `polar-${markIndex}`
      const marks = options.marks.map((mark, polarMarkIndex) =>
        mark.initialize({ markIndex: polarMarkIndex, parentId: id }),
      )

      return {
        id,
        channels: {
          color: {
            scale: 'color',
            values: marks.flatMap((mark) => mark.colorValues),
          },
        },
        render: ({ chart, color, theme }) => {
          const layout = resolvePolarLayout(options, chart, marks)
          if (marks.some((mark) => mark.requiresAngleScale) && !layout.angle) {
            throw new TypeError(
              `Polar mark in "${id}" requires a configured angle scale`,
            )
          }
          if (
            marks.some((mark) => mark.requiresRadiusScale) &&
            !layout.radiusScale
          ) {
            throw new TypeError(
              `Polar mark in "${id}" requires a configured radius scale`,
            )
          }

          const nodes: SceneNode[] = []
          const guideForeground: SceneNode[] = []
          const points: ChartPoint<any, any, any>[] = []
          for (const [guideIndex, guide] of (options.guides ?? []).entries()) {
            const rendered = guide.render({
              layout,
              theme,
              guideIndex,
              parentId: id,
            })
            for (const node of rendered.background) nodes.push(node)
            for (const node of rendered.foreground ?? []) {
              guideForeground.push(node)
            }
          }
          for (const mark of marks) {
            const rendered = mark.render({ layout, color, theme })
            for (const node of rendered.nodes) nodes.push(node)
            for (const point of rendered.points ?? []) points.push(point)
          }
          for (const node of guideForeground) nodes.push(node)

          return {
            nodes: [
              {
                kind: 'group',
                key: id,
                className: classes('ts-chart__polar', options.className),
                translateX: layout.centerX,
                translateY: layout.centerY,
                ariaHidden: true,
                children: nodes,
              },
            ],
            points,
          }
        },
      }
    },
  )
}

export interface RadialArcOptions<TDatum> {
  id?: string
  className?: string
  startAngle?: Channel<TDatum, number | null | undefined>
  endAngle?: Channel<TDatum, number | null | undefined>
  padAngle?: Channel<TDatum, number | null | undefined>
  key?: Channel<TDatum, ChartKey>
  z?: Channel<TDatum, ChartKey | null | undefined>
  color?: Channel<TDatum, ChartKey | null | undefined>
  innerRadius?: PolarLength
  outerRadius?: PolarLength
  cornerRadius?: PolarLength
  padRadius?: PolarLength
  /**
   * Replaces the default D3 arc configuration for per-datum radii, sunbursts,
   * and other advanced arc layouts. Keep its context null so it returns SVG
   * path data.
   */
  generator?: (context: PolarLayoutContext) => Arc<any, TDatum>
  fill?: VisualChannel<TDatum, string>
  fillOpacity?: number
  stroke?: VisualChannel<TDatum, string>
  strokeOpacity?: number
  strokeWidth?: number
  strokeDasharray?: string
  opacity?: number
}

export function radialArc<TDatum>(
  source: Iterable<TDatum>,
  options: RadialArcOptions<NoInfer<TDatum>> = {},
): PolarMark<TDatum, number, number> {
  const data = asArray(source)
  return createPolarMark(({ markIndex, parentId }) => {
    const id = options.id ?? `${parentId}:arc-${markIndex}`
    const startAngles = channelValues(data, options.startAngle, (datum) =>
      numberProperty(datum, 'startAngle'),
    )
    const endAngles = channelValues(data, options.endAngle, (datum) =>
      numberProperty(datum, 'endAngle'),
    )
    const padAngles = channelValues(
      data,
      options.padAngle,
      (datum) => numberProperty(datum, 'padAngle') ?? 0,
    )
    const groups = channelValues(data, options.z, () => null)
    const colorValues =
      options.color === undefined
        ? groups
        : channelValues(data, options.color, () => null)
    const keys = inferredKeyValues(data, options.key, { groups })

    return {
      id,
      colorValues: colorValues.filter(isChartKey),
      angleValues: [],
      radiusValues: [],
      includeZeroRadius: false,
      requiresAngleScale: false,
      requiresRadiusScale: false,
      render: ({ layout, color: resolveColor }) => {
        const innerRadius = resolveLength(options.innerRadius, layout, 0)
        const outerRadius = resolveLength(
          options.outerRadius,
          layout,
          layout.radius,
        )
        const generator =
          options.generator?.(layout) ??
          createArc<any, TDatum>()
            .startAngle((_datum, index: number) => startAngles[index] ?? 0)
            .endAngle((_datum, index: number) => endAngles[index] ?? 0)
            .padAngle((_datum, index: number) => padAngles[index] ?? 0)
            .innerRadius(innerRadius)
            .outerRadius(outerRadius)
            .cornerRadius(resolveLength(options.cornerRadius, layout, 0))
        if (options.padRadius !== undefined && !options.generator) {
          generator.padRadius(resolveLength(options.padRadius, layout, 0))
        }

        const nodes: SceneNode[] = []
        const points: ChartPoint<TDatum, number, number>[] = []
        data.forEach((datum, datumIndex) => {
          const startAngle = startAngles[datumIndex]
          const endAngle = endAngles[datumIndex]
          const padAngle = padAngles[datumIndex]
          if (
            !options.generator &&
            (!isFiniteNumber(startAngle) ||
              !isFiniteNumber(endAngle) ||
              !isFiniteNumber(padAngle))
          ) {
            return
          }
          const path = generator(datum, datumIndex, data)
          if (typeof path !== 'string' || !path) return
          const group = groups[datumIndex] ?? null
          const fallback = resolveColor(colorValues[datumIndex] ?? null)
          const fill = visualValue(
            options.fill,
            datum,
            datumIndex,
            data,
            fallback,
          )
          const stroke =
            options.stroke === undefined
              ? undefined
              : visualValue(options.stroke, datum, datumIndex, data, fallback)
          const key = `${id}:${valueKey(group)}:${valueKey(keys[datumIndex])}`
          const generatedStart = generator.startAngle()(datum, datumIndex, data)
          const generatedEnd = generator.endAngle()(datum, datumIndex, data)
          const generatedInner = generator.innerRadius()(
            datum,
            datumIndex,
            data,
          )
          const generatedOuter = generator.outerRadius()(
            datum,
            datumIndex,
            data,
          )
          const centroid = generator.centroid(datum, datumIndex, data)
          const angleValue = (generatedStart + generatedEnd) / 2
          const radiusValue = (generatedInner + generatedOuter) / 2
          nodes.push({
            kind: 'area',
            key,
            points: [],
            path,
            style: {
              fill,
              fillOpacity: options.fillOpacity,
              stroke,
              strokeOpacity: options.strokeOpacity,
              strokeWidth: options.strokeWidth,
              strokeDasharray: options.strokeDasharray,
              opacity: options.opacity,
              lineJoin: 'round',
            },
          })
          points.push({
            key,
            markId: id,
            group,
            groupLabel: group == null ? id : String(group),
            datum,
            datumIndex,
            xValue: angleValue,
            yValue: radiusValue,
            x: layout.centerX + centroid[0],
            y: layout.centerY + centroid[1],
            color: fill,
          })
        })

        return {
          nodes: [
            {
              kind: 'group',
              key: id,
              className: classes('ts-chart__arc', options.className),
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

interface RadialPathOptions<TDatum> {
  id?: string
  className?: string
  angle?: number | Channel<TDatum, ChartValue | null | undefined>
  radius?: number | Channel<TDatum, number | null | undefined>
  key?: Channel<TDatum, ChartKey>
  z?: Channel<TDatum, ChartKey | null | undefined>
  color?: Channel<TDatum, ChartKey | null | undefined>
}

export interface RadialLineOptions<TDatum> extends RadialPathOptions<TDatum> {
  curve?: CurveFactory | CurveFactoryLineOnly
  stroke?: VisualChannel<TDatum, string>
  strokeOpacity?: number
  strokeWidth?: number
  strokeDasharray?: string
  opacity?: number
  points?: boolean
}

export function radialLine<TDatum>(
  source: Iterable<TDatum>,
): PolarMark<TDatum, number, number>
export function radialLine<
  TDatum,
  const TOptions extends RadialLineOptions<NoInfer<TDatum>> | undefined,
>(
  source: Iterable<TDatum>,
  options: TOptions,
): PolarMark<
  TDatum,
  OptionChannelOutput<TDatum, TOptions, 'angle', number>,
  OptionChannelOutput<TDatum, TOptions, 'radius', number>
>
export function radialLine<TDatum>(
  source: Iterable<TDatum>,
  options: RadialLineOptions<NoInfer<TDatum>> = {},
): PolarMark<TDatum, any, any> {
  const data = asArray(source)
  return createPolarMark(({ markIndex, parentId }) => {
    const id = options.id ?? `${parentId}:radial-line-${markIndex}`
    const angleValues =
      typeof options.angle === 'number'
        ? data.map(() => options.angle as number)
        : channelValues(data, options.angle, (_datum, index) => index)
    const radiusValues =
      typeof options.radius === 'number'
        ? data.map(() => options.radius as number)
        : channelValues(data, options.radius, (datum) =>
            typeof datum === 'number' ? datum : undefined,
          )
    const zValues = channelValues(data, options.z, () => null)
    const colorValues =
      options.color === undefined
        ? zValues
        : channelValues(data, options.color, () => null)
    const groups =
      options.z === undefined && options.color !== undefined
        ? colorValues
        : zValues
    const keys = inferredKeyValues(data, options.key, {
      groups,
      candidates: [angleValues],
      markId: id,
      warningIdentity: options,
    })

    return {
      id,
      colorValues: colorValues.filter(isChartKey),
      angleValues: angleValues.filter(isChartValue),
      radiusValues: radiusValues.filter(isChartValue),
      includeZeroRadius: false,
      requiresAngleScale: true,
      requiresRadiusScale: true,
      render: ({ layout, color: resolveColor }) => {
        const angle = requiredScale(layout.angle)
        const radius = requiredScale(layout.radiusScale)
        const nodes: SceneNode[] = []
        const points: ChartPoint<TDatum>[] = []
        for (const [groupKey, indices] of groupIndices(groups)) {
          const firstIndex = indices[0]
          if (firstIndex === undefined) continue
          const group = groups[firstIndex] ?? null
          const stroke = visualValue(
            options.stroke,
            data[firstIndex],
            firstIndex,
            data,
            resolveColor(colorValues[firstIndex] ?? null),
          )
          const rows = indices.map((datumIndex) => ({
            datumIndex,
            angleValue: angleValues[datumIndex],
            radiusValue: radiusValues[datumIndex],
            angle: mapPolarScale(angle, angleValues[datumIndex]),
            radius: mapPolarScale(radius, radiusValues[datumIndex]),
          }))
          const generator = createLineRadial<(typeof rows)[number]>()
            .defined(
              (row) => isFiniteNumber(row.angle) && isFiniteNumber(row.radius),
            )
            .angle((row) => row.angle)
            .radius((row) => row.radius)
          if (options.curve) generator.curve(options.curve)
          const path = generator(rows)
          if (typeof path === 'string' && path) {
            nodes.push({
              kind: 'polyline',
              key: `${id}:${groupKey}`,
              points: [],
              path,
              style: {
                fill: 'none',
                stroke,
                strokeOpacity: options.strokeOpacity,
                strokeWidth: options.strokeWidth ?? 2.25,
                strokeDasharray: options.strokeDasharray,
                opacity: options.opacity,
                lineCap: 'round',
                lineJoin: 'round',
              },
            })
          }
          for (const row of rows) {
            if (
              !isChartValue(row.angleValue) ||
              !isChartValue(row.radiusValue) ||
              !isFiniteNumber(row.angle) ||
              !isFiniteNumber(row.radius)
            ) {
              continue
            }
            const [x, y] = pointRadial(row.angle, row.radius)
            const key = `${id}:${groupKey}:${valueKey(keys[row.datumIndex])}`
            points.push({
              key,
              markId: id,
              group,
              groupLabel: group == null ? id : String(group),
              datum: data[row.datumIndex],
              datumIndex: row.datumIndex,
              xValue: row.angleValue,
              yValue: row.radiusValue,
              x: layout.centerX + x,
              y: layout.centerY + y,
              color: stroke,
            })
            if (options.points) {
              nodes.push({
                kind: 'dot',
                key: `${key}:dot`,
                x,
                y,
                radius: 2.5,
                style: { fill: stroke },
              })
            }
          }
        }
        return {
          nodes: [
            {
              kind: 'group',
              key: id,
              className: classes(
                'ts-chart__radial-line ts-chart__line',
                options.className,
              ),
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

export interface RadialAreaOptions<TDatum> extends RadialPathOptions<TDatum> {
  radius1?: number | Channel<TDatum, number | null | undefined>
  curve?: CurveFactory
  fill?: VisualChannel<TDatum, string>
  fillOpacity?: number
  stroke?: VisualChannel<TDatum, string>
  strokeOpacity?: number
  strokeWidth?: number
  strokeDasharray?: string
  opacity?: number
}

export function radialArea<TDatum>(
  source: Iterable<TDatum>,
): PolarMark<TDatum, number, number>
export function radialArea<
  TDatum,
  const TOptions extends RadialAreaOptions<NoInfer<TDatum>> | undefined,
>(
  source: Iterable<TDatum>,
  options: TOptions,
): PolarMark<
  TDatum,
  OptionChannelOutput<TDatum, TOptions, 'angle', number>,
  OptionChannelOutput<TDatum, TOptions, 'radius', number>
>
export function radialArea<TDatum>(
  source: Iterable<TDatum>,
  options: RadialAreaOptions<NoInfer<TDatum>> = {},
): PolarMark<TDatum, any, any> {
  const data = asArray(source)
  return createPolarMark(({ markIndex, parentId }) => {
    const id = options.id ?? `${parentId}:radial-area-${markIndex}`
    const angleValues =
      typeof options.angle === 'number'
        ? data.map(() => options.angle as number)
        : channelValues(data, options.angle, (_datum, index) => index)
    const radiusValues =
      typeof options.radius === 'number'
        ? data.map(() => options.radius as number)
        : channelValues(data, options.radius, (datum) =>
            typeof datum === 'number' ? datum : undefined,
          )
    const radius1Values =
      typeof options.radius1 === 'number'
        ? data.map(() => options.radius1 as number)
        : channelValues(data, options.radius1, () => 0)
    const zValues = channelValues(data, options.z, () => null)
    const colorValues =
      options.color === undefined
        ? zValues
        : channelValues(data, options.color, () => null)
    const groups =
      options.z === undefined && options.color !== undefined
        ? colorValues
        : zValues
    const keys = inferredKeyValues(data, options.key, {
      groups,
      candidates: [angleValues],
      markId: id,
      warningIdentity: options,
    })

    return {
      id,
      colorValues: colorValues.filter(isChartKey),
      angleValues: angleValues.filter(isChartValue),
      radiusValues: [
        ...radiusValues.filter(isChartValue),
        ...radius1Values.filter(isChartValue),
      ],
      includeZeroRadius: options.radius1 === undefined,
      requiresAngleScale: true,
      requiresRadiusScale: true,
      render: ({ layout, color: resolveColor }) => {
        const angle = requiredScale(layout.angle)
        const radius = requiredScale(layout.radiusScale)
        const nodes: SceneNode[] = []
        const points: ChartPoint<TDatum>[] = []
        for (const [groupKey, indices] of groupIndices(groups)) {
          const firstIndex = indices[0]
          if (firstIndex === undefined) continue
          const datum = data[firstIndex]
          const group = groups[firstIndex] ?? null
          const fallback = resolveColor(colorValues[firstIndex] ?? null)
          const fill = visualValue(
            options.fill,
            datum,
            firstIndex,
            data,
            fallback,
          )
          const stroke =
            options.stroke === undefined
              ? undefined
              : visualValue(options.stroke, datum, firstIndex, data, fallback)
          const rows = indices.map((datumIndex) => ({
            datumIndex,
            angleValue: angleValues[datumIndex],
            radiusValue: radiusValues[datumIndex],
            angle: mapPolarScale(angle, angleValues[datumIndex]),
            radius: mapPolarScale(radius, radiusValues[datumIndex]),
            radius1: mapPolarScale(radius, radius1Values[datumIndex]),
          }))
          const generator = createAreaRadial<(typeof rows)[number]>()
            .defined(
              (row) =>
                isFiniteNumber(row.angle) &&
                isFiniteNumber(row.radius) &&
                isFiniteNumber(row.radius1),
            )
            .angle((row) => row.angle)
            .innerRadius((row) => row.radius1)
            .outerRadius((row) => row.radius)
          if (options.curve) generator.curve(options.curve)
          const path = generator(rows)
          if (typeof path === 'string' && path) {
            nodes.push({
              kind: 'area',
              key: `${id}:${groupKey}`,
              points: [],
              path,
              style: {
                fill,
                fillOpacity: options.fillOpacity ?? 0.2,
                stroke,
                strokeOpacity: options.strokeOpacity,
                strokeWidth: options.strokeWidth,
                strokeDasharray: options.strokeDasharray,
                opacity: options.opacity,
                lineJoin: 'round',
              },
            })
          }
          for (const row of rows) {
            if (
              !isChartValue(row.angleValue) ||
              !isChartValue(row.radiusValue) ||
              !isFiniteNumber(row.angle) ||
              !isFiniteNumber(row.radius)
            ) {
              continue
            }
            const [x, y] = pointRadial(row.angle, row.radius)
            const key = `${id}:${groupKey}:${valueKey(keys[row.datumIndex])}`
            points.push({
              key,
              markId: id,
              group,
              groupLabel: group == null ? id : String(group),
              datum: data[row.datumIndex],
              datumIndex: row.datumIndex,
              xValue: row.angleValue,
              yValue: row.radiusValue,
              x: layout.centerX + x,
              y: layout.centerY + y,
              color: fill,
            })
          }
        }
        return {
          nodes: [
            {
              kind: 'group',
              key: id,
              className: classes('ts-chart__radial-area', options.className),
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

export interface RadialDotOptions<TDatum> extends RadialPathOptions<TDatum> {
  r?: number | Channel<TDatum, number | null | undefined>
  rScale?: ChartNumericScale
  fill?: VisualChannel<TDatum, string>
  fillOpacity?: number
  stroke?: string
  strokeOpacity?: number
  strokeWidth?: number
  opacity?: number
}

export interface RadialTextOptions<TDatum> extends RadialPathOptions<TDatum> {
  text?: Channel<TDatum, string | number | null | undefined>
  fill?: VisualChannel<TDatum, string>
  fontSize?: number
  fontWeight?: number
  anchor?: VisualChannel<TDatum, 'start' | 'middle' | 'end'>
  baseline?: VisualChannel<TDatum, 'auto' | 'middle' | 'hanging'>
  rotate?: VisualChannel<TDatum, number>
  dx?: VisualChannel<TDatum, number>
  dy?: VisualChannel<TDatum, number>
}

export function radialText<TDatum>(
  source: Iterable<TDatum>,
): PolarMark<TDatum, number, number>
export function radialText<
  TDatum,
  const TOptions extends RadialTextOptions<NoInfer<TDatum>> | undefined,
>(
  source: Iterable<TDatum>,
  options: TOptions,
): PolarMark<
  TDatum,
  OptionChannelOutput<TDatum, TOptions, 'angle', number>,
  OptionChannelOutput<TDatum, TOptions, 'radius', number>
>
export function radialText<TDatum>(
  source: Iterable<TDatum>,
  options: RadialTextOptions<NoInfer<TDatum>> = {},
): PolarMark<TDatum, any, any> {
  const data = asArray(source)
  return createPolarMark(({ markIndex, parentId }) => {
    const id = options.id ?? `${parentId}:radial-text-${markIndex}`
    const angleValues =
      typeof options.angle === 'number'
        ? data.map(() => options.angle as number)
        : channelValues(data, options.angle, (_datum, index) => index)
    const radiusValues =
      typeof options.radius === 'number'
        ? data.map(() => options.radius as number)
        : channelValues(data, options.radius, (datum) =>
            typeof datum === 'number' ? datum : undefined,
          )
    const textValues = channelValues(data, options.text, (datum) =>
      datum == null ? '' : String(datum),
    )
    const groups = channelValues(data, options.z, () => null)
    const colorValues =
      options.color === undefined
        ? groups
        : channelValues(data, options.color, () => null)
    const keys = inferredKeyValues(data, options.key, { groups })

    return {
      id,
      colorValues: colorValues.filter(isChartKey),
      angleValues: angleValues.filter(isChartValue),
      radiusValues: radiusValues.filter(isChartValue),
      includeZeroRadius: false,
      requiresAngleScale: true,
      requiresRadiusScale: true,
      render: ({ layout, color: resolveColor, theme }) => {
        const angle = requiredScale(layout.angle)
        const radius = requiredScale(layout.radiusScale)
        const nodes: SceneNode[] = []
        const points: ChartPoint<TDatum>[] = []
        data.forEach((datum, datumIndex) => {
          const angleValue = angleValues[datumIndex]
          const radiusValue = radiusValues[datumIndex]
          const textValue = textValues[datumIndex]
          const anglePosition = mapPolarScale(angle, angleValue)
          const radiusPosition = mapPolarScale(radius, radiusValue)
          if (
            !isChartValue(angleValue) ||
            !isChartValue(radiusValue) ||
            textValue == null ||
            !isFiniteNumber(anglePosition) ||
            !isFiniteNumber(radiusPosition)
          ) {
            return
          }
          const [baseX, baseY] = pointRadial(anglePosition, radiusPosition)
          const x = baseX + visualValue(options.dx, datum, datumIndex, data, 0)
          const y = baseY + visualValue(options.dy, datum, datumIndex, data, 0)
          const group = groups[datumIndex] ?? null
          const colorValue = colorValues[datumIndex] ?? null
          const fill = visualValue(
            options.fill,
            datum,
            datumIndex,
            data,
            colorValue == null ? theme.foreground : resolveColor(colorValue),
          )
          const key = `${id}:${valueKey(group)}:${valueKey(keys[datumIndex])}`
          nodes.push({
            kind: 'label',
            key,
            x,
            y,
            text: String(textValue),
            anchor: visualValue(
              options.anchor,
              datum,
              datumIndex,
              data,
              'middle',
            ),
            baseline: visualValue(
              options.baseline,
              datum,
              datumIndex,
              data,
              'middle',
            ),
            rotate:
              options.rotate === undefined
                ? undefined
                : visualValue(options.rotate, datum, datumIndex, data, 0),
            fontSize: options.fontSize,
            fontWeight: options.fontWeight,
            style: { fill },
          })
          points.push({
            key,
            markId: id,
            group,
            groupLabel: group == null ? id : String(group),
            datum,
            datumIndex,
            xValue: angleValue,
            yValue: radiusValue,
            x: layout.centerX + x,
            y: layout.centerY + y,
            color: fill,
          })
        })
        return {
          nodes: [
            {
              kind: 'group',
              key: id,
              className: classes(
                'ts-chart__radial-text ts-chart__text',
                options.className,
              ),
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

export interface RadialRuleOptions<TDatum> {
  id?: string
  className?: string
  angle?: number | Channel<TDatum, ChartValue | null | undefined>
  radius1?: number | Channel<TDatum, number | null | undefined>
  radius2?: number | Channel<TDatum, number | null | undefined>
  key?: Channel<TDatum, ChartKey>
  z?: Channel<TDatum, ChartKey | null | undefined>
  color?: Channel<TDatum, ChartKey | null | undefined>
  stroke?: VisualChannel<TDatum, string>
  strokeOpacity?: number
  strokeWidth?: number
  strokeDasharray?: string
  opacity?: number
}

export function radialRule<TDatum>(
  source: Iterable<TDatum>,
): PolarMark<never, number, number>
export function radialRule<
  TDatum,
  const TOptions extends RadialRuleOptions<NoInfer<TDatum>> | undefined,
>(
  source: Iterable<TDatum>,
  options: TOptions,
): PolarMark<
  never,
  OptionChannelOutput<TDatum, TOptions, 'angle', number>,
  number
>
export function radialRule<TDatum>(
  source: Iterable<TDatum>,
  options: RadialRuleOptions<NoInfer<TDatum>> = {},
): PolarMark<never, any, number> {
  const data = asArray(source)
  return createPolarMark<never, any, number>(({ markIndex, parentId }) => {
    const id = options.id ?? `${parentId}:radial-rule-${markIndex}`
    const angleValues =
      typeof options.angle === 'number'
        ? data.map(() => options.angle as number)
        : channelValues(data, options.angle, (_datum, index) => index)
    const radius1Values =
      typeof options.radius1 === 'number'
        ? data.map(() => options.radius1 as number)
        : channelValues(data, options.radius1, () => 0)
    const radius2Values =
      typeof options.radius2 === 'number'
        ? data.map(() => options.radius2 as number)
        : channelValues(data, options.radius2, (datum) =>
            typeof datum === 'number'
              ? datum
              : numberProperty(datum, 'radius2'),
          )
    const groups = channelValues(data, options.z, () => null)
    const colorValues =
      options.color === undefined
        ? groups
        : channelValues(data, options.color, () => null)
    const keys = inferredKeyValues(data, options.key, {
      groups,
      candidates: [angleValues],
      markId: id,
      warningIdentity: options,
    })

    return {
      id,
      colorValues: colorValues.filter(isChartKey),
      angleValues: angleValues.filter(isChartValue),
      radiusValues: [
        ...radius1Values.filter(isChartValue),
        ...radius2Values.filter(isChartValue),
      ],
      includeZeroRadius: options.radius1 === undefined,
      requiresAngleScale: true,
      requiresRadiusScale: true,
      render: ({ layout, color: resolveColor, theme }) => {
        const angle = requiredScale(layout.angle)
        const radius = requiredScale(layout.radiusScale)
        const nodes: SceneNode[] = []
        data.forEach((datum, datumIndex) => {
          const anglePosition = mapPolarScale(angle, angleValues[datumIndex])
          const radius1Position = mapPolarScale(
            radius,
            radius1Values[datumIndex],
          )
          const radius2Position = mapPolarScale(
            radius,
            radius2Values[datumIndex],
          )
          if (
            !isFiniteNumber(anglePosition) ||
            !isFiniteNumber(radius1Position) ||
            !isFiniteNumber(radius2Position)
          ) {
            return
          }
          const [x1, y1] = pointRadial(anglePosition, radius1Position)
          const [x2, y2] = pointRadial(anglePosition, radius2Position)
          const group = groups[datumIndex] ?? null
          const colorValue = colorValues[datumIndex] ?? null
          const stroke = visualValue(
            options.stroke,
            datum,
            datumIndex,
            data,
            colorValue == null ? theme.foreground : resolveColor(colorValue),
          )
          nodes.push({
            kind: 'rule',
            key: `${id}:${valueKey(group)}:${valueKey(keys[datumIndex])}`,
            x1,
            y1,
            x2,
            y2,
            style: {
              stroke,
              strokeOpacity: options.strokeOpacity,
              strokeWidth: options.strokeWidth ?? 1.5,
              strokeDasharray: options.strokeDasharray,
              opacity: options.opacity,
              lineCap: 'round',
            },
          })
        })
        return {
          nodes: [
            {
              kind: 'group',
              key: id,
              className: classes(
                'ts-chart__radial-rule ts-chart__rule',
                options.className,
              ),
              ariaHidden: true,
              children: nodes,
            },
          ],
        }
      },
    }
  })
}

export function radialDot<TDatum>(
  source: Iterable<TDatum>,
): PolarMark<TDatum, number, number>
export function radialDot<
  TDatum,
  const TOptions extends RadialDotOptions<NoInfer<TDatum>> | undefined,
>(
  source: Iterable<TDatum>,
  options: TOptions,
): PolarMark<
  TDatum,
  OptionChannelOutput<TDatum, TOptions, 'angle', number>,
  OptionChannelOutput<TDatum, TOptions, 'radius', number>
>
export function radialDot<TDatum>(
  source: Iterable<TDatum>,
  options: RadialDotOptions<NoInfer<TDatum>> = {},
): PolarMark<TDatum, any, any> {
  const data = asArray(source)
  return createPolarMark(({ markIndex, parentId }) => {
    const id = options.id ?? `${parentId}:radial-dot-${markIndex}`
    const angleValues =
      typeof options.angle === 'number'
        ? data.map(() => options.angle as number)
        : channelValues(data, options.angle, (_datum, index) => index)
    const radiusValues =
      typeof options.radius === 'number'
        ? data.map(() => options.radius as number)
        : channelValues(data, options.radius, (datum) =>
            typeof datum === 'number' ? datum : undefined,
          )
    const groups = channelValues(data, options.z, () => null)
    const colorValues =
      options.color === undefined
        ? groups
        : channelValues(data, options.color, () => null)
    const keys = inferredKeyValues(data, options.key, { groups })
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

    return {
      id,
      colorValues: colorValues.filter(isChartKey),
      angleValues: angleValues.filter(isChartValue),
      radiusValues: radiusValues.filter(isChartValue),
      includeZeroRadius: false,
      requiresAngleScale: true,
      requiresRadiusScale: true,
      render: ({ layout, color: resolveColor }) => {
        const angle = requiredScale(layout.angle)
        const radius = requiredScale(layout.radiusScale)
        const nodes: SceneNode[] = []
        const points: ChartPoint<TDatum>[] = []
        data.forEach((datum, datumIndex) => {
          const angleValue = angleValues[datumIndex]
          const radiusValue = radiusValues[datumIndex]
          const anglePosition = mapPolarScale(angle, angleValue)
          const radiusPosition = mapPolarScale(radius, radiusValue)
          const dotRadius = radii[datumIndex]
          if (
            !isChartValue(angleValue) ||
            !isChartValue(radiusValue) ||
            !isFiniteNumber(anglePosition) ||
            !isFiniteNumber(radiusPosition) ||
            !isNonnegativeFiniteNumber(dotRadius)
          ) {
            return
          }
          const [x, y] = pointRadial(anglePosition, radiusPosition)
          const group = groups[datumIndex] ?? null
          const fill = visualValue(
            options.fill,
            datum,
            datumIndex,
            data,
            resolveColor(colorValues[datumIndex] ?? null),
          )
          const key = `${id}:${valueKey(group)}:${valueKey(keys[datumIndex])}`
          nodes.push({
            kind: 'dot',
            key,
            x,
            y,
            radius: dotRadius,
            style: {
              fill,
              fillOpacity: options.fillOpacity,
              stroke: options.stroke,
              strokeOpacity: options.strokeOpacity,
              strokeWidth: options.strokeWidth,
              opacity: options.opacity,
            },
          })
          points.push({
            key,
            markId: id,
            group,
            groupLabel: group == null ? id : String(group),
            datum,
            datumIndex,
            xValue: angleValue,
            yValue: radiusValue,
            x: layout.centerX + x,
            y: layout.centerY + y,
            color: fill,
          })
        })
        return {
          nodes: [
            {
              kind: 'group',
              key: id,
              className: classes(
                'ts-chart__radial-dot ts-chart__dot',
                options.className,
              ),
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

export interface PolarGuideLabelContext {
  value: ChartValue
  index: number
  angle: number
  radius: number
  x: number
  y: number
  layout: PolarLayoutContext
}

export type PolarGuideLabelOption<TValue> =
  TValue | ((context: PolarGuideLabelContext) => TValue)

interface PolarGuideStyle {
  id?: string
  className?: string
  labelClassName?: string
  stroke?: string
  strokeOpacity?: number
  strokeWidth?: number
  strokeDasharray?: string
  labels?: boolean
  labelFill?: string
  labelFontSize?: number
  labelAnchor?: PolarGuideLabelOption<'start' | 'middle' | 'end'>
  labelBaseline?: PolarGuideLabelOption<'auto' | 'middle' | 'hanging'>
  labelDx?: PolarGuideLabelOption<number>
  labelDy?: PolarGuideLabelOption<number>
  labelRotate?: PolarGuideLabelOption<number>
}

export interface RadialGridOptions extends PolarGuideStyle {
  values?: readonly ChartValue[]
  ticks?: number
  shape?: 'circle' | 'polygon'
  format?: (value: ChartValue) => string
  labelAngle?: number
  labelOffset?: number
}

export function radialGrid(options: RadialGridOptions = {}): PolarGuide {
  return {
    render: ({ layout, theme, guideIndex, parentId }) => {
      const radial = requiredScale(layout.radiusScale)
      const values = options.values ?? radial.ticks(options.ticks ?? 5)
      const stroke = options.stroke ?? theme.grid
      const rings: SceneNode[] = []
      const labels: SceneNode[] = []
      for (const [index, value] of values.entries()) {
        const radius = radial.map(value)
        if (!isFiniteNumber(radius)) continue
        let path: string | null | void
        if (options.shape === 'polygon') {
          if (!layout.angle) {
            throw new TypeError(
              'Polygon radial grid requires a configured angle scale',
            )
          }
          path = polygonRingPath(layout.angle, radius)
        } else {
          path = createArc<null>()
            .innerRadius(0)
            .outerRadius(radius)
            .startAngle(0)
            .endAngle(tau)(null)
        }
        if (typeof path === 'string' && path) {
          rings.push({
            kind: 'polyline',
            key: `ring:${valueKey(value)}`,
            points: [],
            path,
            style: {
              fill: 'none',
              stroke,
              strokeOpacity: options.strokeOpacity,
              strokeWidth: options.strokeWidth ?? 1,
              strokeDasharray: options.strokeDasharray,
            },
          })
        }
        if (options.labels) {
          const angle = options.labelAngle ?? layout.startAngle
          const [x, y] = pointRadial(angle, radius + (options.labelOffset ?? 0))
          const labelContext: PolarGuideLabelContext = {
            value,
            index,
            angle,
            radius,
            x,
            y,
            layout,
          }
          labels.push({
            kind: 'label',
            key: `radius-label:${valueKey(value)}`,
            x: x + guideLabelOption(options.labelDx, labelContext, 0),
            y: y + guideLabelOption(options.labelDy, labelContext, 0),
            text: options.format?.(value) ?? String(value),
            anchor: guideLabelOption(
              options.labelAnchor,
              labelContext,
              'start',
            ),
            baseline: guideLabelOption(
              options.labelBaseline,
              labelContext,
              'middle',
            ),
            rotate: guideLabelOption(options.labelRotate, labelContext, 0),
            fontSize: options.labelFontSize ?? 12,
            style: { fill: options.labelFill ?? theme.muted },
          })
        }
      }
      const id = options.id ?? `${parentId}:radial-grid-${guideIndex}`
      return {
        background: [
          {
            kind: 'group',
            key: id,
            className: classes('ts-chart__radial-grid', options.className),
            ariaHidden: true,
            children: rings,
          },
        ],
        foreground: labels.length
          ? [
              {
                kind: 'group',
                key: `${id}:labels`,
                className: classes('ts-chart__text', options.labelClassName),
                ariaHidden: true,
                children: labels,
              },
            ]
          : undefined,
      }
    },
  }
}

export interface AngleGridOptions extends PolarGuideStyle {
  values?: readonly ChartValue[]
  format?: (value: ChartValue) => string
  labelOffset?: number
}

export function angleGrid(options: AngleGridOptions = {}): PolarGuide {
  return {
    render: ({ layout, theme, guideIndex, parentId }) => {
      const angle = requiredScale(layout.angle)
      const values = options.values ?? angle.domain
      const spokes: SceneNode[] = []
      const labels: SceneNode[] = []
      for (const [index, value] of values.entries()) {
        const position = angle.map(value)
        if (!isFiniteNumber(position)) continue
        const [x2, y2] = pointRadial(position, layout.radius)
        spokes.push({
          kind: 'rule',
          key: `spoke:${valueKey(value)}`,
          x1: 0,
          y1: 0,
          x2,
          y2,
          style: {
            stroke: options.stroke ?? theme.grid,
            strokeOpacity: options.strokeOpacity,
            strokeWidth: options.strokeWidth ?? 1,
            strokeDasharray: options.strokeDasharray,
          },
        })
        if (options.labels !== false) {
          const [x, y] = pointRadial(
            position,
            layout.radius + (options.labelOffset ?? 8),
          )
          const labelContext: PolarGuideLabelContext = {
            value,
            index,
            angle: position,
            radius: layout.radius,
            x,
            y,
            layout,
          }
          labels.push({
            kind: 'label',
            key: `angle-label:${valueKey(value)}`,
            x: x + guideLabelOption(options.labelDx, labelContext, 0),
            y: y + guideLabelOption(options.labelDy, labelContext, 0),
            text: options.format?.(value) ?? String(value),
            anchor: guideLabelOption(
              options.labelAnchor,
              labelContext,
              Math.abs(x) < 1 ? 'middle' : x < 0 ? 'end' : 'start',
            ),
            baseline: guideLabelOption(
              options.labelBaseline,
              labelContext,
              Math.abs(y) < 1 ? 'middle' : y < 0 ? 'auto' : 'hanging',
            ),
            rotate: guideLabelOption(options.labelRotate, labelContext, 0),
            fontSize: options.labelFontSize ?? 12,
            style: { fill: options.labelFill ?? theme.muted },
          })
        }
      }
      const id = options.id ?? `${parentId}:angle-grid-${guideIndex}`
      return {
        background: [
          {
            kind: 'group',
            key: id,
            className: classes('ts-chart__angle-grid', options.className),
            ariaHidden: true,
            children: spokes,
          },
        ],
        foreground: labels.length
          ? [
              {
                kind: 'group',
                key: `${id}:labels`,
                className: classes('ts-chart__text', options.labelClassName),
                ariaHidden: true,
                children: labels,
              },
            ]
          : undefined,
      }
    },
  }
}

function resolvePolarLayout(
  options: PolarOptions,
  chart: ChartBounds,
  marks: readonly InitializedPolarMark[],
): PolarLayoutContext {
  const startAngle = finite(options.startAngle, 0)
  const endAngle = finite(options.endAngle, tau)
  const inset = Math.max(0, finite(options.inset, 0))
  const radiusRatio = Math.max(0, finite(options.radiusRatio, 1))
  const radius =
    Math.max(0, Math.min(chart.width, chart.height) / 2 - inset) * radiusRatio
  const layout: PolarLayoutContext = {
    chart,
    centerX: chart.x + chart.width / 2,
    centerY: chart.y + chart.height / 2,
    radius,
    startAngle,
    endAngle,
  }
  if (options.angle) {
    const wrapPointScale =
      options.angle.wrap ?? isCompleteRevolution(startAngle, endAngle)
    layout.angle = resolvePolarScale(
      options.angle.scale,
      collectPolarValues(marks, 'angleValues'),
      startAngle,
      endAngle,
      wrapPointScale,
      false,
      options.angle.nice,
    )
  }
  if (options.radius) {
    layout.radiusScale = resolvePolarScale(
      options.radius.scale,
      collectPolarValues(marks, 'radiusValues'),
      0,
      radius,
      false,
      marks.some((mark) => mark.includeZeroRadius),
      options.radius.nice,
    )
  }
  return layout
}

function resolvePolarScale(
  source: ChartScaleInput<any>,
  values: readonly unknown[],
  rangeStart: number,
  rangeEnd: number,
  wrapPointScale: boolean,
  includeZero: boolean,
  nice: boolean | number | undefined,
): PolarResolvedScale {
  const scale = resolveScaleInput(source, {
    values,
    includeZero,
    nice,
    niceCount: 5,
  })
  const domain = scale.domain().filter(isChartValue)
  const pointScale =
    wrapPointScale &&
    typeof scale.bandwidth === 'function' &&
    scale.bandwidth() === 0
  const resolvedEnd = pointScale
    ? domain.length > 1
      ? rangeStart +
        ((rangeEnd - rangeStart) * (domain.length - 1)) / domain.length
      : rangeStart
    : rangeEnd
  scale.range([rangeStart, resolvedEnd])
  const bandwidth = scale.bandwidth?.() ?? 0
  const map = (value: ChartValue) => {
    const position = scale(value)
    return typeof position === 'number' && Number.isFinite(position)
      ? position + bandwidth / 2
      : Number.NaN
  }
  return {
    domain,
    map,
    ticks: (count) => (scale.ticks?.(count) ?? domain).filter(isChartValue),
    bandwidth,
  }
}

function collectPolarValues(
  marks: readonly InitializedPolarMark[],
  key: 'angleValues' | 'radiusValues',
): unknown[] {
  const values: unknown[] = []
  for (const mark of marks) {
    for (const value of mark[key]) values.push(value)
  }
  return values
}

function polygonRingPath(angle: PolarResolvedScale, radius: number): string {
  const rows = angle.domain.map((value) => ({
    angle: angle.map(value),
    radius,
  }))
  return (
    createLineRadial<(typeof rows)[number]>()
      .angle((row) => row.angle)
      .radius((row) => row.radius)
      .curve(curveLinearClosed)(rows) ?? ''
  )
}

function createPolarMark<
  TDatum,
  TAngle extends ChartValue,
  TRadius extends ChartValue,
>(
  initialize: (
    context: PolarMarkInitializeContext,
  ) => InitializedPolarMark<TDatum, TAngle, TRadius>,
): PolarMark<TDatum, TAngle, TRadius> {
  return { initialize }
}

function groupIndices(
  groups: readonly (ChartKey | null | undefined)[],
): Map<string, number[]> {
  const result = new Map<string, number[]>()
  groups.forEach((group, index) => {
    const key = valueKey(group ?? null)
    const indices = result.get(key)
    if (indices) indices.push(index)
    else result.set(key, [index])
  })
  return result
}

function requiredScale(
  scale: PolarResolvedScale | undefined,
): PolarResolvedScale {
  if (!scale) throw new TypeError('Missing configured polar scale')
  return scale
}

function mapPolarScale(scale: PolarResolvedScale, value: unknown): number {
  return isChartValue(value) ? scale.map(value) : Number.NaN
}

function resolveLength(
  value: PolarLength | undefined,
  context: PolarLayoutContext,
  fallback: number,
): number {
  const resolved =
    typeof value === 'function' ? value(context) : (value ?? fallback)
  return isNonnegativeFiniteNumber(resolved) ? resolved : fallback
}

function numberProperty(value: unknown, key: string): number | undefined {
  if (!value || typeof value !== 'object') return undefined
  const property = (value as Record<string, unknown>)[key]
  return isFiniteNumber(property) ? property : undefined
}

function asArray<TDatum>(source: Iterable<TDatum>): readonly TDatum[] {
  return Array.isArray(source) ? source : Array.from(source)
}

function finite(value: number | undefined, fallback: number): number {
  return isFiniteNumber(value) ? value : fallback
}

function isCompleteRevolution(startAngle: number, endAngle: number): boolean {
  return Math.abs(Math.abs(endAngle - startAngle) - tau) <= 1e-12
}

function guideLabelOption<TValue>(
  option: PolarGuideLabelOption<TValue> | undefined,
  context: PolarGuideLabelContext,
  fallback: TValue,
): TValue {
  return typeof option === 'function'
    ? (option as (context: PolarGuideLabelContext) => TValue)(context)
    : (option ?? fallback)
}

function classes(base: string, custom: string | undefined): string {
  return custom ? `${base} ${custom}` : base
}
