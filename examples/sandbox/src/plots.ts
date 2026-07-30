import {
  areaY,
  barX,
  barY,
  cell,
  createMark,
  d3Curve,
  defineChart,
  dot,
  lineY,
  link,
  ruleX,
  ruleY,
} from '@tanstack/charts'
import type { SceneNode } from '@tanstack/charts'
import { extent, max } from 'd3-array'
import {
  scaleBand,
  scaleLinear,
  scaleOrdinal,
  scaleRadial,
  scaleSequential,
  scaleUtc,
} from 'd3-scale'
import { curveCatmullRom, curveMonotoneX } from 'd3-shape'
import type {
  ErrorStackPoint,
  ErrorTotalPoint,
  HeatCell,
  ImpactPoint,
  ReleasePoint,
  ServiceRow,
  SeverityStackPoint,
  SparkPoint,
  TriageCell,
} from './data'
import { severities, severityColors } from './data'

const smooth = d3Curve(curveMonotoneX)
const softCurve = d3Curve(curveCatmullRom.alpha(0.55))
const chartTheme = {
  foreground: '#7b7b89',
  muted: '#686875',
  grid: 'rgba(255, 255, 255, 0.075)',
  background: 'transparent',
  palette: ['#ff4f57', '#ff7a59', '#f2c66d', '#8579ff', '#45d49c'],
} as const

export interface ErrorVolumeInput {
  stack: readonly ErrorStackPoint[]
  totals: readonly ErrorTotalPoint[]
  releases: readonly ReleasePoint[]
  compactTime: boolean
}

export const createErrorVolumeChart = (input: ErrorVolumeInput) =>
  defineChart(({ width }) => {
    const dates = dateDomain(input.totals)
    const highest = max(input.totals, (row) => row.value) ?? 1
    const totalLine = input.stack.filter((row) => row.severity === 'Warning')

    return {
      marks: [
        areaY(input.stack, {
          id: 'severity-area',
          x: 'date',
          y1: 'y1',
          y2: 'y2',
          z: 'severity',
          key: 'id',
          fill: (row) => `url(#${row.severity.toLowerCase()}-volume)`,
          fillOpacity: 0.92,
          curve: smooth,
        }),
        lineY(totalLine, {
          id: 'total-line',
          x: 'date',
          y: 'y2',
          key: 'id',
          stroke: '#ff8372',
          strokeWidth: 2.4,
          curve: smooth,
        }),
        ruleY([highest * 0.66], {
          id: 'alert-threshold',
          stroke: '#ff847b',
          strokeOpacity: 0.28,
          strokeWidth: 1,
          strokeDasharray: '3 6',
        }),
        ruleX(input.releases, {
          id: 'release-rules',
          x: 'date',
          stroke: '#aea8ff',
          strokeOpacity: 0.36,
          strokeWidth: 1,
          strokeDasharray: '2 5',
        }),
      ],
      x: {
        scale: scaleUtc().domain(dates),
        ticks: width < 680 ? 4 : 7,
        format: input.compactTime ? formatHour : formatDay,
      },
      y: {
        scale: scaleLinear()
          .domain([0, highest * 1.08])
          .nice(4),
        ticks: 4,
        format: compactNumber,
        grid: true,
      },
      color: {
        scale: scaleOrdinal<(typeof severities)[number], string>()
          .domain(severities)
          .range(severities.map((severity) => severityColors[severity])),
      },
      gradients: severities.map((severity) => ({
        id: `${severity.toLowerCase()}-volume`,
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 1,
        stops: [
          { offset: 0, color: severityColors[severity], opacity: 0.72 },
          { offset: 1, color: severityColors[severity], opacity: 0.08 },
        ],
      })),
      clip: true,
      margin: {
        top: 18,
        right: 8,
        bottom: 28,
        left: width < 520 ? 34 : 44,
      },
      theme: chartTheme,
    }
  })

export interface SparkInput {
  rows: readonly SparkPoint[]
  color: string
}

