import { areaY } from '../area'
import { barX, barY } from '../bar'
import { dot } from '../dot'
import { group } from '../group'
import { colorLegend } from '../legend-static'
import { lineY } from '../line'
import { pie } from '../polar-pie'
import { polar, radialArc } from '../polar'
import { ruleX, ruleY } from '../rule'
import { scaleBand } from '../scales-band'
import { scaleLinear } from '../scales-linear'
import { scalePoint } from '../scales-point'
import { text } from '../text'
import { scaleUtc } from 'd3-scale'

const isoDateExpression = new RegExp(
  '^(\\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\\d|3[01]))(?:T(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|[+-](?:[01]\\d|2[0-3]):[0-5]\\d))?$',
)

export type ChartJsonOperationResult =
  'accessor' | 'layout' | 'legend' | 'mark' | 'scale'

export type ChartJsonArgumentRule =
  | 'boolean'
  | 'channel'
  | 'data'
  | 'finite-number'
  | 'layout'
  | 'nonempty-string'
  | 'nonnegative-number'
  | 'numeric-channel'
  | 'opacity'
  | 'path'
  | 'placement'
  | 'ratio'
  | 'scale-band'
  | 'string'
  | 'text-anchor'

export interface ChartJsonOperation {
  readonly id: string
  readonly summary: string
  readonly result: ChartJsonOperationResult
  readonly coordinate?: 'cartesian' | 'circular'
  readonly fields: Readonly<Record<string, ChartJsonArgumentRule>>
  readonly required?: readonly string[]
  readonly mutuallyExclusive?: readonly (readonly string[])[]
  readonly create: (arguments_: Readonly<Record<string, unknown>>) => unknown
}

const channelFields = {
  id: 'nonempty-string',
  x: 'channel',
  y: 'channel',
  z: 'channel',
  color: 'channel',
  key: 'channel',
} as const

const paintFields = {
  fill: 'string',
  fillOpacity: 'opacity',
  stroke: 'string',
  strokeWidth: 'nonnegative-number',
} as const

