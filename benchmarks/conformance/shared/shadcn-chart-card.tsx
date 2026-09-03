import { forwardRef, useImperativeHandle, useRef } from 'react'
import { reactMount } from './react-mount'
import type { ComponentType, ReactNode } from 'react'
import type { ConformanceInput, ConformanceTestDriver } from '../types'
import type { ReactConformanceProps } from './react-mount'

export interface ShadcnChartSize {
  width: number
  height: number
}

interface ShadcnChartCardProps {
  input: ConformanceInput
  title: string
  description: string
  chartShape?: 'wide' | 'square'
  centered?: boolean
  headerInsetBottom?: number
  footer?: ReactNode
  chartFooter?: ReactNode
  headerAction?: ReactNode
  variant?:
    | 'default'
    | 'interactive-area'
    | 'interactive-bar'
    | 'interactive-line'
    | 'interactive-pie'
  chartHeight?: number
  chartClassName?: string
  children: (size: ShadcnChartSize) => ReactNode
}

export function ShadcnChartCard({
  input,
  title,
  description,
  chartShape = 'wide',
  centered = false,
  headerInsetBottom = 0,
  footer,
  chartFooter,
  headerAction,
  variant = 'default',
  chartHeight,
  chartClassName,
  children,
}: ShadcnChartCardProps) {
  const cardWidth = Math.max(1, input.width)
  const contentWidth = Math.max(1, cardWidth - 50)
  const chartSize =
    chartShape === 'square'
      ? {
          width: Math.min(
            variant === 'interactive-pie' ? 300 : 250,
            contentWidth,
          ),
          height: Math.min(
            variant === 'interactive-pie' ? 300 : 250,
            contentWidth,
          ),
        }
      : {
          width: contentWidth,
          height: chartHeight ?? (contentWidth * 9) / 16,
        }

  return (
    <div
      className="sc-example"
      data-conformance-view="main"
      style={{ width: input.width, height: input.height }}
    >
      <article className={`sc-card sc-${variant}`} style={{ width: cardWidth }}>
        <header
          className="sc-card-header"
          style={
            headerInsetBottom > 0
              ? { paddingBottom: headerInsetBottom }
              : undefined
          }
        >
          <div className="sc-card-heading">
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
          {headerAction ? (
            <div className="sc-card-action">{headerAction}</div>
          ) : null}
        </header>
        <div className={`sc-card-content${centered ? ' sc-centered' : ''}`}>
          <div
            className={`sc-chart${chartClassName ? ` ${chartClassName}` : ''}`}
            style={chartSize}
          >
            {children(chartSize)}
          </div>
          {chartFooter ? (
            <div className="sc-chart-footer">{chartFooter}</div>
          ) : null}
        </div>
        {footer ? (
          <footer className={`sc-card-footer${centered ? ' sc-centered' : ''}`}>
            {footer}
          </footer>
        ) : null}
      </article>
    </div>
  )
}

export function ShadcnTrendFooter({
  note = 'Showing total visitors for the last 6 months',
}: {
  centered?: boolean
  note?: string
}) {
  return (
    <>
      <div className="sc-trend">
        Trending up by 5.2% this month
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m3 17 6-6 4 4 8-8" />
          <path d="M14 7h7v7" />
        </svg>
      </div>
      <div className="sc-footer-note">{note}</div>
    </>
  )
}

export function shadcnChartMount(
  Component: ComponentType<{ input: ConformanceInput }>,
) {
  const View = forwardRef<ConformanceTestDriver, ReactConformanceProps>(
    function ShadcnChartView({ input }, ref) {
      const rootRef = useRef<HTMLDivElement>(null)
      useImperativeHandle(
        ref,
        () => ({
          resolveTarget: () => null,
          readState: () => ({}),
          viewBounds(view) {
            if (view && view !== 'main') return null
            const bounds = rootRef.current?.getBoundingClientRect()
            return bounds
              ? {
                  x: bounds.left,
                  y: bounds.top,
                  width: bounds.width,
                  height: bounds.height,
                }
              : null
          },
        }),
        [],
      )
      return (
        <div ref={rootRef} style={{ width: input.width, height: input.height }}>
          <Component input={input} />
        </div>
      )
    },
  )
  const mount = reactMount(View)
  return (container: HTMLElement, input: ConformanceInput) => {
    ensureShadcnChartStyles(container.ownerDocument)
    return mount(container, input)
  }
}

function ensureShadcnChartStyles(document: Document) {
  const id = 'shadcn-chart-card-styles'
  let style = document.getElementById(id)
  if (!(style instanceof HTMLStyleElement)) {
    style = document.createElement('style')
    style.id = id
    document.head.append(style)
  }
  if (style.textContent !== shadcnChartCardStyles) {
    style.textContent = shadcnChartCardStyles
  }
}

