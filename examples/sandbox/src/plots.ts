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
  ruleX,
  ruleY,
} from '@tanstack/charts'
import type { SceneNode } from '@tanstack/charts'
import { extent, max, mean } from 'd3-array'
import {
  scaleBand,
  scaleLinear,
  scaleSequential,
  scaleSqrt,
  scaleUtc,
} from 'd3-scale'
import { curveCatmullRom, curveMonotoneX } from 'd3-shape'
import type { AaplRow } from '@tanstack/charts-data/aapl'
import type { PenguinsRow } from '@tanstack/charts-data/penguins'
import type { SimpsonsRow } from '@tanstack/charts-data/simpsons'
import type {
  CarEconomyRow,
  IndustryStackPoint,
  SurveyCell,
  SurveyStackPoint,
} from './transforms'
import {
  industryColors,
  industryNames,
  responseColors,
  surveyResponses,
} from './transforms'

const smooth = d3Curve(curveMonotoneX)
const softCurve = d3Curve(curveCatmullRom.alpha(0.55))
const chartTheme = {
  foreground: '#7b7b89',
  muted: '#686875',
  grid: 'rgba(255, 255, 255, 0.075)',
  background: 'transparent',
  palette: ['#ff4f57', '#ff7a59', '#f2c66d', '#8579ff', '#45d49c'],
} as const

export interface IndustryChartInput {
  rows: readonly IndustryStackPoint[]
  compactTime: boolean
}

export const createIndustryChart = (input: IndustryChartInput) =>
  defineChart(({ width }) => {
    const totalLine = input.rows.filter(
      (row) => row.industry === industryNames.at(-1),
    )

    return {
      marks: [
        areaY(input.rows, {
          id: 'industry-area',
          x: 'date',
          y1: 'y1',
          y2: 'y2',
          z: 'industry',
          color: 'industry',
          fillOpacity: 0.76,
          curve: smooth,
        }),
        lineY(totalLine, {
          id: 'total-line',
          x: 'date',
          y: 'y2',
          stroke: '#f5f3f7',
          strokeOpacity: 0.72,
          strokeWidth: 2.4,
          curve: smooth,
        }),
      ],
      scales: {
        x: {
          scale: scaleUtc,
          axis: {
            ticks: {
              count: width < 680 ? 4 : 7,
              format: input.compactTime ? formatMonth : formatYear,
            },
          },
        },
        y: {
          scale: scaleLinear,
          nice: 4,
          grid: true,
          axis: {
            ticks: { count: 4, format: compactNumber },
            label: 'Unemployed (thousands)',
          },
        },
      },

      color: {
        domain: industryNames,
        range: industryNames.map((industry) => industryColors[industry]),
      },
      clip: true,
      margin: {
        top: 8,
        right: 8,
        bottom: 30,
        left: width < 520 ? 42 : 54,
      },
      theme: chartTheme,
    }
  })

export interface SparkInput<TDatum> {
  rows: readonly TDatum[]
  date: (row: TDatum) => Date
  value: (row: TDatum) => number | null
  color: string
}

export const createAaplPriceVolumeChart = (input: {
  rows: readonly AaplRow[]
}) =>
  defineChart(({ width }) => ({
    marks: [
      areaY(input.rows, {
        id: 'aapl-volume',
        x: 'Date',
        y1: 0,
        y2: 'Volume',
        yScale: 'volume',
        fill: '#8579ff',
        fillOpacity: 0.18,
        curve: smooth,
      }),
      lineY(input.rows, {
        id: 'aapl-close',
        x: 'Date',
        y: 'Close',
        stroke: '#ff625a',
        strokeWidth: 2,
        curve: smooth,
      }),
    ],
    scales: {
      x: {
        scale: scaleUtc,
        axis: {
          ticks: {
            count: width < 680 ? 4 : 7,
            format: formatYear,
          },
        },
      },
      y: {
        scale: scaleLinear,
        nice: true,
        grid: true,
        axis: {
          label: 'Close ($)',
          ticks: { count: 4, format: formatDollars },
        },
      },
      volume: {
        channel: 'y',
        side: 'right',
        scale: scaleLinear,
        nice: true,
        axis: {
          label: 'Volume',
          ticks: { count: 4, format: formatVolume },
        },
      },
    },
    clip: true,
    margin: { top: 8, bottom: 30 },
    theme: chartTheme,
  }))

