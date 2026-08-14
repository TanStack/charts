import { useMemo, useRef } from 'react'
import {
  areaY,
  barX,
  barY,
  d3Curve,
  defineChart,
  dot,
  group,
  isResponsiveChartDefinition,
  lineY,
  stack,
  text,
} from '@tanstack/charts'
import {
  angleGrid,
  pie,
  polar,
  radialArc,
  radialArea,
  radialBarAngle,
  radialDot,
  radialGrid,
  radialRule,
  radialText,
  type PieDatum,
} from '@tanstack/charts/polar'
import { Chart } from '@tanstack/charts/react/core'
import { RendererChart as TooltipChart } from '@tanstack/charts/react/tooltip'
import { tooltip } from '@tanstack/charts/tooltip'
import { scaleBand, scaleLinear, scalePoint } from 'd3-scale'
import {
  curveLinear,
  curveLinearClosed,
  curveMonotoneX,
  curveNatural,
  curveStep,
} from 'd3-shape'
import {
  getShadcnCatalogSpec,
  shadcnActivities,
  shadcnBrowsers,
  shadcnColors,
  shadcnMonths,
  shadcnRadarDefault,
  shadcnRadarFilled,
  shadcnRadarLines,
  shadcnRadarMultiple,
  shadcnSeriesRows,
  type ShadcnActivityDatum,
  type ShadcnBrowserDatum,
  type ShadcnCatalogSpec,
  type ShadcnMonthDatum,
  type ShadcnSeriesDatum,
} from './shadcn-catalog-data'
import {
  ShadcnChartCard,
  ShadcnTrendFooter,
  shadcnChartMount,
} from './shadcn-chart-card'
import { createShadcnSpringRenderer, shadcnSpringMotion } from './shadcn-motion'
import interactiveAreaData from '../shadcn/area-interactive-data.json'
import { tanstackCase } from './mount'
import type { ChartPoint, ChartTooltipOptions } from '@tanstack/charts'
import type { ChartDefinition, ChartValue } from '@tanstack/charts'
import type { ConformanceInput } from '../types'

const monthSeries = ['desktop', 'mobile', 'tablet'] as const
const twoSeries = monthSeries.slice(0, 2)
const browserNames = shadcnBrowsers.map((row) => row.browser)
const activityNames = ['running', 'swimming'] as const
const horizontalVariants = new Set(['horizontal', 'label-custom', 'mixed'])
const interactiveAreaRows = interactiveAreaData as readonly {
  date: string
  desktop: number
  mobile: number
}[]
const interactiveBarRows: readonly ShadcnMonthDatum[] = interactiveAreaRows.map(
  (row) => ({
    month: row.date,
    desktop: row.desktop,
    mobile: row.mobile,
    tablet: 0,
  }),
)

type ShadcnRadialCatalogDatum =
  | ShadcnBrowserDatum
  | PieDatum<{ id: string; value: number }>
  | { id: string; angle: number; radius: number; text: string }
  | { browser: string; visitors: number; ring: string }
  | {
      id: string
      ring: string
      start: number
      end: number
      fill: string
    }

export function createShadcnTanStackExample(name: string) {
  const spec = getShadcnCatalogSpec(name)
  if (spec.family === 'area') {
    return createShadcnExample(spec, buildAreaDefinition(spec))
  }
  if (spec.family === 'bar') {
    return createShadcnExample<
      ShadcnMonthDatum | ShadcnSeriesDatum | ShadcnBrowserDatum,
      string | number,
      string | number
    >(spec, buildBarDefinition(spec))
  }
  if (spec.family === 'line') {
    return createShadcnExample(spec, buildLineDefinition(spec))
  }
  if (spec.family === 'pie') {
    return createShadcnExample(spec, buildPieDefinition(spec))
  }
  if (spec.family === 'radar') {
    return createShadcnExample(spec, buildRadarDefinition(spec))
  }
  if (spec.family === 'radial') {
    return createShadcnExample<
      ShadcnRadialCatalogDatum,
      number,
      string | number
    >(spec, buildRadialDefinition(spec))
  }
  return createShadcnExample(spec, buildTooltipDefinition())
}

function createShadcnExample<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  spec: ShadcnCatalogSpec,
  definition: ChartDefinition<TDatum, TXValue, TYValue>,
) {
  const tooltipOptions: ChartTooltipOptions<TDatum, TXValue, TYValue> = {
    className: 'sc-chart-tooltip',
    anchor:
      spec.family === 'tooltip'
        ? (_points, context) => ({
            x: context.surface.width * 0.271,
            y: context.surface.height * 0.554,
          })
        : 'group-center',
    placement: spec.family === 'tooltip' ? 'bottom-right' : 'auto',
    offset: spec.family === 'tooltip' ? 0 : undefined,
    sort: 'color-domain',
    content:
      spec.family === 'tooltip'
        ? () => ({ rows: [] })
        : (points) => ({
            title: String(points[0]?.xValue ?? ''),
            rows: points.map((point) => ({
              label: point.markId.replace(
                /-?(bars|lines|areas|slices|values)$/u,
                '',
              ),
              value: Number(point.yValue ?? point.xValue ?? 0).toLocaleString(
                'en-US',
              ),
              color: point.color,
            })),
          }),
  }
  const chartOptions = {
    svgAnimation: false,
    motion: shadcnSpringMotion,
    focus: spec.family === 'radial' ? false : 'group-x',
    focusRing: false,
    keyboard: spec.family !== 'radial',
    tooltip: { use: tooltip, ...tooltipOptions },
  } as const
  const interactiveDefinition = isResponsiveChartDefinition(definition)
    ? defineChart(definition, chartOptions)
    : defineChart(definition, chartOptions)
  const catalogCase = tanstackCase(
    () => interactiveDefinition,
    `${spec.title} implemented with TanStack Charts`,
    true,
    { guides: spec.family !== 'pie', margin: true },
  )

  function TanStackView({ input }: { input: ConformanceInput }) {
    const seededTooltip = useRef(false)
    const chartDefinition = useMemo(() => interactiveDefinition, [])
    const renderer = useMemo(
      () => createShadcnSpringRenderer<TDatum, TXValue, TYValue>(),
      [],
    )
    const legend = spec.legend ? <ShadcnLegend spec={spec} /> : undefined
    const interactive = spec.variant === 'interactive'
    const footer =
      spec.family === 'tooltip' ||
      interactive ||
      (spec.family === 'pie' && spec.variant === 'legend') ? undefined : (
        <ShadcnTrendFooter note={spec.footerNote} />
      )
    const headerAction =
      (spec.family === 'bar' || spec.family === 'line') && interactive ? (
        <ShadcnBarMetrics />
      ) : interactive ? (
        <ShadcnSelectDisplay
          label={spec.family === 'area' ? 'Last 3 months' : 'January'}
          swatch={spec.family === 'pie' ? shadcnColors[0] : undefined}
        />
      ) : undefined

    return (
      <ShadcnChartCard
        input={input}
        title={spec.title}
        description={spec.description}
        chartShape={spec.square ? 'square' : 'wide'}
        centered={spec.square}
        headerInsetBottom={
          spec.family === 'radar' &&
          spec.variant !== 'dots' &&
          spec.variant !== 'legend'
            ? 16
            : 0
        }
        chartFooter={legend}
        footer={footer}
        headerAction={headerAction}
        variant={
          spec.family === 'area' && interactive
            ? 'interactive-area'
            : spec.family === 'bar' && interactive
              ? 'interactive-bar'
              : spec.family === 'line' && interactive
                ? 'interactive-line'
                : spec.family === 'pie' && interactive
                  ? 'interactive-pie'
                  : 'default'
        }
        chartHeight={
          interactive &&
          (spec.family === 'area' ||
            spec.family === 'bar' ||
            spec.family === 'line')
            ? 250
            : spec.legend && !spec.square
              ? (Math.max(1, input.width - 50) * 9) / 16 - 27
              : undefined
        }
        chartClassName={
          spec.name === 'chart-radar-label-custom' ? 'sc-chart-clip' : undefined
        }
      >
        {({ width, height }) =>
          spec.family === 'tooltip' ? (
            <TooltipChart
              definition={chartDefinition}
              renderer={renderer}
              initialWidth={width}
              height={height}
              ariaLabel={spec.title}
              onRender={({ scene, interaction }) => {
                if (seededTooltip.current) return
                const point = scene.points.find(
                  (candidate) =>
                    (candidate.datum as ShadcnActivityDatum).date ===
                    '2024-07-16',
                )
                if (!point) return
                seededTooltip.current = true
                interaction.setControlledFocus(point, {
                  source: 'programmatic',
                })
              }}
              renderTooltipBody={({ points }) => (
                <ShadcnTooltipBody
                  points={points as readonly ChartPoint<ShadcnActivityDatum>[]}
                  variant={spec.variant}
                />
              )}
            />
          ) : (
            <Chart
              definition={chartDefinition}
              renderer={renderer}
              initialWidth={width}
              height={height}
              ariaLabel={spec.title}
            />
          )
        }
      </ShadcnChartCard>
    )
  }

  return {
    definition: interactiveDefinition,
    catalogCase,
    mount: shadcnChartMount(TanStackView),
  }
}