export const shadcnChartCardStyles = `
  .sc-example {
    --background: oklch(1 0 0);
    --foreground: oklch(0 0 0);
    --card: oklch(1 0 0);
    --card-foreground: oklch(0 0 0);
    --muted: oklch(0.97 0 0);
    --muted-foreground: oklch(0.556 0 0);
    --border: oklch(0.922 0 0);
    --chart-1: oklch(0.809 0.105 251.813);
    --chart-2: oklch(0.623 0.214 259.815);
    --chart-3: oklch(0.546 0.245 262.881);
    --chart-4: oklch(0.488 0.243 264.376);
    --chart-5: oklch(0.424 0.199 265.638);
    display: flex;
    justify-content: center;
    align-items: flex-start;
    overflow: hidden;
    color: var(--foreground);
    background: var(--background);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    text-rendering: geometricPrecision;
  }
  :root[data-theme='dark'] .sc-example {
    --background: oklch(0.145 0 0);
    --foreground: oklch(0.985 0 0);
    --card: oklch(0.205 0 0);
    --card-foreground: oklch(0.985 0 0);
    --muted: oklch(0.269 0 0);
    --muted-foreground: oklch(0.708 0 0);
    --border: oklch(1 0 0 / 10%);
    --chart-1: oklch(0.809 0.105 251.813);
    --chart-2: oklch(0.623 0.214 259.815);
    --chart-3: oklch(0.546 0.245 262.881);
    --chart-4: oklch(0.488 0.243 264.376);
    --chart-5: oklch(0.424 0.199 265.638);
  }
  .sc-example, .sc-example * { box-sizing: border-box; }
  .sc-card {
    display: flex;
    flex-direction: column;
    gap: 24px;
    border: 1px solid var(--border);
    border-radius: 14px;
    background: var(--card);
    color: var(--card-foreground);
    padding: 24px 0;
  }
  .sc-card-header { display: grid; gap: 8px; padding: 0 24px; }
  .sc-card-heading { display: grid; gap: 8px; }
  .sc-card-header h2 { margin: 0; font-size: 16px; font-weight: 600; line-height: 1; letter-spacing: -0.01em; }
  .sc-card-header p { margin: 0; color: var(--muted-foreground); font-size: 14px; line-height: 20px; }
  .sc-card-content { display: flex; min-height: 0; flex-direction: column; padding: 0 24px; }
  .sc-chart { position: relative; flex: none; }
  .sc-chart > * { display: block; }
  .sc-chart-clip .ts-chart { overflow: hidden !important; }
  .sc-card-footer { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; padding: 0 24px; font-size: 14px; line-height: 1; }
  .sc-chart-footer { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; margin-top: 12px; color: var(--muted-foreground); font-size: 12px; }
  .sc-legend-item { display: inline-flex; align-items: center; gap: 6px; }
  .sc-legend-dot { width: 8px; height: 8px; border-radius: 2px; }
  .sc-legend-icon { width: 12px; height: 12px; fill: none; stroke: var(--muted-foreground); stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
  .sc-pie-legend { display: flex; width: 260px; flex-wrap: wrap; justify-content: center; gap: 10px 16px; }
  .sc-pie-legend .sc-legend-item { flex: 0 0 70px; justify-content: center; }
  .sc-centered { justify-content: center; align-items: center; text-align: center; }
  .sc-trend { display: flex; align-items: center; gap: 8px; font-weight: 500; }
  .sc-trend svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  .sc-footer-note { color: var(--muted-foreground); }
  .sc-example .ts-chart { color: var(--muted-foreground); }
  .sc-example .recharts-surface { overflow: visible; }
  .sc-example .ts-chart__grid line, .sc-example .ts-chart__polar-grid path, .sc-example .ts-chart__polar-grid line { stroke: var(--border); }
  .sc-example .ts-chart__axes text, .sc-example .ts-chart__polar-grid text { fill: var(--muted-foreground); font-size: 12px; }
  .sc-example .ts-chart-tooltip {
    min-width: 128px;
    padding: 7px 10px !important;
    border: 1px solid var(--border) !important;
    border-radius: 8px !important;
    background: var(--card) !important;
    color: var(--card-foreground) !important;
    box-shadow: 0 2px 6px rgb(0 0 0 / 8%);
    font-size: 12px;
  }
  .sc-advanced-tooltip { display: grid; width: 158px; gap: 6px; }
  .sc-advanced-row { display: grid; grid-template-columns: 10px 1fr auto; align-items: center; gap: 6px; }
  .sc-advanced-swatch { width: 10px; height: 10px; border-radius: 2px; }
  .sc-advanced-value { display: flex; align-items: baseline; gap: 2px; color: var(--foreground); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 500; font-variant-numeric: tabular-nums; }
  .sc-advanced-unit { color: var(--muted-foreground); font-family: inherit; font-weight: 400; }
  .sc-advanced-total { display: flex; align-items: center; margin-top: 2px; padding-top: 7px; border-top: 1px solid var(--border); color: var(--foreground); font-weight: 500; }
  .sc-advanced-total .sc-advanced-value { margin-left: auto; }
  .sc-shadcn-tooltip { display: grid; gap: 5px; }
  .sc-tooltip-label { color: var(--foreground); font-weight: 500; }
  .sc-shadcn-tooltip-row { display: grid; grid-template-columns: 9px minmax(0, 1fr) auto; align-items: center; gap: 7px; color: var(--muted-foreground); }
  .sc-tooltip-no-indicator .sc-shadcn-tooltip-row { grid-template-columns: minmax(0, 1fr) auto; }
  .sc-tooltip-dot { width: 8px; height: 8px; border-radius: 2px; }
  .sc-tooltip-line { width: 3px; height: 16px; border-radius: 2px; }
  .sc-tooltip-icon { width: 11px; height: 11px; fill: none; stroke: var(--muted-foreground); stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
  .sc-tooltip-value { display: flex; align-items: baseline; gap: 2px; color: var(--foreground); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 500; font-variant-numeric: tabular-nums; }
  .sc-tooltip-value span { color: var(--muted-foreground); font-family: inherit; font-weight: 400; }
  .sc-tooltip-total { display: flex; justify-content: space-between; margin-top: 1px; padding-top: 7px; border-top: 1px solid var(--border); color: var(--foreground); font-weight: 500; }
  .sc-interactive-area { gap: 0; padding-top: 0; }
  .sc-interactive-area .sc-card-header { display: flex; align-items: center; gap: 16px; padding-top: 20px; padding-bottom: 20px; border-bottom: 1px solid var(--border); }
  .sc-interactive-area .sc-card-heading { flex: 1; gap: 4px; }
  .sc-interactive-area .sc-card-content { padding-top: 24px; }
  .sc-interactive-area .sc-chart-footer { margin-top: 8px; }
  .sc-interactive-bar { gap: 0; padding: 0 0 30px; }
  .sc-interactive-bar .sc-card-header { display: flex; min-height: 99px; align-items: stretch; gap: 0; padding: 0; border-bottom: 1px solid var(--border); }
  .sc-interactive-bar .sc-card-heading { flex: 1; align-content: center; gap: 4px; padding: 16px 24px; }
  .sc-interactive-bar .sc-card-action { display: flex; margin: 0; }
  .sc-interactive-bar .sc-card-content { padding: 43px 24px 0; }
  .sc-interactive-line { gap: 0; padding: 0; }
  .sc-interactive-line .sc-card-header { display: flex; min-height: 99px; align-items: stretch; gap: 0; padding: 0; border-bottom: 1px solid var(--border); }
  .sc-interactive-line .sc-card-heading { flex: 1; align-content: center; gap: 4px; padding: 16px 24px; }
  .sc-interactive-line .sc-card-action { display: flex; margin: 0; }
  .sc-interactive-line .sc-card-content { padding: 43px 24px 0; }
  .sc-interactive-pie .sc-card-header { display: flex; align-items: flex-start; gap: 16px; padding-bottom: 0; }
  .sc-interactive-pie .sc-card-heading { flex: 1; gap: 4px; }
  .sc-interactive-pie .sc-card-content { padding-bottom: 44px; }
  .sc-interactive-pie .sc-chart { transform: translateY(55px); }
  .sc-interactive-pie .sc-card-action { transform: translateY(48px); }
  .sc-card-action { margin-left: auto; }
  .sc-select-display { position: relative; display: flex; min-width: 130px; height: 36px; align-items: center; gap: 8px; padding: 0 12px; border: 1px solid var(--border); border-radius: 10px; background: var(--background); color: var(--foreground); font-size: 14px; box-shadow: 0 1px 2px rgb(0 0 0 / 4%); }
  .sc-select-display:focus-within { outline: 2px solid var(--foreground); outline-offset: 2px; }
  .sc-select-display select { min-width: 0; flex: 1; appearance: none; border: 0; outline: 0; background: transparent; color: inherit; font: inherit; cursor: pointer; }
  .sc-select-display svg { width: 14px; height: 14px; flex: none; color: var(--muted-foreground); pointer-events: none; }
  .sc-select-swatch { width: 12px; height: 12px; flex: none; border-radius: 3px; }
  .sc-bar-metric { display: grid; width: 168px; align-content: center; gap: 6px; padding: 16px 32px; border: 0; border-left: 1px solid var(--border); background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
  .sc-bar-metric[data-active='true'] { background: var(--muted); }
  .sc-bar-metric:focus-visible { outline: 2px solid var(--foreground); outline-offset: -3px; }
  .sc-bar-metric span { color: var(--muted-foreground); font-size: 12px; }
  .sc-bar-metric strong { font-size: 30px; line-height: 1; letter-spacing: -0.03em; }
`
