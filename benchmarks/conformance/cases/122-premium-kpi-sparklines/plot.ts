import * as Plot from '@observablehq/plot'
import { premiumKpisForRevision } from './model'
import type { PremiumKpiMetric } from './model'
import type { ConformanceInput, ConformanceMount } from '../../types'

const fullGap = 12
const svgNamespace = 'http://www.w3.org/2000/svg'
let referenceInstance = 0

export const mount: ConformanceMount = (container, input) => {
  const document = container.ownerDocument
  const prefix = `premium-kpi-plot-${referenceInstance++}`
  const shell = document.createElement('section')
  let currentInput = input

  const render = () => {
    const metrics = premiumKpisForRevision(currentInput.revision)
    shell.replaceChildren()
    shell.className = 'premium-kpi-shell'
    shell.style.width = `${currentInput.width}px`
    shell.style.height = `${currentInput.height}px`
    shell.setAttribute('aria-label', 'Business metrics')

    const style = document.createElement('style')
    style.textContent = premiumKpiPlotStyles
    shell.append(style)

    if (currentInput.preview) {
      renderPreview(
        document,
        shell,
        metrics,
        currentInput.width,
        currentInput.height,
        prefix,
      )
      return
    }

    shell.dataset.conformanceView = 'main'
    shell.removeAttribute('data-catalog-preview-composition')
    const layout = fullLayout(currentInput.width, currentInput.height)
    const grid = document.createElement('div')
    grid.className = 'premium-kpi-grid'
    grid.style.gridTemplateColumns = layout.columns
    grid.style.gridTemplateRows = layout.rows
    grid.style.gap = `${fullGap}px`
    metrics.forEach((metric) => {
      grid.append(
        createCard(
          document,
          metric,
          layout.cardWidth,
          layout.cardHeight,
          prefix,
          false,
        ),
      )
    })
    shell.append(grid)
  }

  container.append(shell)
  render()

  return {
    update(nextInput) {
      currentInput = nextInput
      render()
    },
    driver: {
      resolveTarget() {
        return null
      },
      readState() {
        return {
          revision: currentInput.revision,
          preview: currentInput.preview === true,
          values: premiumKpisForRevision(currentInput.revision).map(
            (metric) => metric.value,
          ),
          svgCount: shell.querySelectorAll('svg').length,
        }
      },
    },
    destroy() {
      shell.remove()
    },
  }
}

function renderPreview(
  document: Document,
  shell: HTMLElement,
  metrics: readonly PremiumKpiMetric[],
  width: number,
  height: number,
  prefix: string,
) {
  const gap = 5
  const primaryWidth = Math.max(1, Math.floor((width - gap) * 0.59))
  const secondaryWidth = Math.max(1, width - gap - primaryWidth)
  const secondaryHeight = Math.max(1, Math.floor((height - gap) / 2))
  const [primary, ...secondary] = metrics

  shell.classList.add('premium-kpi-preview')
  shell.dataset.catalogPreviewComposition = 'premium-kpi-sparklines'
  shell.removeAttribute('data-conformance-view')

  if (primary) {
    shell.append(
      createCard(document, primary, primaryWidth, height, prefix, true),
    )
  }

  const stack = document.createElement('div')
  stack.className = 'premium-kpi-preview-stack'
  stack.style.width = `${secondaryWidth}px`
  stack.style.height = `${height}px`
  secondary.forEach((metric) => {
    stack.append(
      createCard(
        document,
        metric,
        secondaryWidth,
        secondaryHeight,
        prefix,
        true,
      ),
    )
  })
  shell.append(stack)
}

