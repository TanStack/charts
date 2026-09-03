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
import { resolveCompositeChildMotion } from './composite-motion-internal'
import { createMarkWithScaleValues } from './mark-with-scale-values'
import { createPolarMark as createInternalPolarMark } from './polar-mark-internal'
import { focusGroupAngle, withPolarFocusGeometry } from './polar-focus-internal'
import {
  resolvePolarSector,
  tracePolarArcBoundary,
} from './polar-sector-internal'
import { resolveNumericScale, resolveScaleInput } from './scale-input'
import { valueKey } from './scales'
import { physicalTextAnchor } from './guide-layout'
import type { Arc, CurveFactory, CurveFactoryLineOnly } from 'd3-shape'
import type {
  Channel,
  ChannelAccessor,
  ChannelOutput,
  ChartAxisValue,
  ChartBounds,
  ChartKey,
  ChartMark,
  ChartMarkRenderer,
  ChartMarkMotionOptions,
  ChartMotionContext,
  ChartMotionDefinition,
  ChartNumericScale,
  ChartPoint,
  MarkScene,
  ChartTheme,
  ChartValue,
  ChartScaleInput,
  SceneNode,
  VisualChannel,
} from './types'
import type {
  InitializedPolarMark as InternalInitializedPolarMark,
  PolarLayoutContext as InternalPolarLayoutContext,
  PolarMarkInitializeContext,
  PolarMarkRenderContext,
  PolarResolvedScale as InternalPolarResolvedScale,
} from './polar-mark-internal'

export { pie } from './polar-pie'
export { focusGroupAngle }
export type { PieDatum, PieOptions } from './polar-pie'

const tau = Math.PI * 2

export type PolarPositionChannel = 'angle' | 'radius'

export interface PolarResolvedScale<
  TValue extends ChartValue = ChartValue,
> extends InternalPolarResolvedScale<TValue> {
  id: string
  channel: PolarPositionChannel
}

export interface PolarLayoutContext extends InternalPolarLayoutContext {
  scales: Readonly<Record<string, PolarResolvedScale>>
}

interface InitializedPolarMark<
  TDatum = unknown,
  TAngle extends ChartValue = ChartValue,
  TRadius extends ChartValue = ChartValue,
> extends Omit<
  InternalInitializedPolarMark<TDatum, TAngle, TRadius>,
  'render'
> {
  angleScale?: string
  radiusScale?: string
  render: (
    context: Omit<PolarMarkRenderContext, 'layout'> & {
      layout: PolarLayoutContext
    },
  ) => MarkScene<TDatum, TAngle, TRadius>
}

export interface PolarMark<
  TDatum = unknown,
  TAngle extends ChartValue = ChartValue,
  TRadius extends ChartValue = ChartValue,
  TAngleScaleId extends string = 'angle',
  TRadiusScaleId extends string = 'radius',
> {
  initialize: (
    context: PolarMarkInitializeContext,
  ) => InitializedPolarMark<TDatum, TAngle, TRadius>
  motion?: ChartMotionDefinition<any>
  renderer?: ChartMarkRenderer
  readonly __datum?: TDatum
  readonly __angle?: TAngle
  readonly __radius?: TRadius
  readonly __angleScaleId?: TAngleScaleId
  readonly __radiusScaleId?: TRadiusScaleId
}

export type PolarLength = number | ((context: PolarLayoutContext) => number)

export interface PolarAngleOptions<TValue extends ChartValue = any> {
  scale: ChartScaleInput<TValue>
  channel?: 'angle'
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
  channel?: 'radius'
  nice?: boolean | number
  /** Responsive pixel range for the copied radius scale. Defaults to [0, radius]. */
  range?: readonly [PolarLength, PolarLength]
}

export type PolarPositionScaleOptions<TValue extends ChartValue = any> =
  PolarAngleOptions<TValue> | PolarRadiusOptions<TValue>

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

type AnyPolarMark = PolarMark<unknown, any, any, any, any>

type PolarMarkDatum<TMark> =
  TMark extends PolarMark<infer TDatum, any, any, any, any> ? TDatum : never

type PolarMarkAngle<TMark> =
  TMark extends PolarMark<any, infer TAngle, any, any, any> ? TAngle : never

type PolarMarkRadius<TMark> =
  TMark extends PolarMark<any, any, infer TRadius, any, any> ? TRadius : never

type PolarMarkScaleAngle<TMark> =
  TMark extends PolarMark<any, infer TAngle, any, infer TScaleId, any>
    ? 'angle' extends TScaleId
      ? TAngle
      : never
    : never

type PolarMarkScaleRadius<TMark> =
  TMark extends PolarMark<any, any, infer TRadius, any, infer TScaleId>
    ? 'radius' extends TScaleId
      ? TRadius
      : never
    : never

type PolarIsAny<TValue> = 0 extends 1 & TValue ? true : false

type PolarAngleScaleSpec<TMarks extends readonly AnyPolarMark[]> =
  PolarIsAny<PolarMarkScaleAngle<TMarks[number]>> extends true
    ? {
        angle: PolarAngleOptions<
          ChartAxisValue<PolarMarkScaleAngle<TMarks[number]>>
        > | null
      }
    : [PolarMarkScaleAngle<TMarks[number]>] extends [never]
      ? { angle: null }
      : {
          angle: PolarAngleOptions<
            ChartAxisValue<PolarMarkScaleAngle<TMarks[number]>>
          >
        }

type PolarRadiusScaleSpec<TMarks extends readonly AnyPolarMark[]> =
  PolarIsAny<PolarMarkScaleRadius<TMarks[number]>> extends true
    ? {
        radius: PolarRadiusOptions<
          ChartAxisValue<PolarMarkScaleRadius<TMarks[number]>>
        > | null
      }
    : [PolarMarkScaleRadius<TMarks[number]>] extends [never]
      ? { radius: null }
      : {
          radius: PolarRadiusOptions<
            ChartAxisValue<PolarMarkScaleRadius<TMarks[number]>>
          >
        }

export type PolarScales<
  TMarks extends readonly AnyPolarMark[] = readonly AnyPolarMark[],
> = Readonly<Record<string, PolarPositionScaleOptions | null>> &
  PolarAngleScaleSpec<TMarks> &
  PolarRadiusScaleSpec<TMarks>

export interface PolarOptions<
  TMarks extends readonly AnyPolarMark[] = readonly AnyPolarMark[],
