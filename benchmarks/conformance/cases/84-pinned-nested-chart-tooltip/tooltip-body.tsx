import type { ReactNode } from 'react'
import {
  consumptionBreakdown,
  energyColors,
  formatEnergy,
  formatPercent,
} from './model'
import type { EnergyMonth } from './model'

interface EnergyTooltipBodyProps {
  readonly month: EnergyMonth
  readonly pinned: boolean
  readonly dismiss: () => void
  readonly consumptionChart: ReactNode
}

export function EnergyTooltipBody({
  month,
  pinned,
  dismiss,
  consumptionChart,
}: EnergyTooltipBodyProps) {
  const coverageShare = month.usedOnSite / month.consumption
  const usedShare = month.usedOnSite / month.generation
  const exportedShare = month.exported / month.generation

  return (
    <div className="energy-tooltip" data-expanded={String(pinned)}>
      <div className="energy-tooltip__summary">
        <div className="ts-chart-tooltip__title">{month.month}</div>
        {pinned ? (
          <button
            className="energy-tooltip__close"
            type="button"
            data-energy-tooltip-close
            aria-label="Close energy details"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={dismiss}
          >
            <Chevron expanded />
          </button>
        ) : (
          <span className="energy-tooltip__toggle" aria-hidden="true">
            <Chevron expanded={false} />
          </span>
        )}
      </div>
      <MetricRow label="Consumption" value={formatEnergy(month.consumption)} />
      <div className="energy-tooltip__compact-generation">
        <div className="energy-tooltip__compact-generation-inner">
          <MetricRow
            label="Generation"
            value={formatEnergy(month.generation)}
          />
        </div>
      </div>
      <div className="energy-tooltip__reveal" aria-hidden={!pinned}>
        <div className="energy-tooltip__reveal-inner">
          <div className="energy-tooltip__details">
            <section aria-label="Consumption mix">
              <div className="energy-tooltip__mini-chart">
                {consumptionChart}
              </div>
              {consumptionBreakdown(month).map((part) => (
                <DetailRow
                  key={part.id}
                  color={part.color}
                  label={part.label}
                  value={formatEnergy(part.value)}
                />
              ))}
            </section>

            <section aria-label="Generation use">
              <MetricRow
                className="energy-tooltip__generation-heading"
                label="Generation"
                summary={false}
                value={formatEnergy(month.generation)}
              />
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
                value={formatPercent(usedShare)}
              />
              <DetailRow
                color={energyColors.exported}
                label="Exported"
                value={formatPercent(exportedShare)}
              />
            </section>
          </div>
        </div>
      </div>
      <p className="energy-tooltip__footer">
        Solar covered {formatPercent(coverageShare)} of this month&apos;s
        consumption, with the rest coming from the grid.
      </p>
    </div>
  )
}

function Chevron({ expanded }: { readonly expanded: boolean }) {
  return (
    <svg
      className="energy-tooltip__chevron"
      viewBox="0 0 12 12"
      aria-hidden="true"
    >
      <path
        d={
          expanded
            ? 'M3 2.5 6 5 9 2.5M3 9.5 6 7 9 9.5'
            : 'm3 4 3-3 3 3M3 8l3 3 3-3'
        }
      />
    </svg>
  )
}