function buildAreaDefinition(spec: ShadcnCatalogSpec) {
  if (spec.variant === 'interactive') return buildInteractiveAreaDefinition()
  const multi =
    spec.variant === 'axes' ||
    spec.variant === 'gradient' ||
    spec.variant === 'icons' ||
    spec.variant === 'interactive' ||
    spec.variant === 'legend' ||
    spec.variant.startsWith('stacked')
  const expanded = spec.variant === 'stacked-expand'
  const expandedRows = shadcnMonths.flatMap((row, index) => [
    {
      month: row.month,
      series: 'other',
      value: [45, 100, 150, 50, 100, 160][index]!,
    },
    { month: row.month, series: 'mobile', value: row.mobile },
    { month: row.month, series: 'desktop', value: row.desktop },
  ])
  const rows = expanded
    ? expandedRows
    : multi
      ? shadcnSeriesRows.filter((row) => row.series !== 'tablet')
      : shadcnMonths
  const curve =
    spec.variant === 'linear'
      ? curveLinear
      : spec.variant === 'step'
        ? curveStep
        : curveNatural
  const gradients = spec.variant === 'gradient'

  return defineChart({
    marks: [
      multi
        ? areaY(rows as readonly ShadcnSeriesDatum[], {
            id: 'visitor-areas',
            x: 'month',
            y: 'value',
            z: 'series',
            color: 'series',
            key: (row) => `${row.month}:${row.series}`,
            layout: stack({
              order: expanded
                ? ['other', 'mobile', 'desktop']
                : ['mobile', 'desktop'],
              ...(expanded ? { offset: 'normalize' } : {}),
            }),
            curve: d3Curve(curve),
            fill: expanded
              ? (row) =>
                  row.series === 'other'
                    ? `color-mix(in oklch, ${shadcnColors[2]} 10%, transparent)`
                    : `color-mix(in oklch, ${row.series === 'mobile' ? shadcnColors[1] : shadcnColors[0]} 40%, transparent)`
              : gradients
                ? (row) => `url(#shadcn-area-${row.series})`
                : undefined,
            fillOpacity: expanded ? 1 : 0.4,
            stroke: expanded
              ? (row) =>
                  row.series === 'other'
                    ? shadcnColors[2]
                    : row.series === 'mobile'
                      ? shadcnColors[1]
                      : shadcnColors[0]
              : (row) =>
                  row.series === 'mobile' ? shadcnColors[1] : shadcnColors[0],
            strokeWidth: 1.5,
          })
        : areaY(rows as readonly ShadcnMonthDatum[], {
            id: 'visitor-area',
            x: 'month',
            y: 'desktop',
            curve: d3Curve(curve),
            fill: shadcnColors[0],
            fillOpacity: 0.4,
            stroke: shadcnColors[0],
            strokeWidth: 1.5,
          }),
    ],
    x: shadcnPointXAxis(),
    y: {
      scale:
        spec.variant === 'axes'
          ? scaleLinear().domain([0, 600])
          : expanded
            ? scaleLinear().domain([0, 1])
            : scaleLinear,
      grid: true,
      axis:
        spec.variant === 'axes'
          ? { line: false, ticks: { size: 0, values: [0, 300, 600] } }
          : { line: false, ticks: false, tickLabels: false },
    },
    color: {
      domain: expanded ? ['other', 'mobile', 'desktop'] : monthSeries,
      range: expanded
        ? [shadcnColors[2], shadcnColors[1], shadcnColors[0]]
        : shadcnColors.slice(0, 3),
    },
    gradients: gradients
      ? twoSeries.map((series, index) => ({
          id: `shadcn-area-${series}`,
          x1: 0,
          y1: 1,
          x2: 0,
          y2: 0,
          stops: [
            { offset: 0.05, color: shadcnColors[index], opacity: 0.08 },
            { offset: 0.95, color: shadcnColors[index], opacity: 0.8 },
          ],
        }))
      : undefined,
    margin:
      spec.variant === 'axes'
        ? { top: 12, right: 12, bottom: 28, left: 40 }
        : { top: 5, right: 12, bottom: 35, left: 12 },
    theme: shadcnTheme(),
  })
}

