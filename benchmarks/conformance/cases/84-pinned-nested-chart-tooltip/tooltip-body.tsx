import type { ReactNode } from 'react'
import { energyColors, formatEnergy, formatPercent } from './model'
import type { ChartTooltipContent } from '@tanstack/charts'
import type { EnergyMonth } from './model'

interface EnergyTooltipBodyProps {
  readonly month: EnergyMonth
  readonly summary: ReactNode
  readonly pinned: boolean
  readonly dismiss: () => void
  readonly consumptionChart: ReactNode
}

export function EnergyTooltipBody({
  month,
  summary,
  pinned,
  dismiss,
  consumptionChart,
}: EnergyTooltipBodyProps) {
  const usedShare = month.usedOnSite / month.generation
  const exportedShare = month.exported / month.generation

  return (
    <div className="energy-tooltip" data-expanded={String(pinned)}>
      <div className="energy-tooltip__summary">
        {summary}
        {pinned ? (
          <button
            className="energy-tooltip__close"
            type="button"
            data-energy-tooltip-close
            aria-label="Close energy details"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={dismiss}
          >
            ×
          </button>
        ) : null}
      </div>
      <div className="energy-tooltip__reveal" aria-hidden={!pinned}>
        <div className="energy-tooltip__reveal-inner">
          <div className="energy-tooltip__details">
            <section aria-label="Consumption mix">
              <h3>Consumption mix</h3>
              <div className="energy-tooltip__mini-chart">
                {consumptionChart}
              </div>
              <DetailRow
                color={energyColors.household}
                label="Household"
                value={formatEnergy(month.household)}
              />
              <DetailRow
                color={energyColors.heatPump}
                label="Heat pump"
                value={formatEnergy(month.heatPump)}
              />
              <DetailRow
                color={energyColors.hotWater}
                label="Hot water"
                value={formatEnergy(month.hotWater)}
              />
              <DetailRow
                color={energyColors.evCharging}
                label="EV charging"
                value={formatEnergy(month.evCharging)}
              />
            </section>

            <section aria-label="Generation use">
              <h3>Generation use</h3>
              <div
                className="energy-tooltip__generation-bar"
                aria-hidden="true"
              >
                <span
                  style={{
                    flex: month.usedOnSite,
                    background: energyColors.generation,
                  }}
                />
                <span
                  style={{
                    flex: month.exported,
                    background: energyColors.exported,
                  }}
                />
              </div>
              <DetailRow
                color={energyColors.generation}
                label="Used on site"
                value={`${formatEnergy(month.usedOnSite)} · ${formatPercent(usedShare)}`}
              />
              <DetailRow
                color={energyColors.exported}
                label="Exported"
                value={`${formatEnergy(month.exported)} · ${formatPercent(exportedShare)}`}
              />
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

export function EnergyTooltipSummary({
  content,
}: {
  readonly content: ChartTooltipContent
}) {
  return (
    <>
      {content.title ? (
        <div className="ts-chart-tooltip__title">{content.title}</div>
      ) : null}
      <div className="ts-chart-tooltip__rows" aria-hidden="true">
        {content.rows.map((row) => (
          <div className="ts-chart-tooltip__row" key={row.label}>
            {row.color ? (
              <span
                className="energy-tooltip__swatch"
                style={{ background: row.color }}
              />
            ) : (
              <span />
            )}
            <span>{row.label}</span>
            <span>{row.value}</span>
          </div>
        ))}
      </div>
    </>
  )
}

function DetailRow({
  color,
  label,
  value,
}: {
  readonly color: string
  readonly label: string
  readonly value: string
}) {
  return (
    <div className="energy-tooltip__detail-row" data-energy-detail-row>
      <span
        className="energy-tooltip__swatch"
        style={{ background: color }}
        aria-hidden="true"
      />
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

export const energyTooltipStyles = `
  .ts-chart-tooltip.energy-tooltip-surface,
  .energy-reference-tooltip {
    box-sizing: border-box;
    width: 304px;
    max-width: calc(100vw - 24px) !important;
    padding: 0 !important;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, CanvasText 14%, transparent) !important;
    border-radius: 15px !important;
    background: color-mix(in srgb, Canvas 96%, CanvasText 4%) !important;
    color: CanvasText !important;
    box-shadow: 0 18px 50px rgb(15 23 42 / 0.18) !important;
    font: 500 12px/1.35 system-ui, sans-serif !important;
  }

  .energy-reference-tooltip {
    position: absolute;
    z-index: 2;
  }

  .energy-tooltip {
    padding: 13px 14px 14px;
  }

  .energy-tooltip__summary {
    position: relative;
    min-width: 0;
    padding-right: 0;
    transition: padding-right 180ms ease;
  }

  .energy-tooltip[data-expanded='true'] .energy-tooltip__summary {
    padding-right: 38px;
  }

  .energy-tooltip .ts-chart-tooltip__title {
    display: flex;
    align-items: center;
    min-height: 18px;
    margin: 0 0 7px;
    color: color-mix(in srgb, CanvasText 70%, transparent);
    font-size: 12px;
    font-weight: 650;
    letter-spacing: 0.01em;
  }

  .energy-tooltip .ts-chart-tooltip__rows {
    display: grid;
    gap: 5px;
  }

  .energy-tooltip .ts-chart-tooltip__row,
  .energy-tooltip__detail-row {
    display: grid !important;
    grid-template-columns: 8px minmax(0, 1fr) auto !important;
    align-items: center !important;
    column-gap: 8px !important;
    font-variant-numeric: tabular-nums;
  }

  .energy-tooltip .ts-chart-tooltip__row > :last-child,
  .energy-tooltip__detail-row > :last-child {
    text-align: right;
    white-space: nowrap;
  }

  .energy-tooltip__swatch {
    display: block;
    width: 8px;
    height: 8px;
    border-radius: 2px;
    box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.08);
  }

  .energy-tooltip__close {
    position: absolute;
    top: -7px;
    right: -8px;
    display: grid;
    width: 36px;
    height: 36px;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: 10px;
    background: transparent;
    color: color-mix(in srgb, CanvasText 62%, transparent);
    cursor: pointer;
    font: 500 20px/1 system-ui, sans-serif;
    pointer-events: auto;
  }

  .energy-tooltip__close:hover,
  .energy-tooltip__close:focus-visible {
    background: color-mix(in srgb, CanvasText 8%, transparent);
    color: CanvasText;
    outline: none;
  }

  .energy-tooltip__close:focus-visible {
    box-shadow: inset 0 0 0 2px #2563eb;
  }

  .energy-tooltip__reveal {
    display: grid;
    grid-template-rows: 0fr;
    opacity: 0;
    transition:
      grid-template-rows 260ms cubic-bezier(0.22, 1, 0.36, 1),
      opacity 160ms ease;
  }

  .energy-tooltip[data-expanded='true'] .energy-tooltip__reveal {
    grid-template-rows: 1fr;
    opacity: 1;
  }

  .energy-tooltip__reveal-inner {
    min-height: 0;
    overflow: hidden;
  }

  .energy-tooltip__details {
    display: grid;
    gap: 14px;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid color-mix(in srgb, CanvasText 10%, transparent);
    transform: translateY(-5px);
    transition: transform 260ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .energy-tooltip[data-expanded='true'] .energy-tooltip__details {
    transform: translateY(0);
  }

  .energy-tooltip__details section {
    display: grid;
    gap: 6px;
  }

  .energy-tooltip__details h3 {
    margin: 0;
    font: 650 11px/1.2 system-ui, sans-serif;
    color: color-mix(in srgb, CanvasText 66%, transparent);
  }

  .energy-tooltip__mini-chart,
  .energy-tooltip__generation-bar {
    width: 100%;
    height: 10px;
    overflow: hidden;
    border-radius: 4px;
    background: color-mix(in srgb, CanvasText 7%, transparent);
  }

  .energy-tooltip__mini-chart svg {
    display: block;
    width: 100%;
    height: 10px;
  }

  .energy-tooltip__generation-bar {
    display: flex;
  }

  .energy-tooltip__detail-row {
    min-height: 16px;
    color: color-mix(in srgb, CanvasText 82%, transparent);
    font-size: 11px;
  }

  @media (prefers-reduced-motion: reduce) {
    .energy-tooltip__summary,
    .energy-tooltip__reveal,
    .energy-tooltip__details {
      transition: none;
    }
  }
`
