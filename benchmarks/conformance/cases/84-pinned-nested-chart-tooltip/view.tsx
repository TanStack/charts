import { energyDefinition, ConsumptionMixChart, AnnualMetric } from './example'
import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import { renderChartSvgWithResources } from '@tanstack/charts/svg/resources'
import { Chart as TooltipChart } from '@tanstack/charts/react/tooltip'
import { tooltip } from '@tanstack/charts/tooltip'
import { catalogPreviewDefinition } from '../../shared/preview'
import { reactMount } from '../../shared/react-mount'
import {
  energyAnnualOverview,
  energyMonths,
  formatEnergy,
  monthFromTarget,
} from './model'
import { EnergyTooltipBody, energyTooltipStyles } from './tooltip-body'
import type { ChartScene } from '@tanstack/charts'
import type { ConformanceTestDriver } from '../../types'
import type { ReactConformanceProps } from '../../shared/react-mount'
import type { EnergyMonth, EnergyMonthId } from './model'

const EnergyTooltipExample = forwardRef<
  ConformanceTestDriver,
  ReactConformanceProps
>(function EnergyTooltipExample({ input, idPrefix }, ref) {
  const viewRef = useRef<HTMLDivElement>(null)
  const focusedIdRef = useRef<EnergyMonthId | null>(null)
  const previewPinnedRevisionRef = useRef<number | null>(null)
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

  if (input.preview) {
    return (
      <TooltipChart
        idPrefix={idPrefix ? `${idPrefix}-main` : undefined}
        definition={catalogPreviewDefinition(mainDefinition)}
        initialWidth={input.width}
        aspectRatio={input.width / input.height}
        renderSvg={renderChartSvgWithResources}
        ariaLabel="Annual household energy overview"
        ariaDescription="A gray area tracks monthly electricity consumption. Stacked gold bars show solar energy used on site and exported."
        onRender={({ scene, interaction }) => {
          if (previewPinnedRevisionRef.current === input.revision) return
          const point = scene.points.find(
            (candidate) =>
              candidate.markId === 'consumption-points' &&
              candidate.datum.id === 'jun',
          )
          if (!point) return
          previewPinnedRevisionRef.current = input.revision
          interaction.setControlledFocus(point, {
            source: 'programmatic',
            pinned: true,
          })
        }}
        renderTooltipBody={({ points }) => {
          const month = points[0]?.datum
          return month ? (
            <ConsumptionMixChart
              month={month}
              idPrefix={idPrefix ? `${idPrefix}-nested` : undefined}
              catalogPreview
            />
          ) : null
        }}
      />
    )
  }

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
})

export const catalogComponent = EnergyTooltipExample
export const mount = reactMount(EnergyTooltipExample)

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
      candidate.markId === 'consumption-points' && candidate.datum.id === id,
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