function buildInteractiveAreaDefinition() {
  const rows: ShadcnSeriesDatum[] = interactiveAreaRows.flatMap((row) => [
    { month: row.date, series: 'mobile', value: row.mobile },
    { month: row.date, series: 'desktop', value: row.desktop },
  ])
  return defineChart(({ width }) => ({
    marks: [
      areaY(rows, {
        id: 'visitor-areas',
        x: 'month',
        y: 'value',
        z: 'series',
        color: 'series',
        key: (row) => `${row.month}:${row.series}`,
        layout: stack({ order: ['mobile', 'desktop'] }),
        curve: d3Curve(curveNatural),
        fill: (row) => `url(#shadcn-interactive-${row.series})`,
        fillOpacity: 1,
        stroke: (row) =>
          row.series === 'mobile' ? shadcnColors[1] : shadcnColors[0],
        strokeWidth: 1,
      }),
    ],
    x: {
      scale: scalePoint,
      axis: {
        line: false,
        ticks: {
          values: [
            '2024-04-10',
            '2024-04-21',
            '2024-05-02',
            '2024-05-13',
            '2024-05-25',
            '2024-06-05',
            '2024-06-16',
            '2024-06-29',
          ],
          size: 0,
          padding: 10,
          format: formatMonthDay,
        },
      },
    },
    y: {
      scale: scaleLinear().domain([0, 1200]),
      grid: true,
      axis: {
        line: false,
        ticks: { values: [0, 300, 600, 900, 1200], size: 0 },
        tickLabels: false,
      },
    },
    color: { domain: twoSeries, range: shadcnColors.slice(0, 2) },
    gradients: twoSeries.map((series, index) => ({
      id: `shadcn-interactive-${series}`,
      x1: 0,
      y1: 1,
      x2: 0,
      y2: 0,
      stops: [
        { offset: 0.05, color: shadcnColors[index], opacity: 0.1 },
        { offset: 0.95, color: shadcnColors[index], opacity: 0.8 },
      ],
    })),
    margin: {
      top: 32,
      right: width < 400 ? 14 : 5,
      bottom: 35,
      left: 5,
    },
    theme: shadcnTheme(),
  }))
}

function buildBarDefinition(spec: ShadcnCatalogSpec) {
  if (spec.variant === 'interactive') {
    return defineChart({
      marks: [
        barY(interactiveBarRows, {
          id: 'daily-bars',
          x: 'month',
          y: 'desktop',
          fill: shadcnColors[1],
        }),
      ],
      x: {
        scale: () => scaleBand<string>().paddingInner(0.2).paddingOuter(0.1),
        axis: {
          line: false,
          ticks: {
            values: [
              '2024-04-01',
              '2024-04-11',
              '2024-04-22',
              '2024-05-03',
              '2024-05-14',
              '2024-05-26',
              '2024-06-06',
              '2024-06-17',
              '2024-06-29',
            ],
            size: 0,
            padding: 10,
            format: formatMonthDay,
          },
        },
      },
      y: { scale: scaleLinear, grid: true, axis: false },
      margin: { top: 5, right: 12, bottom: 25, left: 12 },
      theme: shadcnTheme(),
    })
  }
  if (spec.variant === 'active') {
    const rows = shadcnBrowsers.map((row) =>
      row.browser === 'chrome'
        ? { ...row, visitors: 187 }
        : row.browser === 'firefox'
          ? { ...row, visitors: 275 }
          : row,
    )
    return defineChart({
      marks: [
        barY(rows, {
          id: 'visitor-bars',
          x: 'browser',
          y: 'visitors',
          color: 'browser',
          fill: (row) =>
            row.browser === 'firefox'
              ? `color-mix(in srgb, ${shadcnColors[2]} 80%, transparent)`
              : shadcnColors[browserNames.indexOf(row.browser)]!,
          stroke: (row) =>
            row.browser === 'firefox' ? shadcnColors[2] : 'none',
          strokeWidth: 2,
          strokeDasharray: (row) =>
            row.browser === 'firefox' ? '4 4' : 'none',
          radius: 8,
        }),
      ],
      x: shadcnBrowserXAxis(),
      y: { scale: scaleLinear, grid: true, axis: false },
      color: { domain: browserNames, range: shadcnColors },
      margin: { top: 5, right: 5, bottom: 35, left: 5 },
      theme: shadcnTheme(),
    })
  }
  if (spec.variant === 'mixed') {
    return defineChart({
      marks: [
        barX(shadcnBrowsers, {
          id: 'visitor-bars',
          x: 'visitors',
          y: 'browser',
          color: 'browser',
          radius: 5,
        }),
      ],
      x: { scale: scaleLinear, axis: false },
      y: shadcnBrowserYAxis(),
      color: { domain: browserNames, range: shadcnColors },
      margin: { top: 5, right: 5, bottom: 5, left: 60 },
      theme: shadcnTheme(),
    })
  }
  if (spec.variant === 'label-custom') {
    return defineChart({
      marks: [
        barX(shadcnMonths, {
          id: 'visitor-bars',
          x: 'desktop',
          y: 'month',
          fill: shadcnColors[1],
          radius: 4,
        }),
        text(shadcnMonths, {
          id: 'month-labels',
          x: () => 0,
          y: 'month',
          text: 'month',
          dx: 8,
          anchor: 'start',
          fill: 'var(--background)',
          fontSize: 12,
        }),
        text(shadcnMonths, {
          id: 'visitor-labels',
          x: 'desktop',
          y: 'month',
          text: (row) => row.desktop.toLocaleString('en-US'),
          dx: 8,
          anchor: 'start',
          fill: 'var(--foreground)',
          fontSize: 12,
        }),
      ],
      x: { scale: scaleLinear, grid: true, axis: false },
      y: {
        scale: () => scaleBand<string>().paddingInner(0.18).paddingOuter(0.08),
        axis: false,
      },
      margin: { top: 5, right: 36, bottom: 5, left: 0 },
      theme: shadcnTheme(),
    })
  }
  if (spec.variant === 'multiple') {
    return groupedBarDefinition()
  }
  if (spec.variant === 'stacked') {
    const rows = shadcnSeriesRows.filter((row) => row.series !== 'tablet')
    return defineChart({
      marks: [
        barY(rows, {
          id: 'visitor-bars',
          x: 'month',
          y: 'value',
          z: 'series',
          color: 'series',
          key: (row) => `${row.month}:${row.series}`,
          layout: stack({ order: twoSeries }),
          radius: 4,
        }),
      ],
      x: shadcnXAxis(),
      y: { scale: scaleLinear, grid: true, axis: false },
      color: { domain: twoSeries, range: shadcnColors.slice(0, 2) },
      margin: { top: 5, right: 5, bottom: 35, left: 5 },
      theme: shadcnTheme(),
    })
  }

  const negativeRows = [
    { month: 'January', desktop: 186, mobile: 0, tablet: 0 },
    { month: 'February', desktop: 205, mobile: 0, tablet: 0 },
    { month: 'March', desktop: -207, mobile: 0, tablet: 0 },
    { month: 'April', desktop: 173, mobile: 0, tablet: 0 },
    { month: 'May', desktop: -209, mobile: 0, tablet: 0 },
    { month: 'June', desktop: 214, mobile: 0, tablet: 0 },
  ]
  const rows = spec.variant === 'negative' ? negativeRows : shadcnMonths
  const horizontal = horizontalVariants.has(spec.variant)
  const labels =
    spec.variant === 'label' ||
    spec.variant === 'label-custom' ||
    spec.variant === 'negative'
  const marks = horizontal
    ? [
        barX(rows, {
          id: 'visitor-bars',
          x: 'desktop',
          y: 'month',
          fill: shadcnColors[0],
          radius: 5,
        }),
        ...(labels
          ? [
              text(rows, {
                id: 'visitor-labels',
                x: 'desktop',
                y: 'month',
                text: (row) => row.desktop.toLocaleString('en-US'),
                dx: -7,
                anchor: 'end',
                fill: 'var(--background)',
                fontSize: 11,
                fontWeight: 600,
              }),
            ]
          : []),
      ]
    : [
        barY(rows, {
          id: 'visitor-bars',
          x: 'month',
          y: 'desktop',
          fill: (row) =>
            spec.variant === 'negative' && row.desktop < 0
              ? shadcnColors[1]
              : shadcnColors[0],
          radius: spec.variant === 'negative' ? 0 : 8,
        }),
        ...(labels
          ? [
              text(rows, {
                id: 'visitor-labels',
                x: 'month',
                y: 'desktop',
                text: (row) => row.desktop.toLocaleString('en-US'),
                ...(spec.variant === 'negative'
                  ? {
                      text: (row: ShadcnMonthDatum) => row.month,
                      dy: (row: ShadcnMonthDatum) =>
                        row.desktop < 0 ? 14 : -10,
                      fill: shadcnColors[0],
                      fontSize: 12,
                    }
                  : {
                      dy: -12,
                      fill: 'var(--foreground)',
                      fontSize: 12,
                    }),
              }),
            ]
          : []),
      ]

  return defineChart({
    marks,
    x: horizontal
      ? { scale: scaleLinear, axis: false }
      : spec.variant === 'negative'
        ? {
            scale: () =>
              scaleBand<string>().paddingInner(0.2).paddingOuter(0.1),
            axis: false,
          }
        : shadcnXAxis(),
    y: horizontal
      ? {
          scale: () =>
            scaleBand<string>().paddingInner(0.18).paddingOuter(0.08),
          axis: { line: false, ticks: { size: 0 } },
        }
      : { scale: scaleLinear, grid: true, axis: false },
    margin: horizontal
      ? { top: 5, right: 5, bottom: 5, left: 72 }
      : spec.variant === 'negative'
        ? { top: 24, right: 5, bottom: 24, left: 5 }
        : { top: labels ? 24 : 5, right: 5, bottom: 35, left: 5 },
    theme: shadcnTheme(),
  })
}

