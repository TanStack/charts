import { useMemo, useRef } from 'react'
import {
  areaY,
  barX,
  barY,
  d3Curve,
  defineChart,
  dot,
  lineY,
  ruleX,
  tickY,
  whenFocused,
} from '@tanstack/charts'
import { renderChartSvgWithResources } from '@tanstack/charts/svg/resources'
import { Chart as NestedChart } from '@tanstack/charts/react'
import { Chart as TooltipChart } from '@tanstack/charts/react/tooltip'
import { tooltip } from '@tanstack/charts/tooltip'
import { scaleBand, scaleLinear } from 'd3-scale'
import { curveMonotoneX } from 'd3-shape'
import {
  consumptionBreakdown,
  energyAnnualOverview,
  energyColors,
  energyMonths,
  energyTooltipContent,
  formatEnergy,
} from './model'
import { EnergyTooltipBody, energyTooltipStyles } from './tooltip-body'
import type { ChartScene } from '@tanstack/charts'
import type { EnergyMonth, EnergyMonthId } from './model'

export function energyDefinition(
  rows: readonly EnergyMonth[],
  chartWidth: number,
) {
  const months = rows.map((row) => row.monthShort)
  const tooltipPlacement =
    chartWidth >= 500
      ? ('right' as const)
      : (['right', 'left', 'top', 'bottom'] as const)
  return defineChart(
    {
      marks: [
        areaY(rows, {
          id: 'consumption-area',
          x: 'monthShort',
          y: 'consumption',
          fill: energyColors.consumption,
          fillOpacity: 0.13,
          curve: d3Curve(curveMonotoneX),
        }),
        barY(rows, {
          id: 'used-on-site',
          x: 'monthShort',
          y: 'usedOnSite',
          fill: energyColors.generationMuted,
          inset: 0.5,
          states: [
            {
              when: { focus: 'group' },
              style: { fill: energyColors.generation },
              transition: {
                type: 'tween',
                duration: 120,
                easing: 'ease-out',
              },
            },
          ],
        }),
        barY(rows, {
          id: 'exported',
          x: 'monthShort',
          y1: 'usedOnSite',
          y2: 'generation',
          fill: 'url(#energy-exported-hatch)',
          inset: 0.5,
          radius: 3,
        }),
        lineY(rows, {
          id: 'consumption-line',
          x: 'monthShort',
          y: 'consumption',
          stroke: energyColors.consumption,
          strokeWidth: 1.6,
          curve: d3Curve(curveMonotoneX),
        }),
        whenFocused(
          ruleX(rows, {
            id: 'focused-month-guide',
            x: 'monthShort',
            stroke: 'CanvasText',
            strokeOpacity: 0.45,
            strokeWidth: 1,
            strokeDasharray: '4 4',
          }),
          { match: 'x' },
        ),
        whenFocused(
          tickY(rows, {
            id: 'focused-month-axis-marker',
            x: 'monthShort',
            y: () => 0,
            stroke: 'CanvasText',
            strokeWidth: 1.5,
          }),
          { match: 'x' },
        ),
        dot(rows, {
          id: 'consumption-points',
          x: 'monthShort',
          y: 'consumption',
          fill: 'Canvas',
          fillOpacity: 0,
          stroke: energyColors.consumption,
          strokeOpacity: 0,
          strokeWidth: 1.4,
          r: 4,
          states: [
            {
              when: { focus: 'group' },
              style: {
                r: 4,
                fillOpacity: 1,
                strokeOpacity: 1,
                strokeWidth: 1.8,
              },
              transition: {
                type: 'tween',
                duration: 150,
                easing: 'ease-out',
              },
            },
            {
              when: { focus: 'primary', pinned: true },
              style: {
                r: 4.5,
                fillOpacity: 1,
                strokeOpacity: 1,
                strokeWidth: 2,
              },
              transition: {
                type: 'tween',
                duration: 180,
                easing: 'ease-out',
              },
            },
          ],
        }),
      ],
      x: {
        scale: scaleBand<string>()
          .domain(months)
          .paddingInner(0.16)
          .paddingOuter(0.06),
        axis: {
          line: false,
          ticks: { size: 0, padding: 8 },
        },
      },
      y: {
        scale: scaleLinear().domain([0, 2600]),
        grid: true,
        axis: {
          line: false,
          ticks: {
            values: [0, 650, 1300, 1950, 2600],
            size: 0,
            padding: 7,
            format: (value) => `${value.toLocaleString('en-US')} kWh`,
          },
        },
      },
      margin: { top: 82, right: 24, bottom: 38, left: 72 },
      gradients: [
        {
          id: 'energy-exported-hatch',
          x1: 0,
          y1: 0,
          x2: 1,
          y2: 1,
          stops: exportedHatchStops,
        },
      ],
    },
    {
      svgAnimation: false,
      keyboard: true,
      focus: 'group-x',
      focusRing: false,
      tooltip: {
        use: tooltip,
        className: 'energy-tooltip-surface',
        anchor: 'point',
        placement: tooltipPlacement,
        offset: 12,
        content: (points, { pinned }) => energyTooltipContent(points, pinned),
      },
    },
  )
}