> extends ChartMarkMotionOptions<PolarMarkDatum<TMarks[number]>> {
  id?: string
  className?: string
  marks: TMarks
  guides?: readonly PolarGuide[]
  scales: PolarScales<TMarks>
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
      const marks = options.marks.map((mark, polarMarkIndex) => {
        const initialized = mark.initialize({
          markIndex: polarMarkIndex,
          parentId: id,
        })
        return {
          ...initialized,
          angleScale:
            initialized.angleScale ??
            (initialized.requiresAngleScale ? 'angle' : undefined),
          radiusScale:
            initialized.radiusScale ??
            (initialized.requiresRadiusScale ? 'radius' : undefined),
        }
      })
      const childMotions = new Map(
        marks.flatMap((mark, markIndex) => {
          const childMotion = mark.motion ?? options.marks[markIndex]?.motion
          return childMotion === undefined ? [] : [[mark.id, childMotion]]
        }),
      )
      const motion =
        options.motion !== undefined || childMotions.size > 0
          ? (context: ChartMotionContext) =>
              resolveCompositeChildMotion(options.motion, childMotions, context)
          : undefined

      return {
        id,
        ...(motion === undefined ? {} : { motion }),
        channels: {
          color: {
            scale: 'color',
            values: marks.flatMap((mark) => mark.colorValues),
          },
        },
        render: ({ chart, color, theme, layout: chartLayout }) => {
          const layout = resolvePolarLayout(
            options,
            chart,
            marks,
            chartLayout.typography?.direction,
          )
          for (const mark of marks) {
            if (mark.angleScale) {
              requiredPolarScale(
                layout,
                mark.angleScale,
                'angle',
                `Polar mark "${mark.id}"`,
              )
            }
            if (mark.radiusScale) {
              requiredPolarScale(
                layout,
                mark.radiusScale,
                'radius',
                `Polar mark "${mark.id}"`,
              )
            }
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
    options.motion,
    options.renderer,
  )
}

export interface RadialArcOptions<
  TDatum,
> extends ChartMarkMotionOptions<TDatum> {
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
): PolarMark<TDatum, number, number, never, never> {
  const data = asArray(source)
  return createPolarMark<TDatum, number, number, never, never>(
    ({ markIndex, parentId }) => {
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
            const generatedStart = generator.startAngle()(
              datum,
              datumIndex,
              data,
            )
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
            const point = withPolarFocusGeometry(
              {
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
              },
              layout,
              angleValue,
              radiusValue,
              centroid[0],
              centroid[1],
            )
            nodes.push({
              kind: 'area',
              key,
              points: tracePolarArcBoundary(generator, datum, datumIndex, data),
              path,
              interaction: { point, affinity: 'geometry' },
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
            points.push(point)
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
    },
    options.motion,
    options.renderer,
  )
}

interface RadialBarBaseOptions<TDatum> extends ChartMarkMotionOptions<TDatum> {
  id?: string
  className?: string
  /** Named angle scale. Omit to use the reserved `angle` scale. */
  angleScale?: string
  /** Named radius scale. Omit to use the reserved `radius` scale. */
  radiusScale?: string
  key?: Channel<TDatum, ChartKey>
  z?: Channel<TDatum, ChartKey | null | undefined>
  color?: Channel<TDatum, ChartKey | null | undefined>
  cornerRadius?: PolarLength | 'full'
  fill?: VisualChannel<TDatum, string>
  fillOpacity?: number
  stroke?: VisualChannel<TDatum, string>
  strokeOpacity?: number
  strokeWidth?: number
  strokeDasharray?: string
  opacity?: number
}

type InferredPolarChannelOutput<TDatum, TChannel> = [TChannel] extends [never]
  ? number
  : ChannelOutput<TDatum, TChannel, number>

type InferredPolarScaleId<TScaleId, TFallback extends string> = [
  NonNullable<TScaleId>,
] extends [never]
  ? TFallback
  : Extract<NonNullable<TScaleId>, string>

export interface RadialBarRadiusOptions<
  TDatum,
> extends RadialBarBaseOptions<TDatum> {
  angle?: Channel<TDatum, ChartValue | null | undefined>
  radius?: Channel<TDatum, number | null | undefined>
  radius1?: number | Channel<TDatum, number | null | undefined>
  radius2?: number | Channel<TDatum, number | null | undefined>
}

type RadialBarRadiusCallOptions<
  TDatum,
  TAngle extends RadialBarRadiusOptions<TDatum>['angle'],
  TAngleScaleId extends string | undefined,
  TRadiusScaleId extends string | undefined,
> = Omit<
  RadialBarRadiusOptions<TDatum>,
  'angle' | 'angleScale' | 'radiusScale'
> & {
  angle?: TAngle | NoInfer<RadialBarRadiusOptions<TDatum>['angle']>
  angleScale?: TAngleScaleId | NoInfer<string>
  radiusScale?: TRadiusScaleId | NoInfer<string>
}

export function radialBarRadius<TDatum>(
  source: Iterable<TDatum>,
): PolarMark<TDatum, number, number>
export function radialBarRadius<
  TDatum,
  const TAngle extends RadialBarRadiusOptions<NoInfer<TDatum>>['angle'] = never,
  const TAngleScaleId extends string | undefined = undefined,
  const TRadiusScaleId extends string | undefined = undefined,
>(
  source: Iterable<TDatum>,
  options:
    | RadialBarRadiusCallOptions<
        NoInfer<TDatum>,
        TAngle,
        TAngleScaleId,
        TRadiusScaleId
      >
    | undefined,
): PolarMark<
  TDatum,
  InferredPolarChannelOutput<TDatum, TAngle>,
  number,
  InferredPolarScaleId<TAngleScaleId, 'angle'>,
  InferredPolarScaleId<TRadiusScaleId, 'radius'>
>
export function radialBarRadius<TDatum>(
  source: Iterable<TDatum>,
  options: RadialBarRadiusOptions<NoInfer<TDatum>> = {},
): PolarMark<TDatum, any, number> {
  const data = asArray(source)
  return createPolarMark(
    ({ markIndex, parentId }) => {
      const id = options.id ?? `${parentId}:radial-bar-radius-${markIndex}`
      const angleScale = options.angleScale ?? 'angle'
      const radiusScale = options.radiusScale ?? 'radius'
      const angleValues = channelValues(
        data,
        options.angle,
        (_datum, { index }) => index,
      )
      const rawRadiusValues = numericPolarChannelValues(
        data,
        options.radius ?? options.radius2,
        (datum) => (typeof datum === 'number' ? datum : undefined),
      )
      const radius1Values = numericPolarChannelValues(
        data,
        options.radius1,
        () => 0,
      )
      const radius2Values = numericPolarChannelValues(
        data,
        options.radius2 ?? options.radius,
        (_datum, { index }) => rawRadiusValues[index],
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
        angleScale,
        radiusScale,
        colorValues: colorValues.filter(isChartKey),
        angleValues: angleValues.filter(isChartValue),
        radiusValues: [
          ...radius1Values.filter(isFiniteNumber),
          ...radius2Values.filter(isFiniteNumber),
        ],
        includeZeroRadius: options.radius1 === undefined,
        requiresAngleScale: true,
        requiresRadiusScale: true,
        render: ({ layout, color: resolveColor }) => {
          const angle = requiredBandScale(
            requiredPolarScale(
              layout,
              angleScale,
              'angle',
              `Polar mark "${id}"`,
            ),
            'angle',
            id,
          )
          const radius = requiredPolarScale(
            layout,
            radiusScale,
            'radius',
            `Polar mark "${id}"`,
          )
          const nodes: SceneNode[] = []
          const points: ChartPoint<TDatum, any, number>[] = []
          data.forEach((datum, datumIndex) => {
            const angleValue = angleValues[datumIndex]
            const radiusValue = rawRadiusValues[datumIndex]
            const radius1Value = radius1Values[datumIndex]
            const radius2Value = radius2Values[datumIndex]
            if (
              !isChartValue(angleValue) ||
              !isFiniteNumber(radiusValue) ||
              !isFiniteNumber(radius1Value) ||
              !isFiniteNumber(radius2Value)
            ) {
              return
            }
            const angleBand = resolvePolarBand(angle, angleValue)
            const mappedRadius1 =
              options.radius1 === undefined
                ? 0
                : mapPolarScale(radius, radius1Value)
            const mappedRadius2 = mapPolarScale(radius, radius2Value)
            if (
              !angleBand ||
              !isNonnegativeFiniteNumber(mappedRadius1) ||
              !isNonnegativeFiniteNumber(mappedRadius2)
            ) {
              return
            }
            const cornerRadius = resolveBarCornerRadius(
              options.cornerRadius,
              layout,
              mappedRadius1,
              mappedRadius2,
            )
            const sector = resolvePolarSector({
              startAngle: angleBand.start,
              endAngle: angleBand.end,
              innerRadius: mappedRadius1,
              outerRadius: mappedRadius2,
              cornerRadius,
            })
            if (!sector) return

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
            const [pointX, pointY] = pointRadial(
              angleBand.center,
              mappedRadius2,
            )
            const point = withPolarFocusGeometry<
              ChartPoint<TDatum, any, number>
            >(
              {
                key,
                markId: id,
                group,
                groupLabel: group == null ? id : String(group),
                datum,
                datumIndex,
                xValue: angleValue,
                yValue: radiusValue,
                y1Value: radius1Value,
                y2Value: radius2Value,
                yInterval: 'difference',
                x: layout.centerX + pointX,
                y: layout.centerY + pointY,
                color: fill,
              },
              layout,
              angleBand.center,
              mappedRadius2,
              pointX,
              pointY,
            )
            nodes.push({
              kind: 'area',
              key,
              points: sector.points,
              path: sector.path,
              interaction: { point, affinity: 'geometry' },
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
            points.push(point)
          })

          return {
            nodes: [
              {
                kind: 'group',
                key: id,
                className: classes(
                  'ts-chart__arc ts-chart__bar ts-chart__radial-bar ts-chart__radial-bar-radius',
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
    },
    options.motion,
    options.renderer,
  )
}

export interface RadialBarAngleOptions<
  TDatum,
> extends RadialBarBaseOptions<TDatum> {
  angle?: Channel<TDatum, number | null | undefined>
  angle1?: number | Channel<TDatum, number | null | undefined>
  angle2?: number | Channel<TDatum, number | null | undefined>
  radius?: Channel<TDatum, ChartValue | null | undefined>
}

type RadialBarAngleCallOptions<
  TDatum,
  TRadius extends RadialBarAngleOptions<TDatum>['radius'],
  TAngleScaleId extends string | undefined,
  TRadiusScaleId extends string | undefined,
> = Omit<
  RadialBarAngleOptions<TDatum>,
  'radius' | 'angleScale' | 'radiusScale'
> & {
  radius?: TRadius | NoInfer<RadialBarAngleOptions<TDatum>['radius']>
  angleScale?: TAngleScaleId | NoInfer<string>
  radiusScale?: TRadiusScaleId | NoInfer<string>
}

export function radialBarAngle<TDatum>(
  source: Iterable<TDatum>,
): PolarMark<TDatum, number, number>
export function radialBarAngle<
  TDatum,
  const TRadius extends RadialBarAngleOptions<NoInfer<TDatum>>['radius'] =
    never,
  const TAngleScaleId extends string | undefined = undefined,
  const TRadiusScaleId extends string | undefined = undefined,
>(
  source: Iterable<TDatum>,
  options:
    | RadialBarAngleCallOptions<
        NoInfer<TDatum>,
        TRadius,
        TAngleScaleId,
        TRadiusScaleId
      >
    | undefined,
): PolarMark<
  TDatum,
  number,
  InferredPolarChannelOutput<TDatum, TRadius>,
  InferredPolarScaleId<TAngleScaleId, 'angle'>,
  InferredPolarScaleId<TRadiusScaleId, 'radius'>
>
export function radialBarAngle<TDatum>(
  source: Iterable<TDatum>,
  options: RadialBarAngleOptions<NoInfer<TDatum>> = {},
): PolarMark<TDatum, number, any> {
  const data = asArray(source)
  return createPolarMark(
    ({ markIndex, parentId }) => {
      const id = options.id ?? `${parentId}:radial-bar-angle-${markIndex}`
      const angleScale = options.angleScale ?? 'angle'
      const radiusScale = options.radiusScale ?? 'radius'
      const rawAngleValues = numericPolarChannelValues(
        data,
        options.angle ?? options.angle2,
        (datum) => (typeof datum === 'number' ? datum : undefined),
      )
      const angle1Values = numericPolarChannelValues(
        data,
        options.angle1,
        () => 0,
      )
      const angle2Values = numericPolarChannelValues(
        data,
        options.angle2 ?? options.angle,
        (_datum, { index }) => rawAngleValues[index],
      )
      const radiusValues = channelValues(
        data,
        options.radius,
        (_datum, { index }) => index,
      )
      const groups = channelValues(data, options.z, () => null)
      const colorValues =
        options.color === undefined
          ? groups
          : channelValues(data, options.color, () => null)
      const keys = inferredKeyValues(data, options.key, {
        groups,
        candidates: [radiusValues],
        markId: id,
        warningIdentity: options,
      })

      return {
        id,
        angleScale,
        radiusScale,
        colorValues: colorValues.filter(isChartKey),
        angleValues: [
          ...angle1Values.filter(isFiniteNumber),
          ...angle2Values.filter(isFiniteNumber),
        ],
        radiusValues: radiusValues.filter(isChartValue),
        includeZeroRadius: false,
        requiresAngleScale: true,
        requiresRadiusScale: true,
        render: ({ layout, color: resolveColor }) => {
          const angle = requiredPolarScale(
            layout,
            angleScale,
            'angle',
            `Polar mark "${id}"`,
          )
          const radius = requiredBandScale(
            requiredPolarScale(
              layout,
              radiusScale,
              'radius',
              `Polar mark "${id}"`,
            ),
            'radius',
            id,
          )
          const nodes: SceneNode[] = []
          const points: ChartPoint<TDatum, number, any>[] = []
          data.forEach((datum, datumIndex) => {
            const angleValue = rawAngleValues[datumIndex]
            const angle1Value = angle1Values[datumIndex]
            const angle2Value = angle2Values[datumIndex]
            const radiusValue = radiusValues[datumIndex]
            if (
              !isFiniteNumber(angleValue) ||
              !isFiniteNumber(angle1Value) ||
              !isFiniteNumber(angle2Value) ||
              !isChartValue(radiusValue)
            ) {
              return
            }
            const mappedAngle1 = mapPolarScale(angle, angle1Value)
            const mappedAngle2 = mapPolarScale(angle, angle2Value)
            const radiusBand = resolvePolarBand(radius, radiusValue)
            if (
              !isFiniteNumber(mappedAngle1) ||
              !isFiniteNumber(mappedAngle2) ||
              !radiusBand
            ) {
              return
            }
            const cornerRadius = resolveBarCornerRadius(
              options.cornerRadius,
              layout,
              radiusBand.start,
              radiusBand.end,
            )
            const sector = resolvePolarSector({
              startAngle: mappedAngle1,
              endAngle: mappedAngle2,
              innerRadius: radiusBand.start,
              outerRadius: radiusBand.end,
              cornerRadius,
            })
            if (!sector) return

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
            const [pointX, pointY] = pointRadial(
              mappedAngle2,
              radiusBand.center,
            )
            const point = withPolarFocusGeometry<
              ChartPoint<TDatum, number, any>
            >(
              {
                key,
                markId: id,
                group,
                groupLabel: group == null ? id : String(group),
                datum,
                datumIndex,
                xValue: angleValue,
                yValue: radiusValue,
                x1Value: angle1Value,
                x2Value: angle2Value,
                xInterval: 'difference',
                x: layout.centerX + pointX,
                y: layout.centerY + pointY,
                color: fill,
              },
              layout,
              mappedAngle2,
              radiusBand.center,
              pointX,
              pointY,
            )
            nodes.push({
              kind: 'area',
              key,
              points: sector.points,
              path: sector.path,
              interaction: { point, affinity: 'geometry' },
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
            points.push(point)
          })

          return {
            nodes: [
              {
                kind: 'group',
                key: id,
                className: classes(
                  'ts-chart__arc ts-chart__bar ts-chart__radial-bar ts-chart__radial-bar-angle',
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
    },
    options.motion,
    options.renderer,
  )
}

interface RadialPathOptions<TDatum> extends ChartMarkMotionOptions<TDatum> {
  id?: string
  className?: string
  /** Named angle scale. Omit to use the reserved `angle` scale. */
  angleScale?: string
  /** Named radius scale. Omit to use the reserved `radius` scale. */
  radiusScale?: string
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

type RadialLineCallOptions<
  TDatum,
  TAngle extends RadialLineOptions<TDatum>['angle'],
  TRadius extends RadialLineOptions<TDatum>['radius'],
  TAngleScaleId extends string | undefined,
  TRadiusScaleId extends string | undefined,
> = Omit<
  RadialLineOptions<TDatum>,
  'angle' | 'radius' | 'angleScale' | 'radiusScale'
> & {
  angle?: TAngle | NoInfer<RadialLineOptions<TDatum>['angle']>
  radius?: TRadius | NoInfer<RadialLineOptions<TDatum>['radius']>
  angleScale?: TAngleScaleId | NoInfer<string>
  radiusScale?: TRadiusScaleId | NoInfer<string>
}

export function radialLine<TDatum>(
  source: Iterable<TDatum>,
): PolarMark<TDatum, number, number>
export function radialLine<
  TDatum,
  const TAngle extends RadialLineOptions<NoInfer<TDatum>>['angle'] = never,
  const TRadius extends RadialLineOptions<NoInfer<TDatum>>['radius'] = never,
  const TAngleScaleId extends string | undefined = undefined,
  const TRadiusScaleId extends string | undefined = undefined,
>(
  source: Iterable<TDatum>,
  options:
    | RadialLineCallOptions<
        NoInfer<TDatum>,
        TAngle,
        TRadius,
        TAngleScaleId,
        TRadiusScaleId
      >
    | undefined,
): PolarMark<
  TDatum,
  InferredPolarChannelOutput<TDatum, TAngle>,
  InferredPolarChannelOutput<TDatum, TRadius>,
  InferredPolarScaleId<TAngleScaleId, 'angle'>,
  InferredPolarScaleId<TRadiusScaleId, 'radius'>
>
export function radialLine<TDatum>(
  source: Iterable<TDatum>,
  options: RadialLineOptions<NoInfer<TDatum>> = {},
): PolarMark<TDatum, any, any> {
  const data = asArray(source)
  return createPolarMark(
    ({ markIndex, parentId }) => {
      const id = options.id ?? `${parentId}:radial-line-${markIndex}`
      const angleScale = options.angleScale ?? 'angle'
      const radiusScale = options.radiusScale ?? 'radius'
      const angleValues =
        typeof options.angle === 'number'
          ? data.map(() => options.angle as number)
          : channelValues(data, options.angle, (_datum, { index }) => index)
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
        angleScale,
        radiusScale,
        colorValues: colorValues.filter(isChartKey),
        angleValues: angleValues.filter(isChartValue),
        radiusValues: radiusValues.filter(isChartValue),
        includeZeroRadius: false,
        requiresAngleScale: true,
        requiresRadiusScale: true,
        render: ({ layout, color: resolveColor }) => {
          const angle = requiredPolarScale(
            layout,
            angleScale,
            'angle',
            `Polar mark "${id}"`,
          )
          const radius = requiredPolarScale(
            layout,
            radiusScale,
            'radius',
            `Polar mark "${id}"`,
          )
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
                (row) =>
                  isFiniteNumber(row.angle) && isFiniteNumber(row.radius),
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
              const point = withPolarFocusGeometry<ChartPoint<TDatum>>(
                {
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
                },
                layout,
                row.angle,
                row.radius,
                x,
                y,
              )
              points.push(point)
              if (options.points) {
                nodes.push({
                  kind: 'dot',
                  key: `${key}:dot`,
                  x,
                  y,
                  radius: 2.5,
                  pointOwner: point,
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
    },
    options.motion,
    options.renderer,
  )
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

type RadialAreaCallOptions<
  TDatum,
  TAngle extends RadialAreaOptions<TDatum>['angle'],
  TRadius extends RadialAreaOptions<TDatum>['radius'],
  TAngleScaleId extends string | undefined,
  TRadiusScaleId extends string | undefined,
> = Omit<
  RadialAreaOptions<TDatum>,
  'angle' | 'radius' | 'angleScale' | 'radiusScale'
> & {
  angle?: TAngle | NoInfer<RadialAreaOptions<TDatum>['angle']>
  radius?: TRadius | NoInfer<RadialAreaOptions<TDatum>['radius']>
  angleScale?: TAngleScaleId | NoInfer<string>
  radiusScale?: TRadiusScaleId | NoInfer<string>
}

export function radialArea<TDatum>(
  source: Iterable<TDatum>,
): PolarMark<TDatum, number, number>
export function radialArea<
  TDatum,
  const TAngle extends RadialAreaOptions<NoInfer<TDatum>>['angle'] = never,
  const TRadius extends RadialAreaOptions<NoInfer<TDatum>>['radius'] = never,
  const TAngleScaleId extends string | undefined = undefined,
  const TRadiusScaleId extends string | undefined = undefined,
>(
  source: Iterable<TDatum>,
  options:
    | RadialAreaCallOptions<
        NoInfer<TDatum>,
        TAngle,
        TRadius,
        TAngleScaleId,
        TRadiusScaleId
      >
    | undefined,
): PolarMark<
  TDatum,
  InferredPolarChannelOutput<TDatum, TAngle>,
  InferredPolarChannelOutput<TDatum, TRadius>,
  InferredPolarScaleId<TAngleScaleId, 'angle'>,
  InferredPolarScaleId<TRadiusScaleId, 'radius'>
>
export function radialArea<TDatum>(
  source: Iterable<TDatum>,
  options: RadialAreaOptions<NoInfer<TDatum>> = {},
): PolarMark<TDatum, any, any> {
  const data = asArray(source)
  return createPolarMark(
    ({ markIndex, parentId }) => {
      const id = options.id ?? `${parentId}:radial-area-${markIndex}`
      const angleScale = options.angleScale ?? 'angle'
      const radiusScale = options.radiusScale ?? 'radius'
      const angleValues =
        typeof options.angle === 'number'
          ? data.map(() => options.angle as number)
          : channelValues(data, options.angle, (_datum, { index }) => index)
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
        angleScale,
        radiusScale,
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
          const angle = requiredPolarScale(
            layout,
            angleScale,
            'angle',
            `Polar mark "${id}"`,
          )
          const radius = requiredPolarScale(
            layout,
            radiusScale,
            'radius',
            `Polar mark "${id}"`,
          )
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
              points.push(
                withPolarFocusGeometry(
                  {
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
                  },
                  layout,
                  row.angle,
                  row.radius,
                  x,
                  y,
                ),
              )
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
    },
    options.motion,
    options.renderer,
  )
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
  anchor?: VisualChannel<TDatum, 'start' | 'middle' | 'end' | 'outside'>
  baseline?: VisualChannel<TDatum, 'auto' | 'middle' | 'hanging'>
  rotate?: VisualChannel<TDatum, number>
  /** Signed pixel offset applied after the semantic radius is mapped. */
  radiusOffset?: VisualChannel<TDatum, number>
  dx?: VisualChannel<TDatum, number>
  dy?: VisualChannel<TDatum, number>
}

type RadialTextCallOptions<
  TDatum,
  TAngle extends RadialTextOptions<TDatum>['angle'],
  TRadius extends RadialTextOptions<TDatum>['radius'],
  TAngleScaleId extends string | undefined,
  TRadiusScaleId extends string | undefined,
> = Omit<
  RadialTextOptions<TDatum>,
  'angle' | 'radius' | 'angleScale' | 'radiusScale'
> & {
  angle?: TAngle | NoInfer<RadialTextOptions<TDatum>['angle']>
  radius?: TRadius | NoInfer<RadialTextOptions<TDatum>['radius']>
  angleScale?: TAngleScaleId | NoInfer<string>
  radiusScale?: TRadiusScaleId | NoInfer<string>
}

export function radialText<TDatum>(
  source: Iterable<TDatum>,
): PolarMark<TDatum, number, number>
export function radialText<
  TDatum,
  const TAngle extends RadialTextOptions<NoInfer<TDatum>>['angle'] = never,
  const TRadius extends RadialTextOptions<NoInfer<TDatum>>['radius'] = never,
  const TAngleScaleId extends string | undefined = undefined,
  const TRadiusScaleId extends string | undefined = undefined,
>(
  source: Iterable<TDatum>,
  options:
    | RadialTextCallOptions<
        NoInfer<TDatum>,
        TAngle,
        TRadius,
        TAngleScaleId,
        TRadiusScaleId
      >
    | undefined,
): PolarMark<
  TDatum,
  InferredPolarChannelOutput<TDatum, TAngle>,
  InferredPolarChannelOutput<TDatum, TRadius>,
  InferredPolarScaleId<TAngleScaleId, 'angle'>,
  InferredPolarScaleId<TRadiusScaleId, 'radius'>
>
export function radialText<TDatum>(
  source: Iterable<TDatum>,
  options: RadialTextOptions<NoInfer<TDatum>> = {},
): PolarMark<TDatum, any, any> {
  const data = asArray(source)
  return createPolarMark(
    ({ markIndex, parentId }) => {
      const id = options.id ?? `${parentId}:radial-text-${markIndex}`
      const angleScale = options.angleScale ?? 'angle'
      const radiusScale = options.radiusScale ?? 'radius'
      const angleValues =
        typeof options.angle === 'number'
          ? data.map(() => options.angle as number)
          : channelValues(data, options.angle, (_datum, { index }) => index)
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
        angleScale,
        radiusScale,
        colorValues: colorValues.filter(isChartKey),
        angleValues: angleValues.filter(isChartValue),
        radiusValues: radiusValues.filter(isChartValue),
        includeZeroRadius: false,
        requiresAngleScale: true,
        requiresRadiusScale: true,
        render: ({ layout, color: resolveColor, theme }) => {
          const angle = requiredPolarScale(
            layout,
            angleScale,
            'angle',
            `Polar mark "${id}"`,
          )
          const radius = requiredPolarScale(
            layout,
            radiusScale,
            'radius',
            `Polar mark "${id}"`,
          )
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
            const radiusOffset = visualValue(
              options.radiusOffset,
              datum,
              datumIndex,
              data,
              0,
            )
            const projectedRadius = radiusPosition + radiusOffset
            if (
              !isFiniteNumber(radiusOffset) ||
              !isFiniteNumber(projectedRadius)
            ) {
              return
            }
            const [baseX, baseY] = pointRadial(anglePosition, projectedRadius)
            const x =
              baseX + visualValue(options.dx, datum, datumIndex, data, 0)
            const y =
              baseY + visualValue(options.dy, datum, datumIndex, data, 0)
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
            const authoredAnchor = visualValue(
              options.anchor,
              datum,
              datumIndex,
              data,
              'middle',
            )
            nodes.push({
              kind: 'label',
              key,
              x,
              y,
              text: String(textValue),
              anchor:
                authoredAnchor === 'outside'
                  ? outsideRadialAnchor(anglePosition, layout.direction)
                  : authoredAnchor,
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
            points.push(
              withPolarFocusGeometry(
                {
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
                },
                layout,
                anglePosition,
                projectedRadius,
                x,
                y,
              ),
            )
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
    },
    options.motion,
    options.renderer,
  )
}

export interface RadialRuleOptions<
  TDatum,
> extends ChartMarkMotionOptions<never> {
  id?: string
  className?: string
  /** Named angle scale. Omit to use the reserved `angle` scale. */
  angleScale?: string
  /** Named radius scale. Omit to use the reserved `radius` scale. */
  radiusScale?: string
  angle?: number | Channel<TDatum, ChartValue | null | undefined>
  radius1?: number | Channel<TDatum, number | null | undefined>
  radius2?: number | Channel<TDatum, number | null | undefined>
  /** Signed pixel offset applied after radius1 is mapped. */
  radius1Offset?: VisualChannel<TDatum, number>
  /** Signed pixel offset applied after radius2 is mapped. */
  radius2Offset?: VisualChannel<TDatum, number>
  key?: Channel<TDatum, ChartKey>
  z?: Channel<TDatum, ChartKey | null | undefined>
  color?: Channel<TDatum, ChartKey | null | undefined>
  stroke?: VisualChannel<TDatum, string>
  strokeOpacity?: number
  strokeWidth?: number
  strokeDasharray?: string
  opacity?: number
}

type RadialRuleCallOptions<
  TDatum,
  TAngle extends RadialRuleOptions<TDatum>['angle'],
  TAngleScaleId extends string | undefined,
  TRadiusScaleId extends string | undefined,
> = Omit<RadialRuleOptions<TDatum>, 'angle' | 'angleScale' | 'radiusScale'> & {
  angle?: TAngle | NoInfer<RadialRuleOptions<TDatum>['angle']>
  angleScale?: TAngleScaleId | NoInfer<string>
  radiusScale?: TRadiusScaleId | NoInfer<string>
}

export function radialRule<TDatum>(
  source: Iterable<TDatum>,
): PolarMark<never, number, number>
export function radialRule<
  TDatum,
  const TAngle extends RadialRuleOptions<NoInfer<TDatum>>['angle'] = never,
  const TAngleScaleId extends string | undefined = undefined,
  const TRadiusScaleId extends string | undefined = undefined,
>(
  source: Iterable<TDatum>,
  options:
    | RadialRuleCallOptions<
        NoInfer<TDatum>,
        TAngle,
        TAngleScaleId,
        TRadiusScaleId
      >
    | undefined,
): PolarMark<
  never,
  InferredPolarChannelOutput<TDatum, TAngle>,
  number,
  InferredPolarScaleId<TAngleScaleId, 'angle'>,
  InferredPolarScaleId<TRadiusScaleId, 'radius'>
>
export function radialRule<TDatum>(
  source: Iterable<TDatum>,
  options: RadialRuleOptions<NoInfer<TDatum>> = {},
): PolarMark<never, any, number> {
  const data = asArray(source)
  return createPolarMark<never, any, number>(
    ({ markIndex, parentId }) => {
      const id = options.id ?? `${parentId}:radial-rule-${markIndex}`
      const angleScale = options.angleScale ?? 'angle'
      const radiusScale = options.radiusScale ?? 'radius'
      const angleValues =
        typeof options.angle === 'number'
          ? data.map(() => options.angle as number)
          : channelValues(data, options.angle, (_datum, { index }) => index)
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
        angleScale,
        radiusScale,
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
          const angle = requiredPolarScale(
            layout,
            angleScale,
            'angle',
            `Polar mark "${id}"`,
          )
          const radius = requiredPolarScale(
            layout,
            radiusScale,
            'radius',
            `Polar mark "${id}"`,
          )
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
            const radius1Offset = visualValue(
              options.radius1Offset,
              datum,
              datumIndex,
              data,
              0,
            )
            const radius2Offset = visualValue(
              options.radius2Offset,
              datum,
              datumIndex,
              data,
              0,
            )
            const projectedRadius1 = radius1Position + radius1Offset
            const projectedRadius2 = radius2Position + radius2Offset
            if (
              !isFiniteNumber(radius1Offset) ||
              !isFiniteNumber(radius2Offset) ||
              !isFiniteNumber(projectedRadius1) ||
              !isFiniteNumber(projectedRadius2)
            ) {
              return
            }
            const [x1, y1] = pointRadial(anglePosition, projectedRadius1)
            const [x2, y2] = pointRadial(anglePosition, projectedRadius2)
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
    },
    options.motion,
    options.renderer,
  )
}

type RadialDotCallOptions<
  TDatum,
  TAngle extends RadialDotOptions<TDatum>['angle'],
  TRadius extends RadialDotOptions<TDatum>['radius'],
  TAngleScaleId extends string | undefined,
  TRadiusScaleId extends string | undefined,
> = Omit<
  RadialDotOptions<TDatum>,
  'angle' | 'radius' | 'angleScale' | 'radiusScale'
> & {
  angle?: TAngle | NoInfer<RadialDotOptions<TDatum>['angle']>
  radius?: TRadius | NoInfer<RadialDotOptions<TDatum>['radius']>
  angleScale?: TAngleScaleId | NoInfer<string>
  radiusScale?: TRadiusScaleId | NoInfer<string>
}

export function radialDot<TDatum>(
  source: Iterable<TDatum>,
): PolarMark<TDatum, number, number>
export function radialDot<
  TDatum,
  const TAngle extends RadialDotOptions<NoInfer<TDatum>>['angle'] = never,
  const TRadius extends RadialDotOptions<NoInfer<TDatum>>['radius'] = never,
  const TAngleScaleId extends string | undefined = undefined,
  const TRadiusScaleId extends string | undefined = undefined,
>(
  source: Iterable<TDatum>,
  options:
    | RadialDotCallOptions<
        NoInfer<TDatum>,
        TAngle,
        TRadius,
        TAngleScaleId,
        TRadiusScaleId
      >
    | undefined,
): PolarMark<
  TDatum,
  InferredPolarChannelOutput<TDatum, TAngle>,
  InferredPolarChannelOutput<TDatum, TRadius>,
  InferredPolarScaleId<TAngleScaleId, 'angle'>,
  InferredPolarScaleId<TRadiusScaleId, 'radius'>
>
export function radialDot<TDatum>(
  source: Iterable<TDatum>,
  options: RadialDotOptions<NoInfer<TDatum>> = {},
): PolarMark<TDatum, any, any> {
  const data = asArray(source)
  return createPolarMark(
    ({ markIndex, parentId }) => {
      const id = options.id ?? `${parentId}:radial-dot-${markIndex}`
      const angleScale = options.angleScale ?? 'angle'
      const radiusScale = options.radiusScale ?? 'radius'
      const angleValues =
        typeof options.angle === 'number'
          ? data.map(() => options.angle as number)
          : channelValues(data, options.angle, (_datum, { index }) => index)
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
        angleScale,
        radiusScale,
        colorValues: colorValues.filter(isChartKey),
        angleValues: angleValues.filter(isChartValue),
        radiusValues: radiusValues.filter(isChartValue),
        includeZeroRadius: false,
        requiresAngleScale: true,
        requiresRadiusScale: true,
        render: ({ layout, color: resolveColor }) => {
          const angle = requiredPolarScale(
            layout,
            angleScale,
            'angle',
            `Polar mark "${id}"`,
          )
          const radius = requiredPolarScale(
            layout,
            radiusScale,
            'radius',
            `Polar mark "${id}"`,
          )
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
            points.push(
              withPolarFocusGeometry(
                {
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
                },
                layout,
                anglePosition,
                radiusPosition,
                x,
                y,
              ),
            )
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
    },
    options.motion,
    options.renderer,
  )
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
  fill?: string
  fillOpacity?: number
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
  /** Named radius scale. Omit to use the reserved `radius` scale. */
  scale?: string
  /** Angle scale used for polygon rings. Omit to use reserved `angle`. */
  angleScale?: string
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
      const radial = requiredPolarScale(
        layout,
        options.scale ?? 'radius',
        'radius',
        'Radial grid',
      )
      const values = options.values ?? radial.ticks(options.ticks ?? 5)
      const stroke = options.stroke ?? theme.grid
      const rings: SceneNode[] = []
      const labels: SceneNode[] = []
      for (const [index, value] of values.entries()) {
        const radius = radial.map(value)
        if (!isFiniteNumber(radius)) continue
        let path: string | null | void
        if (options.shape === 'polygon') {
          const angle = requiredPolarScale(
            layout,
            options.angleScale ?? 'angle',
            'angle',
            'Polygon radial grid',
          )
          path = polygonRingPath(angle, radius)
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
              fill: options.fill ?? 'none',
              fillOpacity: options.fillOpacity,
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
  /** Named angle scale. Omit to use the reserved `angle` scale. */
  scale?: string
  values?: readonly ChartValue[]
  format?: (value: ChartValue) => string
  labelOffset?: number
}

export function angleGrid(options: AngleGridOptions = {}): PolarGuide {
  return {
    render: ({ layout, theme, guideIndex, parentId }) => {
      const angle = requiredPolarScale(
        layout,
        options.scale ?? 'angle',
        'angle',
        'Angle grid',
      )
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
              outsideRadialAnchor(position, layout.direction),
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
  direction: PolarLayoutContext['direction'],
): PolarLayoutContext {
  const startAngle = finite(options.startAngle, 0)
  const endAngle = finite(options.endAngle, tau)
  const inset = Math.max(0, finite(options.inset, 0))
  const radiusRatio = Math.max(0, finite(options.radiusRatio, 1))
  const radius =
    Math.max(0, Math.min(chart.width, chart.height) / 2 - inset) * radiusRatio
  const sourceScales = resolvePolarScaleOptions(options)
  const scales: Record<string, PolarResolvedScale> = {}
  const layout: PolarLayoutContext = {
    chart,
    centerX: chart.x + chart.width / 2,
    centerY: chart.y + chart.height / 2,
    radius,
    startAngle,
    endAngle,
    direction,
    scales,
  }

  for (const [id, scaleOptions] of Object.entries(sourceScales)) {
    if (!scaleOptions) continue
    const reservedChannel = id === 'angle' || id === 'radius' ? id : undefined
    const channel = reservedChannel ?? scaleOptions.channel
    if (!channel) {
      throw new TypeError(
        `Named polar scale "${id}" requires channel: "angle" or channel: "radius"`,
      )
    }
    if (scaleOptions.channel && scaleOptions.channel !== channel) {
      throw new TypeError(
        `Polar scale "${id}" is reserved for ${channel} but declares channel: "${scaleOptions.channel}"`,
      )
    }
    if (
      reservedChannel &&
      !marks.some((mark) =>
        reservedChannel === 'angle'
          ? mark.angleScale === id
          : mark.radiusScale === id,
      )
    ) {
      throw new TypeError(
        `Polar scale "${id}" cannot be configured when no mark materializes its channel`,
      )
    }

    const valuesKey = channel === 'angle' ? 'angleValues' : 'radiusValues'
    const values = collectPolarValues(marks, valuesKey, id)
    const includeZero =
      channel === 'radius' &&
      marks.some((mark) => mark.radiusScale === id && mark.includeZeroRadius)
    let rangeStart: number
    let rangeEnd: number
    let wrapPointScale = false
    if (channel === 'angle') {
      rangeStart = startAngle
      rangeEnd = endAngle
      wrapPointScale =
        (scaleOptions as PolarAngleOptions).wrap ??
        isCompleteRevolution(startAngle, endAngle)
    } else {
      const radiusRange = resolvePolarRadiusRange(
        (scaleOptions as PolarRadiusOptions).range,
        layout,
      )
      rangeStart = radiusRange[0]
      rangeEnd = radiusRange[1]
    }

    scales[id] = resolvePolarScale(
      id,
      channel,
      scaleOptions.scale,
      values,
      rangeStart,
      rangeEnd,
      wrapPointScale,
      includeZero,
      scaleOptions.nice,
    )
  }

  return layout
}

function resolvePolarScaleOptions(
  options: PolarOptions,
): Readonly<Record<string, PolarPositionScaleOptions | null | undefined>> {
  const scales = options.scales
  if (
    !scales ||
    !Object.hasOwn(scales, 'angle') ||
    !Object.hasOwn(scales, 'radius')
  ) {
    throw new TypeError(
      'Polar scales must define reserved `angle` and `radius` entries',
    )
  }
  return scales
}

function resolvePolarScale(
  id: string,
  channel: PolarPositionChannel,
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
    id,
    channel,
    domain,
    map,
    ticks: (count) => (scale.ticks?.(count) ?? domain).filter(isChartValue),
    bandwidth,
  }
}

function collectPolarValues(
  marks: readonly InitializedPolarMark[],
  key: 'angleValues' | 'radiusValues',
  scaleId: string,
): unknown[] {
  const values: unknown[] = []
  for (const mark of marks) {
    if (
      (key === 'angleValues' ? mark.angleScale : mark.radiusScale) !== scaleId
    ) {
      continue
    }
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
  TAngleScaleId extends string = 'angle',
  TRadiusScaleId extends string = 'radius',
>(
  initialize: (
    context: PolarMarkInitializeContext,
  ) => InitializedPolarMark<TDatum, TAngle, TRadius>,
  motion?: ChartMotionDefinition<TDatum>,
  renderer?: ChartMarkRenderer,
): PolarMark<TDatum, TAngle, TRadius, TAngleScaleId, TRadiusScaleId> {
  return createInternalPolarMark(
    initialize as unknown as (
      context: PolarMarkInitializeContext,
    ) => InternalInitializedPolarMark<TDatum, TAngle, TRadius>,
    motion,
    renderer,
  ) as unknown as PolarMark<
    TDatum,
    TAngle,
    TRadius,
    TAngleScaleId,
    TRadiusScaleId
  >
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

function requiredPolarScale(
  layout: PolarLayoutContext,
  id: string,
  channel: PolarPositionChannel,
  owner = 'Polar mark',
): PolarResolvedScale {
  const scale = layout.scales[id]
  if (!scale) {
    throw new TypeError(
      `${owner} requires a configured ${channel} scale "${id}" in polar.scales`,
    )
  }
  if (scale.channel !== channel) {
    throw new TypeError(
      `${owner} uses scale "${id}" as ${channel}, but it is configured for ${scale.channel}`,
    )
  }
  return scale
}

function requiredBandScale(
  scale: PolarResolvedScale,
  axis: 'angle' | 'radius',
  markId: string,
): PolarResolvedScale {
  if (!isFiniteNumber(scale.bandwidth) || scale.bandwidth <= 0) {
    throw new TypeError(
      `Radial bar "${markId}" requires positive ${axis}-scale bandwidth`,
    )
  }
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

function resolvePolarRadiusRange(
  range: readonly [PolarLength, PolarLength] | undefined,
  layout: PolarLayoutContext,
): readonly [number, number] {
  if (!range) return [0, layout.radius]
  if (range.length !== 2) {
    throw new TypeError('Polar radius range must contain exactly two endpoints')
  }
  const resolved = range.map((value) =>
    typeof value === 'function' ? value(layout) : value,
  )
  if (!resolved.every(isNonnegativeFiniteNumber)) {
    throw new TypeError(
      'Polar radius range endpoints must be nonnegative finite pixel lengths',
    )
  }
  return [resolved[0]!, resolved[1]!]
}

interface PolarBandExtent {
  start: number
  center: number
  end: number
}

function resolvePolarBand(
  scale: PolarResolvedScale,
  value: ChartValue,
): PolarBandExtent | undefined {
  const center = scale.map(value)
  const half = scale.bandwidth / 2
  const start = center - half
  const end = center + half
  return isFiniteNumber(start) && isFiniteNumber(center) && isFiniteNumber(end)
    ? { start, center, end }
    : undefined
}

function resolveBarCornerRadius(
  value: PolarLength | 'full' | undefined,
  layout: PolarLayoutContext,
  radius1: number,
  radius2: number,
): number {
  return value === 'full'
    ? Math.abs(radius2 - radius1) / 2
    : resolveLength(value, layout, 0)
}

function numericPolarChannelValues<TDatum>(
  data: readonly TDatum[],
  channel: number | Channel<TDatum, number | null | undefined> | undefined,
  fallback: ChannelAccessor<TDatum, number | null | undefined>,
): readonly (number | null | undefined)[] {
  return typeof channel === 'number'
    ? data.map(() => channel)
    : channelValues(data, channel, fallback)
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

function outsideRadialAnchor(
  angle: number,
  direction: PolarLayoutContext['direction'],
): 'start' | 'middle' | 'end' {
  const horizontal = Math.sin(angle)
  if (Math.abs(horizontal) <= 1e-6) return 'middle'
  return physicalTextAnchor(horizontal < 0 ? 'right' : 'left', direction)
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