function groupedBarDefinition() {
  const rows = shadcnSeriesRows.filter(
    (row) => row.series === 'desktop' || row.series === 'mobile',
  )
  const groupScale = scaleBand<string>()
    .domain(twoSeries)
    .paddingInner(0.08)
    .paddingOuter(0)
  return defineChart({
    marks: [
      barY(rows, {
        id: 'visitor-bars',
        x: 'month',
        y: 'value',
        z: 'series',
        color: 'series',
        key: (row) => `${row.month}:${row.series}`,
        layout: group({ scale: groupScale }),
        radius: 4,
      }),
    ],
    x: shadcnXAxis(),
    y: { scale: scaleLinear, grid: true, axis: false },
    color: { domain: twoSeries, range: shadcnColors.slice(0, 2) },
    margin: { top: 5, right: 5, bottom: 35, left: 5 },
    theme: shadcnTheme(),
  })
}

function buildLineDefinition(spec: ShadcnCatalogSpec) {
  if (spec.variant === 'interactive') return buildInteractiveLineDefinition()
  const multiple = spec.variant === 'multiple'
  const browserVariant =
    spec.variant === 'dots-colors' || spec.variant === 'label-custom'
  const rows = multiple
    ? shadcnSeriesRows.filter((row) => row.series !== 'tablet')
    : browserVariant
      ? shadcnBrowsers
      : shadcnMonths
  const curve =
    spec.variant === 'linear'
      ? curveLinear
      : spec.variant === 'step'
        ? curveStep
        : multiple
          ? curveMonotoneX
          : curveNatural
  const dots = spec.variant.includes('dots')
  const labels = spec.variant.includes('label')
  const dotMarks = !dots
    ? []
    : browserVariant
      ? [
          dot(shadcnBrowsers, {
            id: 'visitor-dots',
            x: 'browser',
            y: 'visitors',
            color: 'browser',
            r: 5,
          }),
        ]
      : [
          ...(spec.variant === 'dots-custom'
            ? [
                text(shadcnMonths, {
                  id: 'visitor-dot-stems',
                  x: 'month',
                  y: 'desktop',
                  text: () => '│',
                  fill: shadcnColors[0],
                  fontSize: 24,
                }),
              ]
            : []),
          dot(shadcnMonths, {
            id: 'visitor-dots',
            x: 'month',
            y: 'desktop',
            r: spec.variant === 'dots-custom' ? 5 : 4,
            fill:
              spec.variant === 'dots-custom'
                ? 'var(--background)'
                : shadcnColors[0],
            stroke: shadcnColors[0],
            strokeWidth: spec.variant === 'dots-custom' ? 2 : 1,
          }),
        ]
  const labelMarks = !labels
    ? []
    : browserVariant
      ? [
          text(shadcnBrowsers, {
            id: 'visitor-labels',
            x: 'browser',
            y: 'visitors',
            text: (row) => titleCase(row.browser),
            dy: -12,
            fill: 'var(--foreground)',
            fontSize: 12,
          }),
        ]
      : [
          text(shadcnMonths, {
            id: 'visitor-labels',
            x: 'month',
            y: 'desktop',
            text: (row) => row.desktop.toLocaleString('en-US'),
            dy: -12,
            fill: 'var(--foreground)',
            fontSize: 12,
          }),
        ]
  return defineChart(({ width }) => ({
    marks: [
      multiple
        ? lineY(rows as readonly ShadcnSeriesDatum[], {
            id: 'visitor-lines',
            x: 'month',
            y: 'value',
            z: 'series',
            color: 'series',
            key: (row) => `${row.month}:${row.series}`,
            curve: d3Curve(curve),
            strokeWidth: 2,
          })
        : browserVariant
          ? lineY(rows as readonly ShadcnBrowserDatum[], {
              id: 'visitor-line',
              x: 'browser',
              y: 'visitors',
              curve: d3Curve(curve),
              stroke: shadcnColors[1],
              strokeWidth: 2,
            })
          : lineY(rows as readonly ShadcnMonthDatum[], {
              id: 'visitor-line',
              x: 'month',
              y: 'desktop',
              curve: d3Curve(curve),
              stroke: shadcnColors[0],
              strokeWidth: 2,
            }),
      ...dotMarks,
      ...labelMarks,
    ],
    x: browserVariant ? { scale: scalePoint, axis: false } : shadcnPointXAxis(),
    y: {
      scale: scaleLinear().domain([0, browserVariant ? 300 : 320]),
      grid: true,
      axis: {
        line: false,
        ticks: {
          values: browserVariant
            ? [0, 75, 150, 225, 300]
            : [0, 80, 160, 240, 320],
          size: 0,
        },
        tickLabels: false,
      },
    },
    color: {
      domain: browserVariant ? browserNames : twoSeries,
      range: browserVariant ? shadcnColors : shadcnColors.slice(0, 2),
    },
    margin: browserVariant
      ? { top: 24, right: 24, bottom: 5, left: 24 }
      : {
          top:
            spec.variant === 'dots-custom' && width < 400
              ? 16
              : labels
                ? 24
                : 8,
          right: 12,
          bottom: 35,
          left: 12,
        },
    theme: shadcnTheme(),
  }))
}