const operations: readonly ChartJsonOperation[] = [
  {
    id: 'tanstack.accessor.iso-date',
    summary: 'Parses an ISO date from a field, path, or value.',
    result: 'accessor',
    fields: { field: 'nonempty-string', path: 'path' },
    mutuallyExclusive: [['field', 'path']],
    create({ field, path }) {
      if (field !== undefined && path !== undefined)
        throw new TypeError('field and path are mutually exclusive')
      const segments =
        field !== undefined
          ? [field as string]
          : path === undefined
            ? []
            : pathSegments(path)
      return (datum: unknown) => {
        let value = datum
        for (const segment of segments) {
          if (
            value === null ||
            (typeof value !== 'object' && typeof value !== 'function') ||
            !Object.hasOwn(value, segment)
          )
            return undefined
          value = (value as Record<string, unknown>)[segment]
        }
        return parseChartJsonIsoDate(value)
      }
    },
  },
  {
    id: 'tanstack.legend.color',
    summary: 'Creates a categorical color legend.',
    result: 'legend',
    fields: {
      label: 'string',
      itemWidth: 'nonnegative-number',
      width: 'nonnegative-number',
      placement: 'placement',
    },
    create: colorLegend as ChartJsonOperation['create'],
  },
  {
    id: 'tanstack.layout.group',
    summary: 'Creates a grouped interval layout.',
    result: 'layout',
    fields: { scale: 'scale-band', padding: 'nonnegative-number' },
    create: group as ChartJsonOperation['create'],
  },
  ...(
    [
      {
        id: 'tanstack.mark.area-y',
        summary: 'Creates an area-y mark.',
        fields: {
          data: 'data',
          ...channelFields,
          y1: 'numeric-channel',
          y2: 'numeric-channel',
          ...paintFields,
        },
        create: areaY,
      },
      {
        id: 'tanstack.mark.bar-x',
        summary: 'Creates a bar-x mark.',
        fields: {
          data: 'data',
          ...channelFields,
          x1: 'numeric-channel',
          x2: 'numeric-channel',
          ...paintFields,
          layout: 'layout',
          inset: 'finite-number',
          maxThickness: 'nonnegative-number',
          radius: 'nonnegative-number',
        },
        create: barX,
      },
      {
        id: 'tanstack.mark.bar-y',
        summary: 'Creates a bar-y mark.',
        fields: {
          data: 'data',
          ...channelFields,
          y1: 'numeric-channel',
          y2: 'numeric-channel',
          ...paintFields,
          layout: 'layout',
          inset: 'finite-number',
          maxThickness: 'nonnegative-number',
          radius: 'nonnegative-number',
        },
        create: barY,
      },
      {
        id: 'tanstack.mark.dot',
        summary: 'Creates a dot mark.',
        fields: {
          data: 'data',
          ...channelFields,
          r: 'numeric-channel',
          ...paintFields,
          strokeOpacity: 'opacity',
        },
        create: dot,
      },
      {
        id: 'tanstack.mark.line-y',
        summary: 'Creates a line-y mark.',
        fields: {
          data: 'data',
          ...channelFields,
          stroke: 'string',
          strokeOpacity: 'opacity',
          strokeWidth: 'nonnegative-number',
          strokeDasharray: 'string',
          points: 'boolean',
        },
        create: lineY,
      },
      {
        id: 'tanstack.mark.rule-x',
        summary: 'Creates a vertical reference rule spanning the plot.',
        fields: {
          data: 'data',
          id: 'nonempty-string',
          x: 'channel',
          color: 'channel',
          stroke: 'string',
          strokeOpacity: 'opacity',
          strokeWidth: 'nonnegative-number',
          strokeDasharray: 'string',
        },
        create: ruleX,
      },
      {
        id: 'tanstack.mark.rule-y',
        summary: 'Creates a horizontal reference rule spanning the plot.',
        fields: {
          data: 'data',
          id: 'nonempty-string',
          y: 'channel',
          color: 'channel',
          stroke: 'string',
          strokeOpacity: 'opacity',
          strokeWidth: 'nonnegative-number',
          strokeDasharray: 'string',
        },
        create: ruleY,
      },
      {
        id: 'tanstack.mark.text',
        summary:
          'Creates positioned text labels; x, y, and text name row fields, while presentation arguments are fixed values.',
        fields: {
          data: 'data',
          ...channelFields,
          text: 'channel',
          fill: 'string',
          fontSize: 'nonnegative-number',
          fontWeight: 'nonnegative-number',
          anchor: 'text-anchor',
          rotate: 'finite-number',
          dx: 'finite-number',
          dy: 'finite-number',
        },
        create: text,
      },
    ] as const
  ).map(({ create, ...operation }): ChartJsonOperation => ({
    ...operation,
    result: 'mark',
    coordinate: 'cartesian',
    required: ['data'],
    create(arguments_) {
      const { data, ...options } = arguments_
      return Reflect.apply(create, undefined, [data, options])
    },
  })),
  {
    id: 'tanstack.mark.pie',
    summary:
      'Creates one pie or donut from pre-aggregated rows; value names a nonnegative numeric field, category names a string or finite-number color field, and innerRadiusRatio defaults to 0 and must be in [0, 1).',
    result: 'mark',
    coordinate: 'circular',
    fields: {
      data: 'data',
      value: 'nonempty-string',
      category: 'nonempty-string',
      id: 'nonempty-string',
      innerRadiusRatio: 'ratio',
    },
    required: ['data', 'value', 'category'],
    create({ data, value, category, id, innerRadiusRatio }) {
      const valueField = value as string
      const categoryField = category as string
      const rows: object[] = []
      const values = new WeakMap<object, number>()
      const categories = new WeakMap<object, string | number>()
      for (const [index, datum] of Array.from(
        data as Iterable<unknown>,
      ).entries()) {
        if (datum === null || typeof datum !== 'object')
          throw new TypeError(`pie: row at index ${index} must be an object`)
        const resolvedValue = Reflect.get(datum, valueField)
        if (
          typeof resolvedValue !== 'number' ||
          !Number.isFinite(resolvedValue) ||
          resolvedValue < 0
        )
          throw new TypeError(
            `pie: value at index ${index} must be a nonnegative finite number`,
          )
        const resolvedCategory = Reflect.get(datum, categoryField)
        if (
          typeof resolvedCategory !== 'string' &&
          !(
            typeof resolvedCategory === 'number' &&
            Number.isFinite(resolvedCategory)
          )
        )
          throw new TypeError(
            `pie: category at index ${index} must be a string or finite number`,
          )
        rows.push(datum)
        values.set(datum, resolvedValue)
        categories.set(datum, resolvedCategory)
      }
      const slices = pie(rows, { value: (datum) => values.get(datum) })
      const categoryValue = (slice: (typeof slices)[number]) =>
        categories.get(slice.source[0])
      const markId = id as string | undefined
      const ratio = innerRadiusRatio as number | undefined
      return polar({
        ...(markId ? { id: markId } : {}),
        marks: [
          radialArc(slices, {
            z: categoryValue,
            color: categoryValue,
            ...(ratio === undefined
              ? {}
              : { innerRadius: ({ radius }) => radius * ratio }),
          }),
        ],
      })
    },
  },
  ...(
    [
      ['band', 'Creates an inferable band scale.', scaleBand],
      ['linear', 'Creates an inferable linear scale.', scaleLinear],
      ['point', 'Creates an inferable point scale.', scalePoint],
      ['utc', 'Creates an inferable UTC scale.', scaleUtc],
    ] as const
  ).map(([name, summary, create]): ChartJsonOperation => ({
    id: `tanstack.scale.${name}`,
    summary: summary as string,
    result: 'scale',
    fields: {},
    create: () => create,
  })),
]

export const chartJsonOperations = Object.freeze(
  operations.map((operation) =>
    Object.freeze({
      ...operation,
      fields: Object.freeze({ ...operation.fields }),
      ...(operation.required
        ? { required: Object.freeze([...operation.required]) }
        : {}),
      ...(operation.mutuallyExclusive
        ? {
            mutuallyExclusive: Object.freeze(
              operation.mutuallyExclusive.map((group) =>
                Object.freeze([...group]),
              ),
            ),
          }
        : {}),
    }),
  ),
)

export const chartJsonOperationsById: ReadonlyMap<string, ChartJsonOperation> =
  new Map(chartJsonOperations.map((operation) => [operation.id, operation]))

function pathSegments(value: unknown): readonly string[] {
  if (typeof value === 'string' && value.length) {
    const segments = value.split('.')
    if (segments.every(Boolean)) return segments
  }
  if (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((segment) => typeof segment === 'string' && segment.length > 0)
  )
    return value
  throw new TypeError('path must be a nonempty dotted string or string array')
}

function parseChartJsonIsoDate(value: unknown): Date | undefined {
  if (value instanceof Date)
    return Number.isFinite(value.getTime()) ? new Date(value) : undefined
  if (typeof value !== 'string') return undefined
  const match = isoDateExpression.exec(value)
  if (!match) return undefined
  const calendar = new Date(`${match[1]}T00:00:00.000Z`)
  if (
    !Number.isFinite(calendar.getTime()) ||
    calendar.toISOString().slice(0, 10) !== match[1]
  )
    return undefined
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date : undefined
}
