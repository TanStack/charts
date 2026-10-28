import {
  channelValues,
  inferredKeyValues,
  isChartKey,
  isChartValue,
  isFiniteNumber,
  markStates,
  visualValue,
} from './mark'
import {
  estimateSceneText,
  measureSceneLabelBounds,
  physicalTextAnchor,
} from './guide-layout'
import { withPolarFocusGeometry } from './polar-focus-internal'
import { layoutRadialLabels } from './polar-label-layout-internal'
import { createPolarMark } from './polar-mark-internal'
import { valueKey } from './scales'
import { toArray } from './transform-internal'
import type { PolarMark } from './polar'
import type {
  InitializedPolarMark,
  PolarResolvedScale,
} from './polar-mark-internal'
import type {
  InferredPolarChannelOutput,
  InferredPolarScaleId,
  RadialPathOptions,
} from './polar-types-internal'
import type {
  Channel,
  ChartPoint,
  ChartValue,
  SceneNode,
  VisualChannel,
} from './types'

// Connector and text spacing in pixels.
const radialLabelSpacing = { offset: 16, elbow: 12, padding: 4 }

export interface RadialLabelsOptions<TDatum> extends RadialPathOptions<TDatum> {
  text?: Channel<TDatum, string | number | null | undefined>
  /**
   * Labels with lower priority hide first when labels do not fit. Defaults to
   * datum `value`, so `pie()` rows keep their largest slices.
   */
  priority?: Channel<TDatum, number | null | undefined>
  fill?: VisualChannel<TDatum, string>
  fontSize?: number
  fontWeight?: number
  opacity?: number
  /** Hides a label that would move more pixels than this from its slice. */
  maxShift?: number
  /** Connector color. Defaults to the label fill. */
  stroke?: VisualChannel<TDatum, string>
  strokeOpacity?: number
  strokeWidth?: number
}

type RadialLabelsCallOptions<
  TDatum,
  TAngle extends RadialLabelsOptions<TDatum>['angle'],
  TRadius extends RadialLabelsOptions<TDatum>['radius'],
  TAngleScaleId extends string | undefined,
  TRadiusScaleId extends string | undefined,
> = Omit<
  RadialLabelsOptions<TDatum>,
  'angle' | 'radius' | 'angleScale' | 'radiusScale'
> & {
  angle?: TAngle | NoInfer<RadialLabelsOptions<TDatum>['angle']>
  radius?: TRadius | NoInfer<RadialLabelsOptions<TDatum>['radius']>
  angleScale?: TAngleScaleId | NoInfer<string>
  radiusScale?: TRadiusScaleId | NoInfer<string>
}

/**
 * Outside labels with connectors. Crowded labels are pushed apart vertically,
 * and the lowest-priority labels are hidden when they still do not fit.
 */
export function radialLabels<TDatum>(
  source: Iterable<TDatum>,
): PolarMark<TDatum, number, number>
export function radialLabels<
  TDatum,
  const TAngle extends RadialLabelsOptions<NoInfer<TDatum>>['angle'] = never,
  const TRadius extends RadialLabelsOptions<NoInfer<TDatum>>['radius'] = never,
  const TAngleScaleId extends string | undefined = undefined,
  const TRadiusScaleId extends string | undefined = undefined,