function buildInteractiveLineDefinition() {
  return defineChart(({ width }) => ({
    marks: [
      lineY(interactiveBarRows, {
        id: 'daily-line',
        x: 'month',
        y: 'desktop',
        curve: d3Curve(curveMonotoneX),
        stroke: shadcnColors[0],
        strokeWidth: 2,
      }),
    ],
    x: {
      scale: scalePoint,
      axis: {
        line: false,
        ticks: {
          values: [
            '2024-04-10',
            '2024-04-21',
            '2024-05-02',
            '2024-05-13',
            '2024-05-25',
            '2024-06-05',
            '2024-06-16',
            '2024-06-29',
          ],
          size: 0,
          padding: 10,
          format: formatMonthDay,
        },
      },
    },
    y: {
      scale: scaleLinear().domain([0, 600]),
      grid: true,
      axis: {
        line: false,
        ticks: { values: [0, 150, 300, 450, 600], size: 0 },
        tickLabels: false,
      },
    },
    margin: {
      top: 5,
      right: width < 400 ? 24 : 12,
      bottom: 35,
      left: 12,
    },
    theme: shadcnTheme(),
  }))
}

function buildPieDefinition(spec: ShadcnCatalogSpec) {
  if (spec.variant === 'interactive') return buildInteractivePieDefinition()
  if (spec.variant === 'stacked') return buildStackedPieDefinition()
  const arcs = pie(shadcnBrowsers, {
    value: 'visitors',
    startAngle: Math.PI / 2,
    endAngle: (-Math.PI * 3) / 2,
  })
  const donut = spec.variant.includes('donut')
  const active = spec.variant === 'donut-active'
  const centerText = spec.variant === 'donut-text'
  const labels = spec.variant.includes('label')
  const externalLabels = spec.variant === 'label'
  const customLabels = spec.variant === 'label-custom'
  const labelList = spec.variant === 'label-list'
  const separator = spec.variant === 'separator-none' ? 0 : active ? 5 : 1
  const marks = [
    radialArc(arcs, {
      id: 'browser-slices',
      key: 'browser',
      innerRadius: donut ? 60 : undefined,
      color: 'browser',
      stroke: 'var(--background)',
      strokeWidth: separator,
    }),
    ...(active
      ? [
          radialArc(arcs.slice(0, 1), {
            id: 'active-browser-slice',
            key: 'browser',
            innerRadius: 60,
            outerRadius: ({ radius }) => radius + 10,
            color: 'browser',
            stroke: 'var(--background)',
            strokeWidth: 5,
          }),
        ]
      : []),
    ...(externalLabels
      ? [
          radialRule(arcs, {
            id: 'browser-leaders',
            angle: 'angle',
            radius1: 1,
            radius2: 1,
            radius2Offset: 14,
            key: 'browser',
            stroke: 'var(--border)',
          }),
        ]
      : []),
    ...(labels
      ? [
          radialText(arcs, {
            id: 'browser-labels',
            angle: 'angle',
            radius: externalLabels || customLabels ? 1 : 0.68,
            radiusOffset: externalLabels || customLabels ? 17 : 0,
            text: (row) =>
              labelList
                ? titleCase(row.browser)
                : row.visitors.toLocaleString('en-US'),
            key: 'browser',
            anchor: externalLabels || customLabels ? 'outside' : 'middle',
            fill:
              externalLabels || customLabels
                ? 'var(--foreground)'
                : 'var(--background)',
            fontSize: 12,
            fontWeight: labelList ? 400 : undefined,
          }),
        ]
      : []),
    ...(centerText
      ? [
          radialText([{ id: 'total', angle: 0, radius: 0, text: '1,125' }], {
            id: 'visitor-total',
            angle: 'angle',
            radius: 'radius',
            key: 'id',
            text: 'text',
            dy: -5,
            fill: 'var(--foreground)',
            fontSize: 30,
            fontWeight: 700,
          }),
          radialText([{ id: 'label', angle: 0, radius: 0, text: 'Visitors' }], {
            id: 'visitor-label',
            angle: 'angle',
            radius: 'radius',
            key: 'id',
            text: 'text',
            dy: 19,
            fill: 'var(--muted-foreground)',
            fontSize: 14,
          }),
        ]
      : []),
  ]

  return defineChart({
    marks: [
      polar({
        radiusRatio: 0.78,
        angle: { scale: scaleLinear().domain([0, Math.PI * 2]) },
        radius: { scale: scaleLinear().domain([0, 1]) },
        marks,
      }),
    ],
    color: { domain: browserNames, range: shadcnColors },
    margin: 0,
  })
}

function buildStackedPieDefinition() {
  const desktopRows = [186, 305, 237, 173, 209].map((visitors, index) => ({
    browser: ['january', 'february', 'march', 'april', 'may'][index]!,
    visitors,
  }))
  const mobileRows = [80, 200, 120, 190, 130].map((visitors, index) => ({
    browser: ['january', 'february', 'march', 'april', 'may'][index]!,
    visitors,
  }))
  const desktopArcs = pie(desktopRows, {
    value: 'visitors',
    startAngle: Math.PI / 2,
    endAngle: (-Math.PI * 3) / 2,
  })
  const mobileArcs = pie(mobileRows, {
    value: 'visitors',
    startAngle: Math.PI / 2,
    endAngle: (-Math.PI * 3) / 2,
  })
  const months = desktopRows.map((row) => row.browser)
  return defineChart({
    marks: [
      polar({
        radiusRatio: 1,
        angle: { scale: scaleLinear().domain([0, Math.PI * 2]) },
        radius: { scale: scaleLinear().domain([0, 1]) },
        marks: [
          radialArc(desktopArcs, {
            id: 'desktop-slices',
            key: 'browser',
            outerRadius: 60,
            color: 'browser',
            stroke: 'var(--background)',
            strokeWidth: 1,
          }),
          radialArc(mobileArcs, {
            id: 'mobile-slices',
            key: 'browser',
            innerRadius: 70,
            outerRadius: 90,
            color: 'browser',
            stroke: 'var(--background)',
            strokeWidth: 1,
          }),
        ],
      }),
    ],
    color: { domain: months, range: shadcnColors },
    margin: 0,
  })
}