export function ConsumptionMixChart({
  month,
  idPrefix,
  catalogPreview = false,
}: {
  readonly month: EnergyMonth
  readonly idPrefix?: string
  readonly catalogPreview?: boolean
}) {
  const definition = useMemo(() => {
    const parts = consumptionBreakdown(month)
    return defineChart(
      {
        marks: [
          barX(parts, {
            id: 'consumption-breakdown',
            x1: 'start',
            x2: 'end',
            y: () => 'mix',
            fill: (part) => part.color,
            inset: 0,
          }),
        ],
        x: {
          scale: scaleLinear().domain([0, month.consumption]),
          axis: false,
        },
        y: {
          scale: scaleBand<string>().domain(['mix']),
          axis: false,
        },
        margin: 0,
      },
      { svgAnimation: false, keyboard: false, tooltip: false },
    )
  }, [month])

  return (
    <NestedChart
      idPrefix={idPrefix}
      className={catalogPreview ? 'energy-catalog-preview-nested' : undefined}
      definition={definition}
      width={264}
      height={10}
      ariaLabel={`${month.month} consumption split: household ${month.household} kilowatt-hours, heat pump ${month.heatPump}, hot water ${month.hotWater}, and EV charging ${month.evCharging}`}
    />
  )
}

export function AnnualMetric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  const [amount, unit] = value.split(' ')
  return (
    <div style={{ display: 'grid', gap: 3 }}>
      <span
        style={{ color: 'color-mix(in srgb, CanvasText 55%, transparent)' }}
      >
        {label}
      </span>
      <strong
        style={{ fontSize: 19, fontWeight: 680, letterSpacing: '-0.02em' }}
      >
        {amount}{' '}
        <span style={{ fontSize: 11, fontWeight: 620, letterSpacing: 0 }}>
          {unit}
        </span>
      </strong>
    </div>
  )
}

export const exportedHatchStops = Array.from({ length: 14 }, (_, index) => {
  const start = index / 14
  const lineStart = (index + 0.82) / 14
  const end = (index + 1) / 14
  return [
    { offset: start, color: energyColors.exported },
    { offset: lineStart, color: energyColors.exported },
    { offset: lineStart, color: '#fff7e8' },
    { offset: end, color: '#fff7e8' },
  ]
}).flat()

export interface ExampleProps {
  width?: number
  height?: number
  revision?: number
}

export default function EnergyTooltipExample({
  width = 640,
  height = 480,
  revision = 0,
}: ExampleProps = {}) {
  const input = { width, height, revision, preview: false, interactive: true }
  const idPrefix = '84-pinned-nested-chart-tooltip'
  const viewRef = useRef<HTMLDivElement>(null)

  const focusedIdRef = useRef<EnergyMonthId | null>(null)

  const renderedRef = useRef<{
    scene: ChartScene<EnergyMonth, string, number>
    svg: SVGSVGElement
  } | null>(null)

  const rows = useMemo(() => energyMonths(input.revision), [input.revision])

  const chartWidth = Math.max(1, input.width - 24)

  const chartHeight = Math.max(1, input.height - 48)

  const annualConsumption = rows.reduce(
    (total, month) => total + month.consumption,
    0,
  )

  const mainDefinition = useMemo(
    () => energyDefinition(rows, chartWidth),
    [chartWidth, rows],
  )

  return (
    <div
      ref={viewRef}
      data-conformance-view="main"
      role="region"
      aria-label="Monthly household energy with an expanding pinned tooltip"
      style={{
        position: 'relative',
        width: input.width,
        height: input.height,
        paddingTop: 4,
        background: 'Canvas',
        color: 'CanvasText',
        boxSizing: 'border-box',
      }}
    >
      <style>{energyTooltipStyles}</style>
      <header
        style={{
          display: 'flex',
          height: 36,
          alignItems: 'center',
          padding: '0 24px',
          font: '500 12px/1.3 system-ui, sans-serif',
        }}
      >
        <strong style={{ fontSize: 13, fontWeight: 680 }}>
          Annual overview
        </strong>
      </header>
      <div
        className="energy-overview-card"
        style={{
          position: 'relative',
          width: chartWidth,
          height: chartHeight,
          margin: '0 12px',
          border: '1px solid color-mix(in srgb, CanvasText 8%, transparent)',
          borderRadius: 7,
          boxSizing: 'border-box',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            zIndex: 1,
            top: 14,
            left: 16,
            display: 'flex',
            gap: 26,
            pointerEvents: 'none',
            font: '500 11px/1.2 system-ui, sans-serif',
          }}
        >
          <AnnualMetric
            label="Energy generated"
            value={formatEnergy(energyAnnualOverview.generation)}
          />
          <AnnualMetric
            label="Total consumption"
            value={formatEnergy(annualConsumption)}
          />
        </div>
        <TooltipChart
          idPrefix={idPrefix ? `${idPrefix}-main` : undefined}
          definition={mainDefinition}
          initialWidth={chartWidth}
          height={chartHeight}
          renderSvg={renderChartSvgWithResources}
          ariaLabel="Annual household energy overview"
          ariaDescription="A gray area tracks monthly electricity consumption. Stacked gold bars show solar energy used on site and exported. Hover or focus a month for totals, then click or press Enter to expand the breakdown."
          onFocusGroupChange={(points) => {
            focusedIdRef.current = points[0]?.datum.id ?? null
          }}
          onRender={({ scene, svg }) => {
            renderedRef.current = { scene, svg }
          }}
          renderTooltipBody={({ points, defaultBody, pinned, dismiss }) => {
            const month = points[0]?.datum
            if (!month) return defaultBody
            return (
              <EnergyTooltipBody
                month={month}
                pinned={pinned}
                dismiss={dismiss}
                consumptionChart={
                  <ConsumptionMixChart
                    month={month}
                    idPrefix={idPrefix ? `${idPrefix}-nested` : undefined}
                  />
                }
              />
            )
          }}
        />
      </div>
    </div>
  )
}