function MetricRow({
  className,
  label,
  summary = true,
  value,
}: {
  readonly className?: string
  readonly label: string
  readonly summary?: boolean
  readonly value: string
}) {
  return (
    <div
      className={[
        'energy-tooltip__metric-row',
        summary ? 'ts-chart-tooltip__row' : null,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
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
  .energy-overview-card .ts-chart:focus,
  .energy-overview-card [role='listbox']:focus {
    outline: none;
  }

  .ts-chart-tooltip.energy-tooltip-surface,
  .energy-reference-tooltip {
    box-sizing: border-box;
    width: 292px;
    max-width: calc(100vw - 24px) !important;
    padding: 0 !important;
    overflow: hidden;
    border: 1px solid rgb(255 255 255 / 0.1) !important;
    border-radius: 10px !important;
    background: #2b2b2e !important;
    color: #f4f4f5 !important;
    box-shadow: 0 14px 34px rgb(0 0 0 / 0.3) !important;
    font: 500 12px/1.35 system-ui, sans-serif !important;
  }

  .energy-reference-tooltip {
    position: absolute;
    z-index: 2;
  }

  .energy-tooltip {
    padding: 12px;
  }

  .energy-tooltip__summary {
    position: relative;
    min-width: 0;
    padding-right: 28px;
  }

  .energy-tooltip .ts-chart-tooltip__title {
    display: flex;
    align-items: center;
    min-height: 18px;
    margin: 0 0 6px;
    color: #f4f4f5;
    font-size: 12px;
    font-weight: 650;
  }

  .energy-tooltip__metric-row {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) auto !important;
    align-items: center !important;
    column-gap: 12px !important;
    font-variant-numeric: tabular-nums;
  }

  .energy-tooltip__metric-row > :last-child {
    color: #fafafa;
    font-weight: 620;
    text-align: right;
    white-space: nowrap;
  }

  .energy-tooltip__detail-row {
    display: grid;
    grid-template-columns: 3px minmax(0, 1fr) auto;
    align-items: center;
    column-gap: 8px;
    min-height: 17px;
    color: #d4d4d8;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }

  .energy-tooltip__detail-row > :last-child {
    color: #f4f4f5;
    font-weight: 600;
    text-align: right;
    white-space: nowrap;
  }

  .energy-tooltip__swatch {
    display: block;
    width: 3px;
    height: 10px;
    border-radius: 999px;
  }

  .energy-tooltip__close,
  .energy-tooltip__toggle {
    position: absolute;
    top: -9px;
    right: -9px;
    display: grid;
    width: 36px;
    height: 36px;
    place-items: center;
    color: #a1a1aa;
  }

  .energy-tooltip__close {
    padding: 0;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: #a1a1aa;
    cursor: pointer;
    pointer-events: auto;
  }

  .energy-tooltip__chevron {
    width: 12px;
    height: 12px;
    overflow: visible;
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1.5;
  }

  .energy-tooltip__close:hover,
  .energy-tooltip__close:focus-visible {
    background: rgb(255 255 255 / 0.08);
    color: #fafafa;
    outline: none;
  }

  .energy-tooltip__close:focus-visible {
    box-shadow: inset 0 0 0 2px #f5b942;
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
    gap: 12px;
    margin-top: 5px;
    transform: translateY(-4px);
    transition: transform 260ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .energy-tooltip[data-expanded='true'] .energy-tooltip__details {
    transform: translateY(0);
  }

  .energy-tooltip__details section {
    display: grid;
    gap: 5px;
  }

  .energy-tooltip__compact-generation {
    display: grid;
    grid-template-rows: 1fr;
    opacity: 1;
    transition:
      grid-template-rows 260ms cubic-bezier(0.22, 1, 0.36, 1),
      opacity 120ms ease;
  }

  .energy-tooltip[data-expanded='true'] .energy-tooltip__compact-generation {
    grid-template-rows: 0fr;
    opacity: 0;
  }

  .energy-tooltip__compact-generation-inner {
    min-height: 0;
    overflow: hidden;
  }

  .energy-tooltip__generation-heading {
    margin-top: 2px;
    padding-top: 8px;
    border-top: 1px solid rgb(255 255 255 / 0.09);
  }

  .energy-tooltip__mini-chart,
  .energy-tooltip__generation-bar {
    width: 100%;
    height: 8px;
    overflow: hidden;
    border-radius: 3px;
    background: rgb(255 255 255 / 0.08);
  }

  .energy-tooltip__mini-chart svg {
    display: block;
    width: 100%;
    height: 8px;
  }

  .energy-tooltip__generation-bar {
    display: flex;
  }

  .energy-tooltip__footer {
    margin: 10px -12px -12px;
    padding: 10px 12px 11px;
    border-top: 1px solid rgb(255 255 255 / 0.07);
    background: #222225;
    color: #a8a8af;
    font-size: 12px;
    font-weight: 500;
    line-height: 1.4;
  }

  @media (prefers-reduced-motion: reduce) {
    .energy-tooltip__compact-generation,
    .energy-tooltip__reveal,
    .energy-tooltip__details {
      transition: none;
    }
  }
`