function buildInteractivePieDefinition() {
  const rows: ShadcnBrowserDatum[] = [
    { browser: 'january', visitors: 186 },
    { browser: 'february', visitors: 305 },
    { browser: 'march', visitors: 237 },
    { browser: 'april', visitors: 173 },
    { browser: 'may', visitors: 209 },
  ]
  const arcs = pie(rows, {
    value: 'visitors',
    startAngle: Math.PI / 2,
    endAngle: (-Math.PI * 3) / 2,
  })
  const active = arcs.filter((row) => row.browser === 'january')
  return defineChart({
    marks: [
      polar({
        radiusRatio: 0.78,
        angle: { scale: scaleLinear().domain([0, Math.PI * 2]) },
        radius: { scale: scaleLinear().domain([0, 1]) },
        marks: [
          radialArc(arcs, {
            id: 'month-slices',
            key: 'browser',
            innerRadius: 60,
            color: 'browser',
            stroke: 'var(--background)',
            strokeWidth: 1,
          }),
          radialArc(active, {
            id: 'active-month',
            key: 'browser',
            innerRadius: 60,
            outerRadius: ({ radius }) => radius + 10,
            fill: shadcnColors[0],
            stroke: 'var(--background)',
            strokeWidth: 5,
          }),
          radialArc(active, {
            id: 'active-month-ring',
            key: 'browser',
            innerRadius: ({ radius }) => radius + 12,
            outerRadius: ({ radius }) => radius + 25,
            fill: shadcnColors[0],
            stroke: 'var(--background)',
            strokeWidth: 3,
          }),
          radialText([{ id: 'total', angle: 0, radius: 0, text: '186' }], {
            id: 'active-total',
            angle: 'angle',
            radius: 'radius',
            key: 'id',
            text: 'text',
            dy: -5,
            fill: 'var(--foreground)',
            fontSize: 30,
            fontWeight: 700,
          }),
          radialText([{ id: 'label', angle: 0, radius: 0, text: 'Visitors' }], {
            id: 'active-label',
            angle: 'angle',
            radius: 'radius',
            key: 'id',
            text: 'text',
            dy: 20,
            fill: 'var(--muted-foreground)',
            fontSize: 12,
          }),
        ],
      }),
    ],
    color: {
      domain: rows.map((row) => row.browser),
      range: shadcnColors,
    },
    margin: 0,
  })
}

function buildRadarDefinition(spec: ShadcnCatalogSpec) {
  const circle = spec.variant.includes('circle')
  const noGrid = spec.variant === 'grid-none'
  const noSpokes =
    spec.variant === 'grid-circle-no-lines' ||
    spec.variant === 'grid-custom' ||
    spec.variant === 'lines-only' ||
    noGrid
  const multiple =
    spec.variant === 'multiple' ||
    spec.variant === 'legend' ||
    spec.variant === 'icons' ||
    spec.variant === 'label-custom' ||
    spec.variant === 'radius' ||
    spec.variant === 'lines-only'
  const filledGrid = spec.variant.includes('fill')
  const rows =
    spec.variant === 'lines-only'
      ? shadcnRadarLines
      : filledGrid
        ? shadcnRadarFilled
        : spec.variant === 'grid-circle-no-lines'
          ? shadcnRadarDefault.map((row) =>
              row.month === 'April' ? { ...row, desktop: 203 } : row,
            )
          : multiple
            ? shadcnRadarMultiple
            : shadcnRadarDefault
  const months = rows.map((row) => row.month)
  const radiusMax = spec.variant === 'lines-only' ? 220 : filledGrid ? 300 : 320
  const gridValues = Array.from({ length: 4 }, (_, index) =>
    Math.round((radiusMax * (index + 1)) / 4),
  )
  const customLabels = spec.variant === 'label-custom'
  const radiusAxis = spec.variant === 'radius'
  const dots =
    spec.variant === 'dots' ||
    spec.variant === 'grid-circle' ||
    spec.variant === 'grid-circle-no-lines' ||
    noGrid
  const guides = [
    ...(!noGrid
      ? [
          radialGrid({
            values:
              spec.variant === 'grid-custom'
                ? [Math.round(radiusMax * 0.947)]
                : radiusAxis
                  ? [0, 80, 160, 240, 320]
                  : gridValues,
            shape: circle ? 'circle' : 'polygon',
            stroke: filledGrid ? 'transparent' : 'var(--border)',
            strokeOpacity: filledGrid ? 0 : 1,
            ...(filledGrid ? { fill: shadcnColors[0], fillOpacity: 0.2 } : {}),
            ...(radiusAxis
              ? {
                  labels: true,
                  labelAngle: Math.PI / 6,
                  labelFill: 'var(--foreground)',
                  labelFontSize: 12,
                  labelRotate: 30,
                  labelOffset: 1,
                }
              : {}),
          }),
        ]
      : []),
    ...(!radiusAxis
      ? [
          angleGrid({
            values: months,
            labels: !customLabels,
            labelOffset: 10,
            labelFill: 'var(--muted-foreground)',
            labelFontSize: 12,
            stroke: noSpokes || filledGrid ? 'transparent' : 'var(--border)',
            strokeOpacity: filledGrid ? 0 : 1,
          }),
        ]
      : []),
  ]
  const chartSpec = (radiusRatio: number) => ({
    marks: [
      polar({
        radiusRatio,
        angle: { scale: scalePoint<string>().domain(months), wrap: true },
        radius: { scale: scaleLinear().domain([0, radiusMax]) },
        guides,
        marks: [
          radialArea(rows, {
            id: 'desktop-radar',
            className: 'ts-chart__radar',
            angle: 'month',
            radius: 'desktop',
            key: 'month',
            curve: curveLinearClosed,
            fill: shadcnColors[0],
            fillOpacity:
              spec.variant === 'lines-only' ? 0 : filledGrid ? 0.5 : 0.6,
            stroke: shadcnColors[0],
            strokeOpacity: filledGrid ? 0 : 1,
            strokeWidth: spec.variant === 'lines-only' ? 2 : 1,
          }),
          ...(multiple
            ? [
                radialArea(rows, {
                  id: 'mobile-radar',
                  className: 'ts-chart__radar',
                  angle: 'month',
                  radius: 'mobile',
                  key: 'month',
                  curve: curveLinearClosed,
                  fill: shadcnColors[1],
                  fillOpacity: spec.variant === 'lines-only' ? 0 : 1,
                  stroke: shadcnColors[1],
                  strokeWidth: spec.variant === 'lines-only' ? 2 : 1,
                }),
              ]
            : []),
          ...(dots
            ? [
                radialDot(rows, {
                  id: 'radar-dots',
                  angle: 'month',
                  radius: 'desktop',
                  key: 'month',
                  r: 4,
                  fill: shadcnColors[0],
                }),
              ]
            : []),
          ...(customLabels
            ? [
                radialText(rows, {
                  id: 'radar-values',
                  angle: 'month',
                  radius: () => radiusMax,
                  key: 'month',
                  text: (row) => `${row.desktop}/${row.mobile ?? 0}`,
                  anchor: 'outside',
                  radiusOffset: 15,
                  dy: -7,
                  fill: 'var(--foreground)',
                  fontSize: 12,
                  fontWeight: 500,
                }),
                radialText(rows, {
                  id: 'radar-months',
                  angle: 'month',
                  radius: () => radiusMax,
                  key: 'month',
                  text: 'month',
                  anchor: 'outside',
                  radiusOffset: 15,
                  dy: 10,
                  fill: 'var(--muted-foreground)',
                  fontSize: 12,
                }),
              ]
            : []),
        ],
      }),
    ],
    color: { domain: twoSeries, range: shadcnColors.slice(0, 2) },
    margin: 0,
  })
  return customLabels
    ? defineChart(({ height }) => chartSpec(height < 220 ? 0.64 : 0.76))
    : defineChart(chartSpec(0.76))
}