function createCard(
  document: Document,
  metric: PremiumKpiMetric,
  width: number,
  height: number,
  prefix: string,
  preview: boolean,
) {
  const compact = preview || width < 200 || height < 150
  const padding = compact ? 9 : 18
  const headerHeight = compact ? 44 : 72
  const chartWidth = Math.max(24, width - padding * 2)
  const chartHeight = Math.max(24, height - padding * 2 - headerHeight)
  const card = document.createElement('article')
  const header = document.createElement('header')
  const label = document.createElement('span')
  const trend = document.createElement('span')
  const trendIcon = document.createElement('span')
  const value = document.createElement('strong')
  const chart = document.createElement('div')

  card.className = 'premium-kpi-card'
  card.dataset.premiumKpi = metric.id
  card.dataset.conformanceView = metric.id
  if (compact) card.dataset.compact = ''
  card.style.setProperty('--premium-kpi-card-width', `${width}px`)
  card.style.setProperty('--premium-kpi-card-height', `${height}px`)

  header.className = 'premium-kpi-header'
  label.className = 'premium-kpi-label'
  label.textContent = metric.label
  trend.className = 'premium-kpi-trend'
  trend.setAttribute(
    'aria-label',
    `${metric.trendDirection === 'up' ? 'Up' : 'Down'} ${metric.trend}`,
  )
  trendIcon.setAttribute('aria-hidden', 'true')
  trendIcon.textContent = metric.trendDirection === 'up' ? '↑' : '↓'
  trend.append(trendIcon, document.createTextNode(` ${metric.trend}`))
  value.className = 'premium-kpi-value'
  value.textContent = metric.value
  header.append(label, trend, value)

  chart.className = 'premium-kpi-chart'
  chart.append(
    createSparkline(
      document,
      metric,
      chartWidth,
      chartHeight,
      `${prefix}-${metric.id}`,
    ),
  )
  card.append(header, chart)
  return card
}

function createSparkline(
  document: Document,
  metric: PremiumKpiMetric,
  width: number,
  height: number,
  prefix: string,
) {
  const values = metric.rows.map((row) => row.value)
  const minimum = Math.min(...values)
  const maximum = Math.max(...values)
  const padding = Math.max((maximum - minimum) * 0.16, 0.1)
  const baseline = minimum - padding
  const gradientId = `${prefix}-fill`
  const line = Plot.lineY(metric.rows, {
    x: 'period',
    y: 'value',
    curve: 'monotone-x',
    stroke: 'var(--premium-kpi-accent)',
    strokeWidth: 2.4,
  })
  const marks =
    metric.surface === 'area'
      ? [
          Plot.areaY(metric.rows, {
            x: 'period',
            y1: baseline,
            y2: 'value',
            curve: 'monotone-x',
            fill: `url(#${gradientId})`,
          }),
          line,
        ]
      : [line]
  const plot = Plot.plot({
    width,
    height,
    marginTop: 4,
    marginRight: 3,
    marginBottom: 3,
    marginLeft: 3,
    ariaLabel: `${metric.label} trend, ending at ${metric.value}`,
    x: {
      axis: null,
      domain: [0, Math.max(0, metric.rows.length - 1)],
      nice: false,
    },
    y: { axis: null, domain: [baseline, maximum + padding], nice: false },
    marks,
  })

  plot.classList.add('premium-kpi-plot')
  plot.style.background = 'transparent'
  plot.style.display = 'block'
  plot.style.maxWidth = 'none'

  if (metric.surface === 'area') {
    const svg =
      plot.tagName.toLowerCase() === 'svg'
        ? (plot as SVGSVGElement)
        : plot.querySelector<SVGSVGElement>('svg')
    if (svg) svg.prepend(createGradient(document, gradientId))
  }

  return plot
}

function createGradient(document: Document, id: string) {
  const defs = document.createElementNS(svgNamespace, 'defs')
  const gradient = document.createElementNS(svgNamespace, 'linearGradient')
  const start = document.createElementNS(svgNamespace, 'stop')
  const end = document.createElementNS(svgNamespace, 'stop')

  gradient.id = id
  gradient.setAttribute('x1', '0')
  gradient.setAttribute('y1', '0')
  gradient.setAttribute('x2', '0')
  gradient.setAttribute('y2', '1')
  start.setAttribute('offset', '0')
  start.setAttribute('stop-color', 'var(--premium-kpi-accent)')
  start.setAttribute('stop-opacity', '0.26')
  end.setAttribute('offset', '1')
  end.setAttribute('stop-color', 'var(--premium-kpi-accent)')
  end.setAttribute('stop-opacity', '0')
  gradient.append(start, end)
  defs.append(gradient)
  return defs
}