export const createSparklineChart = (input: SparkInput) =>
  defineChart(() => {
    const [minimum, maximum] = extent(input.rows, (row) => row.value)
    const minValue = minimum ?? 0
    const maxValue = maximum ?? 1
    const padding = Math.max(1, (maxValue - minValue) * 0.2)

    return {
      marks: [
        areaY(input.rows, {
          id: 'spark-area',
          x: 'date',
          y1: minValue - padding,
          y2: 'value',
          key: 'id',
          fill: 'url(#spark-fill)',
          fillOpacity: 1,
          curve: softCurve,
        }),
        lineY(input.rows, {
          id: 'spark-line',
          x: 'date',
          y: 'value',
          key: 'id',
          stroke: input.color,
          strokeWidth: 1.8,
          curve: softCurve,
        }),
        dot(input.rows.slice(-1), {
          id: 'spark-tip',
          x: 'date',
          y: 'value',
          key: 'id',
          fill: input.color,
          stroke: '#111116',
          strokeWidth: 2,
          r: 3.25,
        }),
      ],
      x: { scale: scaleUtc().domain(dateDomain(input.rows)), guide: false },
      y: {
        scale: scaleLinear().domain([minValue - padding, maxValue + padding]),
        guide: false,
      },
      guides: false,
      gradients: [
        {
          id: 'spark-fill',
          x1: 0,
          y1: 0,
          x2: 0,
          y2: 1,
          stops: [
            { offset: 0, color: input.color, opacity: 0.28 },
            { offset: 1, color: input.color, opacity: 0 },
          ],
        },
      ],
      margin: 2,
      theme: chartTheme,
    }
  })

export const createBudgetChart = (input: { value: number }) =>
  defineChart(() => ({
    marks: [radialBudgetMark(input.value)],
    x: null,
    y: null,
    guides: false,
    margin: 4,
    theme: chartTheme,
  }))