function buildRadialDefinition(spec: ShadcnCatalogSpec) {
  if (spec.variant === 'stacked') return buildStackedRadialDefinition()
  if (spec.variant === 'shape') {
    return buildSingleRadialDefinition({
      id: 'shape',
      visitors: 1_260,
      endDegrees: 100,
      innerRadius: 65,
      outerRadius: 95,
      backgroundInnerRadius: 74,
      backgroundOuterRadius: 86,
      cornerRadius: 0,
      total: '1,260',
    })
  }
  if (spec.variant === 'text') {
    return buildSingleRadialDefinition({
      id: 'text',
      visitors: 200,
      endDegrees: 250,
      innerRadius: 80,
      outerRadius: 90,
      backgroundInnerRadius: 80,
      backgroundOuterRadius: 90,
      cornerRadius: 10,
      total: '200',
    })
  }

  const label = spec.variant === 'label'
  const grid = spec.variant === 'grid'
  const startAngle = rechartsPolarAngle(label ? -90 : 0)
  const endAngle = rechartsPolarAngle(label ? 380 : 360)
  const backgroundRows = shadcnBrowsers.map((row) => ({
    ...row,
    background: 300,
  }))
  const chartSpec = (radiusFactor: number) => ({
    marks: [
      polar({
        radiusRatio: grid ? 0.8 : 1,
        startAngle,
        endAngle,
        angle: { scale: scaleLinear().domain([0, 300]) },
        radius: {
          scale: scaleBand<string>().domain(browserNames).paddingInner(0.2),
          range: [
            30 * radiusFactor,
            (label ? 110 : grid ? 100 : 110) * radiusFactor,
          ],
        },
        guides: grid
          ? [
              radialGrid({
                values: browserNames,
                shape: 'circle',
                stroke: 'var(--border)',
              }),
              angleGrid({
                values: Array.from({ length: 12 }, (_, index) => index * 25),
                labels: false,
                stroke: 'var(--border)',
              }),
            ]
          : [],
        marks: [
          ...(!grid
            ? [
                radialBarAngle(backgroundRows, {
                  id: 'radial-backgrounds',
                  angle: 'background',
                  radius: 'browser',
                  key: 'browser',
                  fill: 'var(--muted)',
                }),
              ]
            : []),
          radialBarAngle(shadcnBrowsers, {
            id: 'radial-values',
            angle: 'visitors',
            radius: 'browser',
            key: 'browser',
            fill: (row) => shadcnColors[browserNames.indexOf(row.browser)]!,
          }),
        ],
      }),
      ...(label
        ? [
            polar({
              startAngle,
              endAngle,
              angle: { scale: scaleLinear().domain([0, 300]) },
              radius: {
                scale: scaleLinear().domain([0, 110]),
                range: [0, 110 * radiusFactor],
              },
              marks: [
                radialText(
                  shadcnBrowsers.map((row, index) => ({
                    ...row,
                    angle: 10,
                    labelRadius: 38 + index * 16,
                  })),
                  {
                    id: 'radial-labels',
                    angle: 'angle',
                    radius: 'labelRadius',
                    key: 'browser',
                    text: (row) => titleCase(row.browser),
                    fill: 'white',
                    fontSize: 11,
                    rotate: -25,
                  },
                ),
              ],
            }),
          ]
        : []),
    ],
    color: { domain: browserNames, range: shadcnColors },
    margin: 0,
  })
  return label
    ? defineChart(({ height }) => chartSpec(height < 220 ? 0.8 : 1))
    : defineChart(chartSpec(1))
}

function buildSingleRadialDefinition(options: {
  id: string
  visitors: number
  endDegrees: number
  innerRadius: number
  outerRadius: number
  backgroundInnerRadius: number
  backgroundOuterRadius: number
  cornerRadius: number
  total: string
}) {
  const rows = [
    { browser: 'safari', visitors: options.visitors, ring: 'visitors' },
  ]
  const background = pie([{ id: 'background', value: 1 }], { value: 'value' })
  return defineChart({
    marks: [
      polar({
        marks: [
          radialArc(background, {
            id: `${options.id}-background`,
            key: 'id',
            innerRadius: options.backgroundInnerRadius,
            outerRadius: options.backgroundOuterRadius,
            fill: 'var(--muted)',
          }),
        ],
      }),
      polar({
        startAngle: rechartsPolarAngle(0),
        endAngle: rechartsPolarAngle(options.endDegrees),
        angle: { scale: scaleLinear().domain([0, options.visitors]) },
        radius: {
          scale: scaleBand<string>().domain(['visitors']),
          range: [options.innerRadius, options.outerRadius],
        },
        marks: [
          radialBarAngle(rows, {
            id: `${options.id}-value`,
            angle: 'visitors',
            radius: 'ring',
            key: 'browser',
            fill: shadcnColors[1],
            cornerRadius: options.cornerRadius,
          }),
        ],
      }),
      radialCenterLabels(options.total, 36, 0, 24),
    ],
    margin: 0,
  })
}

function buildStackedRadialDefinition() {
  const rows = [
    {
      id: 'mobile',
      ring: 'visitors',
      start: 0,
      end: 570,
      fill: shadcnColors[1],
    },
    {
      id: 'desktop',
      ring: 'visitors',
      start: 570,
      end: 1_260,
      fill: shadcnColors[0],
    },
  ]
  return defineChart({
    marks: [
      polar({
        startAngle: rechartsPolarAngle(0),
        endAngle: rechartsPolarAngle(180),
        angle: { scale: scaleLinear().domain([0, 1_260]) },
        radius: {
          scale: scaleBand<string>().domain(['visitors']),
          range: [80, 110],
        },
        marks: [
          radialBarAngle(rows, {
            id: 'stacked-values',
            angle1: 'start',
            angle2: 'end',
            angle: 'end',
            radius: 'ring',
            key: 'id',
            fill: (row) => row.fill,
            cornerRadius: 5,
            stroke: 'transparent',
            strokeWidth: 2,
          }),
        ],
      }),
      radialCenterLabels('1,830', 24, -16, 4),
    ],
    color: { domain: twoSeries, range: shadcnColors.slice(0, 2) },
    margin: 0,
  })
}

function radialCenterLabels(
  total: string,
  fontSize: number,
  totalDy: number,
  labelDy: number,
) {
  return polar({
    angle: { scale: scaleLinear().domain([0, 1]) },
    radius: { scale: scaleLinear().domain([0, 1]) },
    marks: [
      radialText([{ id: 'total', angle: 0, radius: 0, text: total }], {
        id: `radial-total-${total}`,
        angle: 'angle',
        radius: 'radius',
        key: 'id',
        text: 'text',
        dy: totalDy,
        fill: 'var(--foreground)',
        fontSize,
        fontWeight: 700,
      }),
      radialText([{ id: 'label', angle: 0, radius: 0, text: 'Visitors' }], {
        id: `radial-label-${total}`,
        angle: 'angle',
        radius: 'radius',
        key: 'id',
        text: 'text',
        dy: labelDy,
        fill: 'var(--muted-foreground)',
        fontSize: 14,
      }),
    ],
  })
}

