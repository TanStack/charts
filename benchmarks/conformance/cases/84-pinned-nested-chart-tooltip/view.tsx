import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import {
  areaY,
  barX,
  barY,
  d3Curve,
  defineChart,
  dot,
  lineY,
} from '@tanstack/charts'
import { Chart as NestedChart } from '@tanstack/react-charts'
import { Chart as TooltipChart } from '@tanstack/react-charts/tooltip'
import { tooltip } from '@tanstack/charts/tooltip'
import { portal } from '@tanstack/charts/tooltip/portal'
import { scaleBand, scaleLinear } from 'd3-scale'
import { curveMonotoneX } from 'd3-shape'
import { reactMount } from '../../shared/react-mount'
import {
  consumptionBreakdown,
  energyColors,
  energyMonths,
  energyTooltipContent,
  isEnergyMonthId,
} from './model'
import { EnergyTooltipBody, energyTooltipStyles } from './tooltip-body'
import type { ChartScene } from '@tanstack/charts'
import type { ConformanceTarget, ConformanceTestDriver } from '../../types'
import type { ReactConformanceProps } from '../../shared/react-mount'
import type { EnergyMonth, EnergyMonthId } from './model'

const EnergyTooltipExample = forwardRef<
  ConformanceTestDriver,
  ReactConformanceProps
>(function EnergyTooltipExample({ input }, ref) {
  const viewRef = useRef<HTMLDivElement>(null)
  const focusedIdRef = useRef<EnergyMonthId | null>(null)
  const renderedRef = useRef<{
    scene: ChartScene<EnergyMonth, string, number>
    svg: SVGSVGElement
  } | null>(null)
  const rows = useMemo(() => energyMonths(input.revision), [input.revision])
  const chartHeight = Math.max(1, input.height - 46)
  const mainDefinition = useMemo(() => energyDefinition(rows), [rows])

  useImperativeHandle(
    ref,
    () => ({
      resolveTarget(target) {
        if (target.anchor === 'tooltip:close') {
          const close =
            viewRef.current?.ownerDocument.querySelector<HTMLElement>(
              '[data-energy-tooltip-close]',
            )
          return close ? center(close) : null
        }
        const monthId = monthFromTarget(target)
        if (!monthId) return null
        return pointCoordinate(renderedRef.current, monthId)
      },
      readState() {
        const document = viewRef.current?.ownerDocument
        const surface = document?.querySelector<HTMLElement>(
          '.ts-chart-tooltip.energy-tooltip-surface',
        )
        const tooltip = surface && !surface.hidden ? surface : null
        const body = tooltip?.querySelector<HTMLElement>('.energy-tooltip')
        const reveal = tooltip?.querySelector<HTMLElement>(
          '.energy-tooltip__reveal',
        )
        return {
          focusedMonth: focusedIdRef.current,
          tooltip: {
            visible: Boolean(tooltip),
            pinned: tooltip?.dataset.sticky === 'true',
            role: tooltip?.getAttribute('role') ?? null,
            inert:
              tooltip
                ?.querySelector('.ts-chart-tooltip__body')
                ?.hasAttribute('inert') ?? false,
            month:
              tooltip
                ?.querySelector('.ts-chart-tooltip__title')
                ?.textContent?.trim() ?? null,
            summaryRowCount:
              tooltip?.querySelectorAll('.ts-chart-tooltip__row').length ?? 0,
            detailRowCount:
              tooltip?.querySelectorAll('[data-energy-detail-row]').length ?? 0,
            detailsExpanded: body?.dataset.expanded === 'true',
            detailHeight: Math.round(
              reveal?.getBoundingClientRect().height ?? 0,
            ),
            nestedBarCount:
              tooltip?.querySelectorAll('.ts-chart__bar rect').length ?? 0,
            closeVisible: Boolean(
              tooltip?.querySelector('[data-energy-tooltip-close]'),
            ),
            text: tooltip?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          },
        }
      },
    }),
    [],
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
        color: 'CanvasText',
      }}
    >
      <style>{energyTooltipStyles}</style>
      <header
        style={{
          display: 'flex',
          minHeight: 40,
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 16,
          padding: '3px 18px 0 52px',
          font: '500 12px/1.3 system-ui, sans-serif',
        }}
      >
        <strong style={{ fontSize: 14, fontWeight: 680 }}>
          Household energy
        </strong>
        <span style={{ opacity: 0.58 }}>2025 · kWh</span>
      </header>
      <TooltipChart
        definition={mainDefinition}
        width={input.width}
        height={chartHeight}
        ariaLabel="Monthly household electricity consumption and solar generation in 2025"
        ariaDescription="Stacked bars show household, heat pump, hot water, and EV consumption. The gold line shows solar generation. Hover or focus a month for totals, then click or press Enter to expand the breakdown."
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
              summary={defaultBody}
              pinned={pinned}
              dismiss={dismiss}
              consumptionChart={<ConsumptionMixChart month={month} />}
            />
          )
        }}
      />
    </div>
  )
})