export const createHeatmapChart = (input: { rows: readonly HeatCell[] }) =>
  defineChart(({ width }) => ({
    marks: [
      cell(input.rows, {
        id: 'activity-cells',
        x: 'hour',
        y: 'day',
        z: 'value',
        key: 'id',
        inset: width < 430 ? 2.25 : 3,
        radius: 3,
      }),
    ],
    x: {
      scale: scaleBand<string>()
        .domain(['00', '03', '06', '09', '12', '15', '18', '21'])
        .paddingInner(0.03),
      format: (value) =>
        ['00', '06', '12', '18'].includes(value) ? value : '',
    },
    y: {
      scale: scaleBand<string>()
        .domain(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
        .paddingInner(0.03),
      format: (value) => value.slice(0, 1),
    },
    color: {
      scale: scaleSequential<string>()
        .domain([0, 100])
        .range(['#1b181e', '#ff5b56']),
    },
    margin: { top: 6, right: 4, bottom: 24, left: 24 },
    theme: chartTheme,
  }))

export const createServicesChart = (input: { rows: readonly ServiceRow[] }) =>
  defineChart(() => {
    const domain = input.rows.map((row) => row.service)
    return {
      marks: [
        barX(input.rows, {
          id: 'service-capacity',
          x: () => 100,
          y: 'service',
          key: 'id',
          fill: '#202027',
          inset: 6,
          radius: 4,
        }),
        barX(input.rows, {
          id: 'service-volume',
          x: 'value',
          y: 'service',
          key: 'id',
          fill: (row) =>
            row.value > 78 ? '#ff5b56' : row.value > 58 ? '#ff8a62' : '#7f76e8',
          inset: 6,
          radius: 4,
        }),
        dot(input.rows, {
          id: 'service-target',
          x: 'target',
          y: 'service',
          key: 'id',
          fill: '#efedf7',
          stroke: '#111116',
          strokeWidth: 2,
          r: 3,
        }),
      ],
      x: {
        scale: scaleLinear().domain([0, 100]),
        ticks: 3,
        format: (value) => `${value}`,
        grid: true,
      },
      y: {
        scale: scaleBand<string>().domain(domain).paddingInner(0.2),
      },
      margin: { top: 4, right: 6, bottom: 24, left: 48 },
      theme: chartTheme,
    }
  })

export interface ImpactInput {
  rows: readonly ImpactPoint[]
  selectedId: string | null
}

export const createImpactChart = (input: ImpactInput) =>
  defineChart(() => {
    const selected = input.rows.filter((row) => row.id === input.selectedId)
    return {
      marks: [
        ruleX([50], {
          stroke: '#ffffff',
          strokeOpacity: 0.11,
          strokeDasharray: '3 5',
        }),
        ruleY([50], {
          stroke: '#ffffff',
          strokeOpacity: 0.11,
          strokeDasharray: '3 5',
        }),
        dot(input.rows, {
          id: 'impact-bubbles',
          x: 'events',
          y: 'users',
          z: 'severity',
          key: 'id',
          r: 'volume',
          rScale: scaleRadial().domain([0, 150]).range([3, 13]),
          fillOpacity: 0.72,
          stroke: '#17171c',
          strokeWidth: 1.5,
        }),
        ...(selected.length
          ? [
              dot(selected, {
                id: 'selected-impact',
                x: 'events',
                y: 'users',
                key: 'id',
                r: (row) => row.volume,
                rScale: scaleRadial().domain([0, 150]).range([7, 18]),
                fill: 'none',
                stroke: '#ffffff',
                strokeWidth: 1.5,
              }),
            ]
          : []),
      ],
      x: {
        scale: scaleLinear().domain([0, 100]),
        ticks: 3,
        format: visibleEndTick,
        grid: true,
      },
      y: {
        scale: scaleLinear().domain([0, 100]),
        ticks: 3,
        format: visibleEndTick,
        grid: true,
      },
      color: {
        scale: scaleOrdinal<(typeof severities)[number], string>()
          .domain(severities)
          .range(severities.map((severity) => severityColors[severity])),
      },
      margin: { top: 8, right: 8, bottom: 24, left: 30 },
      theme: chartTheme,
    }
  })

export const createSeverityStackChart = (input: {
  rows: readonly SeverityStackPoint[]
}) =>
  defineChart(() => ({
    marks: [
      barY(input.rows, {
        id: 'severity-bars',
        x: 'service',
        y1: 'y1',
        y2: 'y2',
        z: 'severity',
        key: 'id',
        inset: 4,
        radius: 3,
      }),
    ],
    x: {
      scale: scaleBand<string>()
        .domain(['API', 'Web', 'Worker', 'Auth', 'Billing'])
        .paddingInner(0.08),
    },
    y: {
      scale: scaleLinear().domain([0, 90]),
      ticks: 3,
      grid: true,
      format: visibleEndTick,
    },
    color: {
      scale: scaleOrdinal<(typeof severities)[number], string>()
        .domain(severities)
        .range(severities.map((severity) => severityColors[severity])),
    },
    margin: { top: 4, right: 4, bottom: 28, left: 30 },
    theme: chartTheme,
  }))

export const createTriageChart = (input: { rows: readonly TriageCell[] }) =>
  defineChart(() => ({
    marks: [
      cell(input.rows, {
        id: 'triage-units',
        x: 'column',
        y: 'row',
        z: 'status',
        key: 'id',
        inset: 2.25,
        radius: 2,
      }),
    ],
    x: {
      scale: scaleBand<number>().domain(
        Array.from({ length: 20 }, (_, index) => index),
      ),
    },
    y: {
      scale: scaleBand<number>().domain([4, 3, 2, 1, 0]),
    },
    guides: false,
    color: {
      scale: scaleOrdinal<TriageCell['status'], string>()
        .domain(['Resolved', 'Muted', 'Open'])
        .range(['#45d49c', '#8579ff', '#ff5b56']),
    },
    margin: 2,
    theme: chartTheme,
  }))

function radialBudgetMark(value: number) {
  const datum = { value }
  return createMark<typeof datum, never, never>(({ markIndex }) => {
    const id = `budget-${markIndex}`
    return {
      id,
      channels: {},
      render: ({ chart }) => {
        const centerX = chart.x + chart.width / 2
        const centerY = chart.y + chart.height / 2
        const radius = Math.min(chart.width, chart.height) * 0.34
        const start = -220
        const sweep = 260
        const ticks: SceneNode[] = Array.from({ length: 27 }, (_, index) => {
          const angle = start + (index / 26) * sweep
          const outer = polar(centerX, centerY, radius + 13, angle)
          const inner = polar(
            centerX,
            centerY,
            radius + (index % 5 === 0 ? 6 : 9),
            angle,
          )
          return {
            kind: 'rule',
            key: `${id}:tick:${index}`,
            x1: inner[0],
            y1: inner[1],
            x2: outer[0],
            y2: outer[1],
            style: {
              stroke: index / 26 <= value / 100 ? '#ff6b5f' : '#29282f',
              strokeWidth: index % 5 === 0 ? 1.5 : 1,
            },
          }
        })
        const background = arcPoints(
          centerX,
          centerY,
          radius,
          start,
          start + sweep,
        )
        const foreground = arcPoints(
          centerX,
          centerY,
          radius,
          start,
          start + sweep * (value / 100),
        )

        return {
          nodes: [
            {
              kind: 'group',
              key: id,
              ariaHidden: true,
              children: [
                {
                  kind: 'polyline',
                  key: `${id}:track`,
                  points: background,
                  style: {
                    fill: 'none',
                    stroke: '#25242b',
                    strokeWidth: 13,
                    lineCap: 'round',
                    lineJoin: 'round',
                  },
                },
                {
                  kind: 'polyline',
                  key: `${id}:value`,
                  points: foreground,
                  style: {
                    fill: 'none',
                    stroke: '#ff625a',
                    strokeWidth: 13,
                    lineCap: 'round',
                    lineJoin: 'round',
                  },
                },
                ...ticks,
                {
                  kind: 'label',
                  key: `${id}:label`,
                  x: centerX,
                  y: centerY - 2,
                  text: `${Math.round(value)}%`,
                  anchor: 'middle',
                  baseline: 'middle',
                  fontSize: Math.max(24, radius * 0.43),
                  fontWeight: 700,
                  style: { fill: '#f5f3f7' },
                },
                {
                  kind: 'label',
                  key: `${id}:caption`,
                  x: centerX,
                  y: centerY + Math.max(24, radius * 0.34),
                  text: 'remaining',
                  anchor: 'middle',
                  baseline: 'middle',
                  fontSize: 9,
                  fontWeight: 700,
                  style: { fill: '#6f6d78' },
                },
              ],
            },
          ],
        }
      },
    }
  })
}

function arcPoints(
  centerX: number,
  centerY: number,
  radius: number,
  start: number,
  end: number,
): readonly (readonly [number, number])[] {
  const length = Math.max(2, Math.ceil(Math.abs(end - start) / 4))
  return Array.from({ length }, (_, index) =>
    polar(
      centerX,
      centerY,
      radius,
      start + (index / (length - 1)) * (end - start),
    ),
  )
}

function polar(
  centerX: number,
  centerY: number,
  radius: number,
  angleDegrees: number,
): readonly [number, number] {
  const angle = (angleDegrees * Math.PI) / 180
  return [
    centerX + Math.cos(angle) * radius,
    centerY + Math.sin(angle) * radius,
  ]
}

function dateDomain(rows: readonly { date: Date }[]): readonly [Date, Date] {
  const [start, end] = extent(rows, (row) => row.date)
  return start && end
    ? [start, end]
    : [new Date(0), new Date(24 * 60 * 60 * 1_000)]
}

function compactNumber(value: number): string {
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`
  return `${Math.round(value)}`
}

function formatHour(value: Date): string {
  return value.toLocaleTimeString('en-US', {
    hour: 'numeric',
    hour12: true,
  })
}

function formatDay(value: Date): string {
  return value.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function visibleEndTick(value: number): string {
  return value === 0 || value === 100 ? `${value}` : ''
}