>(
  source: Iterable<TDatum>,
  options:
    | RadialLabelsCallOptions<
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
export function radialLabels<TDatum>(
  source: Iterable<TDatum>,
  options: RadialLabelsOptions<NoInfer<TDatum>> = {},
): PolarMark<TDatum, any, any> {
  const data = toArray(source)
  const fontSize = options.fontSize ?? 12
  if (!isFiniteNumber(fontSize) || fontSize <= 0) {
    throw new TypeError('radialLabels: fontSize must be positive and finite')
  }
  const mark = createPolarMark(
    ({ markIndex, parentId, states: defaultStates }) => {
      const id = options.id ?? `${parentId}:radial-labels-${markIndex}`
      const angleScale = options.angleScale ?? 'angle'
      const radiusScale = options.radiusScale ?? 'radius'
      const angleValues =
        typeof options.angle === 'number'
          ? data.map(() => options.angle as number)
          : channelValues(data, options.angle, (datum) =>
              numberProperty(datum, 'angle'),
            )
      const radiusValues =
        typeof options.radius === 'number'
          ? data.map(() => options.radius as number)
          : channelValues(data, options.radius, () => 1)
      const textValues = channelValues(data, options.text, (datum) =>
        datum == null ? '' : String(datum),
      )
      const priorityValues = channelValues(data, options.priority, (datum) =>
        numberProperty(datum, 'value'),
      )
      const groups = channelValues(data, options.z, () => null)
      const colorValues =
        options.color === undefined
          ? groups
          : channelValues(data, options.color, () => null)
      const keys = inferredKeyValues(data, options.key, { groups })

      // Scale IDs let the polar container validate them before render.
      const initialized: InitializedPolarMark<
        TDatum,
        ChartValue,
        ChartValue
      > & {
        angleScale: string
        radiusScale: string
      } = {
        id,
        states: markStates(data, defaultStates),
        angleScale,
        radiusScale,
        colorValues: colorValues.filter(isChartKey),
        angleValues: angleValues.filter(isChartValue),
        radiusValues: radiusValues.filter(isChartValue),
        includeZeroRadius: false,
        requiresAngleScale: true,
        requiresRadiusScale: true,
        render: ({ layout, color: resolveColor, theme }) => {
          const angle = layout.scales[angleScale]!
          const radius = layout.scales[radiusScale]!
          const candidates = data.flatMap((_datum, datumIndex) => {
            const anglePosition = position(angle, angleValues[datumIndex])
            const radiusPosition = position(radius, radiusValues[datumIndex])
            const text = textValues[datumIndex]
            if (
              text == null ||
              text === '' ||
              !isFiniteNumber(anglePosition) ||
              !isFiniteNumber(radiusPosition)
            ) {
              return []
            }
            const priority = priorityValues[datumIndex]
            return [
              {
                datumIndex,
                angle: anglePosition,
                radius: radiusPosition,
                priority: isFiniteNumber(priority) ? priority : 0,
                width: measureSceneLabelBounds(
                  {
                    kind: 'label',
                    key: '',
                    x: 0,
                    y: 0,
                    text: String(text),
                    anchor: 'start',
                    baseline: 'middle',
                    fontSize,
                    fontWeight: options.fontWeight,
                  },
                  estimateSceneText,
                ).width,
              },
            ]
          })
          const placements = layoutRadialLabels(candidates, {
            radius: Math.max(0, ...candidates.map(({ radius }) => radius)),
            ...radialLabelSpacing,
            lineHeight: fontSize * 1.4,
            top: layout.chart.y - layout.centerY,
            bottom: layout.chart.y + layout.chart.height - layout.centerY,
            left: layout.chart.x - layout.centerX,
            right: layout.chart.x + layout.chart.width - layout.centerX,
            maxShift: options.maxShift ?? Infinity,
          })
          const connectors: SceneNode[] = []
          const labels: SceneNode[] = []
          const points: ChartPoint<TDatum>[] = []
          candidates.forEach((candidate, candidateIndex) => {
            const placement = placements[candidateIndex]
            if (!placement?.visible) return
            const { datumIndex } = candidate
            const datum = data[datumIndex] as TDatum
            const group = groups[datumIndex] ?? null
            const colorValue = colorValues[datumIndex] ?? null
            const fill = visualValue(
              options.fill,
              datum,
              datumIndex,
              data,
              colorValue == null ? theme.foreground : resolveColor(colorValue),
            )
            const stroke = visualValue(
              options.stroke,
              datum,
              datumIndex,
              data,
              fill,
            )
            const key = `${id}:${valueKey(group)}:${valueKey(keys[datumIndex])}`
            const [start, ...rest] = placement.connector
            connectors.push({
              kind: 'polyline',
              key: `${key}:connector`,
              points: [],
              path: `M${start!.join(',')}${rest.map((point) => `L${point.join(',')}`).join('')}`,
              style: {
                fill: 'none',
                stroke,
                strokeOpacity: options.strokeOpacity,
                strokeWidth: options.strokeWidth ?? 1,
                opacity: options.opacity,
                lineCap: 'round',
                lineJoin: 'round',
              },
            })
            labels.push({
              kind: 'label',
              key,
              x: placement.x,
              y: placement.y,
              text: String(textValues[datumIndex]),
              anchor: physicalTextAnchor(
                placement.side === 'left' ? 'right' : 'left',
                layout.direction,
              ),
              baseline: 'middle',
              fontSize,
              fontWeight: options.fontWeight,
              style: { fill, opacity: options.opacity },
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
                  xValue: angleValues[datumIndex] as ChartValue,
                  yValue: radiusValues[datumIndex] as ChartValue,
                  x: layout.centerX + placement.x,
                  y: layout.centerY + placement.y,
                  color: fill,
                },
                layout,
                candidate.angle,
                candidate.radius,
                placement.x,
                placement.y,
              ),
            )
          })
          return {
            nodes: [
              {
                kind: 'group',
                key: id,
                className: options.className
                  ? `ts-chart__radial-labels ts-chart__text ${options.className}`
                  : 'ts-chart__radial-labels ts-chart__text',
                ariaHidden: true,
                children: [...connectors, ...labels],
              },
            ],
            points,
          }
        },
      }
      return initialized
    },
    options.motion,
    options.renderer,
  )
  return mark as unknown as PolarMark<TDatum, any, any>
}

function position(scale: PolarResolvedScale, value: unknown): number {
  return isChartValue(value) ? scale.map(value) : Number.NaN
}

function numberProperty(value: unknown, key: string): number | undefined {
  if (!value || typeof value !== 'object') return undefined
  const property = (value as Record<string, unknown>)[key]
  return isFiniteNumber(property) ? property : undefined
}