function rechartsPolarAngle(degrees: number) {
  return ((90 - degrees) * Math.PI) / 180
}

function buildTooltipDefinition() {
  return defineChart({
    marks: [
      barY(shadcnActivities, {
        id: 'activity-bars',
        x: 'date',
        y: 'value',
        z: 'activity',
        color: 'activity',
        key: (row) => `${row.date}:${row.activity}`,
        layout: stack({ order: activityNames }),
        radius: 4,
      }),
    ],
    x: {
      scale: () => scaleBand<string>().paddingInner(0.2).paddingOuter(0.1),
      axis: {
        line: false,
        ticks: { size: 0, padding: 10, format: formatWeekday },
      },
    },
    y: { scale: scaleLinear().domain([0, 1_000]), axis: false },
    color: { domain: activityNames, range: shadcnColors.slice(0, 2) },
    margin: { top: 0, right: 7, bottom: 32, left: 7 },
    theme: shadcnTheme(),
  })
}

function ShadcnLegend({ spec }: { spec: ShadcnCatalogSpec }) {
  const labels =
    spec.family === 'pie' || spec.family === 'radial' ? browserNames : twoSeries
  const items = labels.map((label, index) => (
    <span className="sc-legend-item" key={label}>
      {spec.variant === 'icons' ? (
        <svg className="sc-legend-icon" viewBox="0 0 24 24" aria-hidden>
          <path
            d={
              index === 0
                ? 'M12 3v18m-4-4 4 4 4-4M5 7h14'
                : 'M12 21V3m-4 4 4-4 4 4M5 17h14'
            }
          />
        </svg>
      ) : (
        <span
          className="sc-legend-dot"
          style={{ background: shadcnColors[index] }}
        />
      )}
      {label.charAt(0).toUpperCase() + label.slice(1)}
    </span>
  ))
  return spec.family === 'pie' && spec.variant === 'legend' ? (
    <div className="sc-pie-legend">{items}</div>
  ) : (
    <>{items}</>
  )
}

function ShadcnTooltipBody({
  variant,
  points,
}: {
  variant: string
  points: readonly ChartPoint<ShadcnActivityDatum>[]
}) {
  const ordered = [...points].sort(
    (left, right) =>
      activityNames.indexOf(left.datum.activity) -
      activityNames.indexOf(right.datum.activity),
  )
  const noLabel =
    variant === 'label-none' ||
    variant === 'formatter' ||
    variant === 'icons' ||
    variant === 'advanced'
  const noIndicator =
    variant === 'indicator-none' ||
    variant === 'label-none' ||
    variant === 'formatter' ||
    variant === 'icons'
  const lineIndicator = variant === 'indicator-line'
  const formatted = variant === 'formatter' || variant === 'advanced'
  const label =
    variant === 'label-formatter'
      ? 'July 15, 2024'
      : variant === 'label-custom'
        ? 'Activities'
        : '2024-07-16'
  return (
    <div
      className={`sc-shadcn-tooltip${variant === 'advanced' ? ' sc-advanced-tooltip' : ''}${noIndicator ? ' sc-tooltip-no-indicator' : ''}`}
    >
      {noLabel ? null : <strong className="sc-tooltip-label">{label}</strong>}
      {ordered.map((point, index) => (
        <div className="sc-shadcn-tooltip-row" key={point.datum.activity}>
          {variant === 'icons' ? (
            <ShadcnActivityIcon activity={point.datum.activity} />
          ) : noIndicator ? null : (
            <span
              className={lineIndicator ? 'sc-tooltip-line' : 'sc-tooltip-dot'}
              style={{ background: shadcnColors[index] }}
            />
          )}
          <span>{titleCase(point.datum.activity)}</span>
          <b className="sc-tooltip-value">
            {point.datum.value}
            {formatted ? <span>kcal</span> : null}
          </b>
        </div>
      ))}
      {variant === 'advanced' ? (
        <div className="sc-tooltip-total">
          <span>Total</span>
          <b className="sc-tooltip-value">
            {ordered.reduce((total, point) => total + point.datum.value, 0)}
            <span>kcal</span>
          </b>
        </div>
      ) : null}
    </div>
  )
}

function ShadcnActivityIcon({ activity }: { activity: string }) {
  return (
    <svg className="sc-tooltip-icon" viewBox="0 0 24 24" aria-hidden>
      {activity === 'running' ? (
        <>
          <path d="M4 17c3-1 4-4 4-7l3 2 2-4 3 1" />
          <path d="m9 13 4 5M14 5h.01" />
        </>
      ) : (
        <>
          <path d="M2 16c2-2 4 2 6 0s4 2 6 0 4 2 8 0" />
          <path d="M2 20c2-2 4 2 6 0s4 2 6 0 4 2 8 0M5 12l3-3 4 3 3-4 4 4" />
        </>
      )}
    </svg>
  )
}

function ShadcnSelectDisplay({
  label,
  swatch,
}: {
  label: string
  swatch?: string
}) {
  return (
    <div className="sc-select-display">
      {swatch ? (
        <span className="sc-select-swatch" style={{ background: swatch }} />
      ) : null}
      <span>{label}</span>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="m6 9 6 6 6-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    </div>
  )
}

function ShadcnBarMetrics() {
  return (
    <>
      <div className="sc-bar-metric">
        <span>Desktop</span>
        <strong>24,828</strong>
      </div>
      <div className="sc-bar-metric">
        <span>Mobile</span>
        <strong>25,010</strong>
      </div>
    </>
  )
}

function shadcnXAxis() {
  return {
    scale: () => scaleBand<string>().paddingInner(0.2).paddingOuter(0.1),
    axis: {
      line: false,
      ticks: {
        size: 0,
        padding: 10,
        format: (value: string) => value.slice(0, 3),
      },
    },
  }
}

function shadcnPointXAxis() {
  return {
    scale: scalePoint,
    axis: {
      line: false,
      ticks: {
        size: 0,
        padding: 10,
        format: (value: string) => value.slice(0, 3),
      },
    },
  }
}

function shadcnBrowserXAxis() {
  return {
    scale: () => scaleBand<string>().paddingInner(0.2).paddingOuter(0.1),
    axis: {
      line: false,
      ticks: {
        size: 0,
        padding: 10,
        format: titleCase,
      },
    },
  }
}

function shadcnBrowserYAxis() {
  return {
    scale: () => scaleBand<string>().paddingInner(0.18).paddingOuter(0.08),
    axis: {
      line: false,
      ticks: { size: 0, padding: 10, format: titleCase },
    },
  }
}

function shadcnTheme() {
  return {
    foreground: 'var(--muted-foreground, var(--muted))',
    grid: 'var(--border)',
    background: 'transparent',
  }
}

function formatWeekday(value: string) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(
    new Date(value),
  )
}

function formatMonthDay(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value))
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