function fullLayout(width: number, height: number) {
  const padding = 14
  const availableWidth = Math.max(1, width - padding * 2)
  const availableHeight = Math.max(1, height - padding * 2)
  const horizontal = width >= 680 || width / height >= 1.2

  return horizontal
    ? {
        columns: 'repeat(3, minmax(0, 1fr))',
        rows: 'minmax(0, 1fr)',
        cardWidth: Math.max(1, (availableWidth - fullGap * 2) / 3),
        cardHeight: availableHeight,
      }
    : {
        columns: 'minmax(0, 1fr)',
        rows: 'repeat(3, minmax(0, 1fr))',
        cardWidth: availableWidth,
        cardHeight: Math.max(1, (availableHeight - fullGap * 2) / 3),
      }
}

const premiumKpiPlotStyles = `
.premium-kpi-shell {
  --premium-kpi-canvas: light-dark(#f5f6f8, #09090b);
  --premium-kpi-card: light-dark(rgba(255, 255, 255, 0.92), rgba(24, 24, 27, 0.9));
  --premium-kpi-foreground: light-dark(#18181b, #fafafa);
  --premium-kpi-muted: light-dark(#71717a, #a1a1aa);
  --premium-kpi-border: light-dark(rgba(24, 24, 27, 0.09), rgba(250, 250, 250, 0.1));
  --premium-kpi-shadow: light-dark(rgba(24, 24, 27, 0.07), rgba(0, 0, 0, 0.34));
  color-scheme: inherit;
  box-sizing: border-box;
  display: grid;
  place-items: stretch;
  padding: 14px;
  overflow: hidden;
  color: var(--premium-kpi-foreground);
  background: var(--premium-kpi-canvas);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.premium-kpi-grid {
  display: grid;
  min-width: 0;
  min-height: 0;
}

.premium-kpi-card {
  --premium-kpi-accent: #6d5dfc;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: var(--premium-kpi-card-width);
  height: var(--premium-kpi-card-height);
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  padding: 18px;
  border: 1px solid var(--premium-kpi-border);
  border-radius: 18px;
  background: var(--premium-kpi-card);
  box-shadow: 0 14px 42px var(--premium-kpi-shadow);
}

.premium-kpi-card[data-premium-kpi="customers"] {
  --premium-kpi-accent: #0f91c7;
}

.premium-kpi-card[data-premium-kpi="churn"] {
  --premium-kpi-accent: #0c9b6c;
}

.premium-kpi-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: baseline;
  column-gap: 8px;
  flex: 0 0 72px;
}

.premium-kpi-label {
  overflow: hidden;
  color: var(--premium-kpi-muted);
  font-size: 12px;
  font-weight: 620;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.premium-kpi-value {
  grid-column: 1 / -1;
  margin-top: 7px;
  font-size: clamp(24px, 3.1vw, 36px);
  font-weight: 730;
  letter-spacing: -0.055em;
  line-height: 1;
}

.premium-kpi-trend {
  color: var(--premium-kpi-accent);
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
}

.premium-kpi-chart {
  display: grid;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  align-items: end;
}

.premium-kpi-preview {
  display: flex;
  gap: 5px;
  padding: 0;
  background: transparent;
}

.premium-kpi-card[data-compact] {
  padding: 9px;
  border-radius: 11px;
  box-shadow: 0 6px 18px var(--premium-kpi-shadow);
}

.premium-kpi-card[data-compact] .premium-kpi-header {
  flex-basis: 44px;
  column-gap: 4px;
}

.premium-kpi-card[data-compact] .premium-kpi-label {
  font-size: 7px;
}

.premium-kpi-card[data-compact] .premium-kpi-value {
  margin-top: 3px;
  font-size: 15px;
}

.premium-kpi-card[data-compact] .premium-kpi-trend {
  font-size: 7px;
}

.premium-kpi-preview-stack {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

`