export const mount = reactMount(EnergyTooltipExample)

function energyDefinition(rows: readonly EnergyMonth[]) {
  const months = rows.map((row) => row.monthShort)
  return defineChart(
    defineChart({
      marks: [
        areaY(rows, {
          id: 'solar-area',
          x: 'monthShort',
          y: 'generation',
          fill: energyColors.generation,
          fillOpacity: 0.12,
          curve: d3Curve(curveMonotoneX),
        }),
        barY(rows, {
          id: 'household',
          x: 'monthShort',
          y1: 'householdStart',
          y2: 'householdEnd',
          fill: energyColors.household,
          inset: 0.8,
        }),
        barY(rows, {
          id: 'heat-pump',
          x: 'monthShort',
          y1: 'heatPumpStart',
          y2: 'heatPumpEnd',
          fill: energyColors.heatPump,
          inset: 0.8,
        }),
        barY(rows, {
          id: 'hot-water',
          x: 'monthShort',
          y1: 'hotWaterStart',
          y2: 'hotWaterEnd',
          fill: energyColors.hotWater,
          inset: 0.8,
        }),
        barY(rows, {
          id: 'ev-charging',
          x: 'monthShort',
          y1: 'evChargingStart',
          y2: 'evChargingEnd',
          fill: energyColors.evCharging,
          inset: 0.8,
          radius: 3,
        }),
        lineY(rows, {
          id: 'generation-line',
          x: 'monthShort',
          y: 'generation',
          stroke: energyColors.generation,
          strokeWidth: 2.5,
          curve: d3Curve(curveMonotoneX),
        }),
        dot(rows, {
          id: 'generation-points',
          x: 'monthShort',
          y: 'generation',
          fill: energyColors.generation,
          stroke: 'Canvas',
          strokeWidth: 1.5,
          r: 3.5,
          states: [
            {
              when: { focus: 'group' },
              style: { r: 5.5, strokeWidth: 2 },
              transition: {
                type: 'tween',
                duration: 150,
                easing: 'ease-out',
              },
            },
            {
              when: { focus: 'primary', pinned: true },
              style: { r: 7, strokeWidth: 3 },
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
          .paddingInner(0.42)
          .paddingOuter(0.14),
        axis: {
          line: false,
          ticks: { size: 0, padding: 9 },
        },
      },
      y: {
        scale: scaleLinear().domain([0, 850]),
        grid: true,
        axis: { ticks: { count: 5 }, label: 'kWh' },
      },
      margin: { top: 16, right: 22, bottom: 38, left: 52 },
    }),
    {
      animate: false,
      keyboard: true,
      focus: 'group-x',
      tooltip: {
        use: tooltip,
        portal,
        className: 'energy-tooltip-surface',
        anchor: 'point',
        placement: ['right', 'left', 'top', 'bottom'],
        offset: 12,
        content: (points, { pinned }) => energyTooltipContent(points, pinned),
      },
    },
  )
}

function ConsumptionMixChart({ month }: { readonly month: EnergyMonth }) {
  const definition = useMemo(() => {
    const parts = consumptionBreakdown(month)
    return defineChart(
      defineChart({
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
      }),
      { animate: false, keyboard: false, tooltip: false },
    )
  }, [month])

  return (
    <NestedChart
      definition={definition}
      width={264}
      height={10}
      ariaLabel={`${month.month} consumption split: household ${month.household} kilowatt-hours, heat pump ${month.heatPump}, hot water ${month.hotWater}, and EV charging ${month.evCharging}`}
    />
  )
}

function monthFromTarget(target: ConformanceTarget) {
  if (target.view !== undefined && target.view !== 'main') return null
  const [kind, id] = target.anchor.split(':')
  return kind === 'month' && isEnergyMonthId(id) ? id : null
}

function pointCoordinate(
  rendered: {
    scene: ChartScene<EnergyMonth, string, number>
    svg: SVGSVGElement
  } | null,
  id: EnergyMonthId,
) {
  if (!rendered) return null
  const point = rendered.scene.points.find(
    (candidate) =>
      candidate.markId === 'generation-points' && candidate.datum.id === id,
  )
  if (!point) return null
  const bounds = rendered.svg.getBoundingClientRect()
  return {
    x: bounds.left + (point.x / rendered.scene.width) * bounds.width,
    y: bounds.top + (point.y / rendered.scene.height) * bounds.height,
    focusElement: rendered.svg,
  }
}

function center(element: HTMLElement | SVGElement) {
  const bounds = element.getBoundingClientRect()
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
    focusElement: element,
  }
}