export const createSparklineChart = <TDatum>(input: SparkInput<TDatum>) => {
  const [minimum, maximum] = extent(input.rows, input.value)
  const minValue = minimum ?? 0
  const maxValue = maximum ?? 1
  const padding = Math.max(1, (maxValue - minValue) * 0.2)

  return {
    marks: [
      areaY(input.rows, {
        id: 'spark-area',
        x: input.date,
        y1: minValue - padding,
        y2: input.value,
        fill: 'url(#spark-fill)',
        fillOpacity: 1,
        curve: softCurve,
      }),
      lineY(input.rows, {
        id: 'spark-line',
        x: input.date,
        y: input.value,
        stroke: input.color,
        strokeWidth: 1.8,
        curve: softCurve,
      }),
      dot(input.rows.slice(-1), {
        id: 'spark-tip',
        x: input.date,
        y: input.value,
        fill: input.color,
        stroke: '#111116',
        strokeWidth: 2,
        r: 3.25,
      }),
    ],
    scales: {
      x: { scale: scaleUtc },
      y: { scale: scaleLinear },
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
}

export const createAgreementChart = (input: { value: number }) =>
  defineChart(() => ({
    marks: [radialAgreementMark(input.value)],
    scales: {
      x: null,
      y: null,
    },
    margin: 4,
    theme: chartTheme,
  }))

export const createRatingsHeatmap = (input: { rows: readonly SimpsonsRow[] }) =>
  defineChart(({ width }) => ({
    marks: [
      cell(input.rows, {
        id: 'rating-cells',
        x: 'number_in_season',
        y: 'season',
        color: 'imdb_rating',
        inset: width < 430 ? 2.25 : 3,
        radius: 3,
      }),
    ],
    scales: {
      x: {
        scale: () => scaleBand<number>().paddingInner(0.03),
        axis: {
          ticks: {
            format: (value: number) => (value % 5 === 0 ? `${value}` : ''),
          },
          label: 'Episode',
        },
      },
      y: {
        scale: () => scaleBand<number>().paddingInner(0.03),
        axis: {
          ticks: {
            format: (value: number) => (value % 5 === 0 ? `${value}` : ''),
          },
          label: 'Season',
        },
      },
    },

    color: {
      scale: scaleSequential<string>,
      range: ['#1b181e', '#ff5b56'],
    },
    margin: { top: 6, right: 4, bottom: 30, left: 34 },
    theme: chartTheme,
  }))

export const createCarEconomyChart = (input: {
  rows: readonly CarEconomyRow[]
}) =>
  defineChart(() => {
    const maximum = max(input.rows, (row) => row.economy) ?? 1
    return {
      marks: [
        barX(input.rows, {
          id: 'economy-range',
          x: () => maximum,
          y: 'cylinders',
          fill: '#202027',
          inset: 6,
          radius: 4,
        }),
        barX(input.rows, {
          id: 'cylinder-economy',
          x: 'economy',
          y: 'cylinders',
          color: 'economy',
          inset: 6,
          radius: 4,
        }),
        dot(input.rows, {
          id: 'overall-economy',
          x: 'overallEconomy',
          y: 'cylinders',
          fill: '#efedf7',
          stroke: '#111116',
          strokeWidth: 2,
          r: 3,
        }),
      ],
      scales: {
        x: {
          scale: scaleLinear,
          nice: true,
          grid: true,
          axis: {
            ticks: { count: 3, format: (value: number) => `${value} mpg` },
          },
        },
        y: {
          scale: () => scaleBand<number>().paddingInner(0.2),
          axis: {
            ticks: { format: (value: number) => `${value} cyl` },
          },
        },
      },

      color: {
        scale: scaleSequential<string>,
        range: ['#7f76e8', '#45d49c'],
      },
      margin: { top: 4, right: 8, bottom: 30, left: 48 },
      theme: chartTheme,
    }
  })

export interface PenguinChartInput {
  rows: readonly PenguinsRow[]
  selectedKey: string | null
}

export const createPenguinChart = (input: PenguinChartInput) =>
  defineChart(() => {
    const selected = input.rows.filter(
      (row) => penguinKey(row) === input.selectedKey,
    )
    const meanLength =
      mean(input.rows, (row) => row.culmen_length_mm ?? undefined) ?? 0
    const meanDepth =
      mean(input.rows, (row) => row.culmen_depth_mm ?? undefined) ?? 0
    return {
      marks: [
        ruleX([meanLength], {
          stroke: '#ffffff',
          strokeOpacity: 0.11,
          strokeDasharray: '3 5',
        }),
        ruleY([meanDepth], {
          stroke: '#ffffff',
          strokeOpacity: 0.11,
          strokeDasharray: '3 5',
        }),
        dot(input.rows, {
          id: 'penguin-bubbles',
          x: 'culmen_length_mm',
          y: 'culmen_depth_mm',
          color: 'species',
          r: 'body_mass_g',
          rScale: {
            scale: () => scaleSqrt().range([3, 12]),
          },
          fillOpacity: 0.72,
          stroke: '#17171c',
          strokeWidth: 1.5,
        }),
        ...(selected.length
          ? [
              dot(selected, {
                id: 'selected-penguin',
                x: 'culmen_length_mm',
                y: 'culmen_depth_mm',
                r: 'body_mass_g',
                rScale: {
                  scale: () => scaleSqrt().range([7, 17]),
                },
                fill: 'none',
                stroke: '#ffffff',
                strokeWidth: 1.5,
              }),
            ]
          : []),
      ],
      scales: {
        x: {
          scale: scaleLinear,
          nice: true,
          grid: true,
          axis: { ticks: { count: 3 }, label: 'Bill length (mm)' },
        },
        y: {
          scale: scaleLinear,
          nice: true,
          grid: true,
          axis: { ticks: { count: 3 }, label: 'Bill depth (mm)' },
        },
      },

      color: {
        range: ['#ff625a', '#8579ff', '#45d49c'],
      },
      margin: { top: 8, right: 8, bottom: 34, left: 42 },
      theme: chartTheme,
    }
  })

export const createSurveyStackChart = (input: {
  rows: readonly SurveyStackPoint[]
}) =>
  defineChart(() => ({
    marks: [
      barY(input.rows, {
        id: 'survey-bars',
        x: 'Question',
        y1: 'y1',
        y2: 'y2',
        z: 'Response',
        color: 'Response',
        inset: 4,
        radius: 3,
      }),
    ],
    scales: {
      x: {
        scale: () => scaleBand<string>().paddingInner(0.08),
      },
      y: {
        scale: scaleLinear,
        grid: true,
        axis: { ticks: { count: 3 }, label: 'Responses' },
      },
    },

    color: {
      domain: surveyResponses,
      range: surveyResponses.map((response) => responseColors[response]),
    },
    margin: { top: 4, right: 4, bottom: 28, left: 42 },
    theme: chartTheme,
  }))

export const createSurveyWaffleChart = (input: {
  rows: readonly SurveyCell[]
}) =>
  defineChart(() => ({
    marks: [
      cell(input.rows, {
        id: 'survey-units',
        x: 'column',
        y: 'row',
        color: 'Response',
        inset: 2.25,
        radius: 2,
      }),
    ],
    scales: {
      x: {
        scale: scaleBand<number>().domain(
          Array.from({ length: 21 }, (_, index) => index),
        ),
      },
      y: {
        scale: scaleBand<number>().domain([4, 3, 2, 1, 0]),
      },
    },

    guides: false,
    color: {
      domain: surveyResponses,
      range: surveyResponses.map((response) => responseColors[response]),
    },
    margin: 2,
    theme: chartTheme,
  }))

export function penguinKey(row: PenguinsRow): string {
  return [
    row.species,
    row.island,
    row.culmen_length_mm,
    row.culmen_depth_mm,
    row.body_mass_g,
    row.sex,
  ].join(':')
}

function radialAgreementMark(value: number) {
  const datum = { value }
  return createMark<typeof datum, never, never>(({ markIndex }) => {
    const id = `agreement-${markIndex}`
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
                  text: 'agree',
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

function compactNumber(value: number): string {
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`
  return `${Math.round(value)}`
}

function formatDollars(value: number): string {
  return `$${Math.round(value)}`
}

function formatVolume(value: number): string {
  if (value >= 1_000_000) return `${Math.round(value / 1_000_000)}M`
  return compactNumber(value)
}

function formatMonth(value: Date): string {
  return value.toLocaleDateString('en-US', { month: 'short' })
}

function formatYear(value: Date): string {
  return value.toLocaleDateString('en-US', {
    month: 'short',
    year: '2-digit',
  })
}
