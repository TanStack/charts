import { defineChart } from '@tanstack/charts'
import { motion } from '@tanstack/charts/motion'
import { mountChartRenderer } from '@tanstack/charts/renderer'
import { tooltip } from '@tanstack/charts/tooltip'
import { readChartMotionState, settleChartMotion } from '../../shared/motion'
import { tanstackCase } from '../../shared/mount'
import { themedAreaSpring, themedInteractiveAreaDefinition } from './chart'
import {
  formatThemedAreaTooltip,
  themedAreaRanges,
  themedAreaRows,
  themedAreaRangeDays,
} from './model'
import type { ChartPoint, ChartTooltipOptions } from '@tanstack/charts'
import type { ThemedAreaRange, ThemedAreaRow } from './model'
import type {
  ConformanceInput,
  ConformanceMount,
  ConformanceTestDriver,
} from '../../types'

const ariaLabel = 'Daily visitors with selectable 7, 30, and 90 day ranges'
let themedAreaMountId = 0

export const themedAreaTooltip: ChartTooltipOptions<ThemedAreaRow> = {
  anchor: 'point',
  placement: ['top', 'right', 'left', 'bottom'],
  className: 'themed-area-tooltip',
  offset: 10,
  format: ({ datum }) => formatThemedAreaTooltip(datum),
}

export const catalogCase = tanstackCase(
  (input) =>
    themedInteractiveAreaDefinition(themedAreaRows('30d', input.revision), {
      width: input.width,
      height: input.height,
      preview: input.preview,
    }),
  ariaLabel,
  themedAreaTooltip,
  {
    guides: true,
    margin: true,
    focus(scene) {
      return (
        scene.points.find(
          (point) =>
            point.markId === 'visitor-points' &&
            point.datum.id === '2026-06-29',
        ) ?? null
      )
    },
  },
)

export const mount: ConformanceMount = (container, input) => {
  const idPrefix = `themed-area-${++themedAreaMountId}`
  let currentInput = input
  let range: ThemedAreaRange = '30d'
  let rows = themedAreaRows(range, input.revision)
  let focused: readonly ChartPoint<ThemedAreaRow, Date, number>[] = []
  const renderer = motion<ThemedAreaRow, Date, number>({
    initial: true,
    transition: themedAreaSpring,
    respectReducedMotion: true,
  })
  const card = createCard(container.ownerDocument)
  const header = createHeader(container.ownerDocument, range)
  const chartRoot = container.ownerDocument.createElement('div')
  chartRoot.className = 'themed-area-chart'
  card.dataset.conformanceView = 'main'
  card.append(header.root, chartRoot)
  container.append(card)

  const chartHeight = () => {
    const measured = chartRoot.getBoundingClientRect().height
    return measured > 0
      ? measured
      : Math.max(
          120,
          currentInput.height - (currentInput.width < 420 ? 96 : 76),
        )
  }
  const definition = () =>
    defineChart(
      themedInteractiveAreaDefinition(rows, {
        width: currentInput.width,
        height: chartHeight(),
      }),
      {
        svgAnimation: false,
        keyboard: true,
        tooltip: { use: tooltip, ...themedAreaTooltip },
      },
    )
  const options = () => ({
    definition: definition(),
    renderer,
    idPrefix,
    width: currentInput.width,
    height: chartHeight(),
    ariaLabel,
    ariaDescription:
      'Choose a range, then move across the chart or use the arrow keys to inspect daily visitor totals.',
    onFocusGroupChange(
      points: readonly ChartPoint<ThemedAreaRow, Date, number>[],
    ) {
      focused = points.filter((point) => point.markId === 'visitor-points')
    },
  })

  sizeCard(card, currentInput)
  const host = mountChartRenderer(chartRoot, options())

  const selectRange = (nextRange: ThemedAreaRange) => {
    if (range === nextRange) return
    range = nextRange
    rows = themedAreaRows(range, currentInput.revision)
    card.dataset.range = range
    paintRangeButtons(header.buttons, range)
    host.update(options())
  }

  for (const selectedRange of themedAreaRanges) {
    header.buttons[selectedRange].addEventListener('click', () => {
      selectRange(selectedRange)
    })
  }

  const driver: ConformanceTestDriver = {
    resolveTarget(target) {
      if (target.view && target.view !== 'main') return null
      if (target.anchor.startsWith('control:')) {
        const selectedRange = target.anchor.slice(
          'control:'.length,
        ) as ThemedAreaRange
        const button = header.buttons[selectedRange]
        if (!button) return null
        const bounds = button.getBoundingClientRect()
        return {
          x: bounds.left + bounds.width / 2,
          y: bounds.top + bounds.height / 2,
          focusElement: button,
        }
      }
      const id = target.anchor.startsWith('date:')
        ? target.anchor.slice('date:'.length)
        : null
      const point = host
        .getScene()
        .points.find(
          (candidate) =>
            candidate.markId === 'visitor-points' && candidate.datum.id === id,
        )
      const svg = chartRoot.querySelector<SVGSVGElement>('svg.ts-chart')
      if (!point || !svg) return null
      const scene = host.getScene()
      const bounds = svg.getBoundingClientRect()
      return {
        x: bounds.left + (point.x / scene.width) * bounds.width,
        y: bounds.top + (point.y / scene.height) * bounds.height,
        focusElement: svg,
      }
    },
    readState() {
      const primary = focused[0]
      const tooltipElement =
        card.querySelector<HTMLElement>('.ts-chart-tooltip')
      return {
        range,
        rowCount: rows.length,
        firstId: rows[0]?.id ?? null,
        lastId: rows.at(-1)?.id ?? null,
        expectedDays: themedAreaRangeDays[range],
        focusedId: primary?.datum.id ?? null,
        tooltip: {
          visible: Boolean(tooltipElement && !tooltipElement.hidden),
          text: tooltipElement?.textContent?.trim() ?? '',
        },
        motionState: readChartMotionState(chartRoot),
      }
    },
    viewBounds(view) {
      if (view && view !== 'main') return null
      const bounds = card.getBoundingClientRect()
      return {
        x: bounds.left,
        y: bounds.top,
        width: bounds.width,
        height: bounds.height,
      }
    },
    settle: () => settleChartMotion(chartRoot, 5_000),
  }

  return {
    driver,
    update(nextInput: ConformanceInput) {
      currentInput = nextInput
      rows = themedAreaRows(range, currentInput.revision)
      sizeCard(card, currentInput)
      host.update(options())
    },
    destroy() {
      host.destroy()
      card.remove()
    },
  }
}

function createCard(document: Document) {
  const card = document.createElement('section')
  card.className = 'themed-area-card'
  card.dataset.range = '30d'
  const style = document.createElement('style')
  style.textContent = `
    .themed-area-card {
      --themed-area-surface: var(--chart-surface, light-dark(#ffffff, #09090b));
      --themed-area-foreground: var(--chart-foreground, light-dark(#18181b, #fafafa));
      --themed-area-muted: var(--chart-muted, light-dark(#71717a, #a1a1aa));
      --themed-area-grid: var(--chart-grid, light-dark(#64748b, #94a3b8));
      --themed-area-border: var(--chart-border, light-dark(rgba(15, 23, 42, 0.11), rgba(255, 255, 255, 0.1)));
      --themed-area-accent: var(--chart-accent, light-dark(#2563eb, #60a5fa));
      --ts-chart-tooltip-max-width: min(18rem, 82%);
      --ts-chart-tooltip-padding: 7px 9px;
      --ts-chart-tooltip-background: color-mix(in srgb, var(--themed-area-surface) 94%, transparent);
      --ts-chart-tooltip-color: var(--themed-area-foreground);
      --ts-chart-tooltip-border: 1px solid var(--themed-area-border);
      --ts-chart-tooltip-border-radius: 8px;
      --ts-chart-tooltip-shadow: 0 8px 24px rgba(15, 23, 42, 0.13);
      --ts-chart-tooltip-font: 600 11px/1.35 var(--font-sans, ui-sans-serif, system-ui, sans-serif);
      box-sizing: border-box;
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      overflow: hidden;
      color: var(--themed-area-foreground);
      background: var(--themed-area-surface);
      border: 1px solid var(--themed-area-border);
      border-radius: 16px;
      box-shadow: 0 1px 2px light-dark(rgba(15, 23, 42, 0.04), rgba(0, 0, 0, 0.28)), 0 18px 42px light-dark(rgba(15, 23, 42, 0.07), rgba(0, 0, 0, 0.32));
      font-family: var(--font-sans, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
    }
    .themed-area-card *, .themed-area-card *::before, .themed-area-card *::after { box-sizing: border-box; }
    .themed-area-card__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 18px 20px 8px;
    }
    .themed-area-card__heading { min-width: 0; }
    .themed-area-card__title {
      margin: 0;
      font-size: 14px;
      font-weight: 650;
      letter-spacing: -0.012em;
      line-height: 1.25;
    }
    .themed-area-card__description {
      margin: 4px 0 0;
      color: var(--themed-area-muted);
      font-size: 11px;
      line-height: 1.3;
    }
    .themed-area-card__ranges {
      display: inline-flex;
      flex: none;
      gap: 2px;
      padding: 3px;
      background: color-mix(in srgb, var(--themed-area-foreground) 5%, transparent);
      border: 1px solid var(--themed-area-border);
      border-radius: 9px;
    }
    .themed-area-card__range {
      min-width: 38px;
      min-height: 30px;
      padding: 0 9px;
      color: var(--themed-area-muted);
      background: transparent;
      border: 0;
      border-radius: 6px;
      cursor: pointer;
      font: 600 10px/1 var(--font-sans, ui-sans-serif, system-ui, sans-serif);
      transition: color 140ms ease, background 140ms ease, box-shadow 140ms ease;
    }
    .themed-area-card__range:hover { color: var(--themed-area-foreground); }
    .themed-area-card__range[aria-pressed="true"] {
      color: var(--themed-area-foreground);
      background: var(--themed-area-surface);
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.11);
    }
    .themed-area-card__range:focus-visible {
      outline: 2px solid var(--themed-area-accent);
      outline-offset: 2px;
    }
    .themed-area-chart { min-width: 0; min-height: 0; }
    :is(.dark, [data-theme="dark"]) .themed-area-card,
    .themed-area-card:is(.dark, [data-theme="dark"]) { color-scheme: dark; }
    :is(.light, [data-theme="light"]) .themed-area-card,
    .themed-area-card:is(.light, [data-theme="light"]) { color-scheme: light; }
    @media (max-width: 419px) {
      .themed-area-card__header { align-items: flex-start; flex-direction: column; gap: 10px; padding: 14px 14px 6px; }
      .themed-area-card__ranges { width: 100%; }
      .themed-area-card__range { flex: 1; }
    }
    @media (prefers-reduced-motion: reduce) {
      .themed-area-card__range { transition: none; }
    }
  `
  card.append(style)
  return card
}

function createHeader(document: Document, range: ThemedAreaRange) {
  const root = document.createElement('header')
  root.className = 'themed-area-card__header'
  const heading = document.createElement('div')
  heading.className = 'themed-area-card__heading'
  const title = document.createElement('h2')
  title.className = 'themed-area-card__title'
  title.textContent = 'Traffic'
  const description = document.createElement('p')
  description.className = 'themed-area-card__description'
  description.textContent = 'Daily visitors'
  heading.append(title, description)

  const controls = document.createElement('div')
  controls.className = 'themed-area-card__ranges'
  controls.setAttribute('role', 'group')
  controls.setAttribute('aria-label', 'Date range')
  const buttons = {} as Record<ThemedAreaRange, HTMLButtonElement>
  for (const selectedRange of themedAreaRanges) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'themed-area-card__range'
    button.textContent = selectedRange.toUpperCase()
    button.setAttribute(
      'aria-label',
      `Last ${themedAreaRangeDays[selectedRange]} days`,
    )
    buttons[selectedRange] = button
    controls.append(button)
  }
  paintRangeButtons(buttons, range)
  root.append(heading, controls)
  return { root, buttons }
}

function paintRangeButtons(
  buttons: Record<ThemedAreaRange, HTMLButtonElement>,
  range: ThemedAreaRange,
) {
  for (const selectedRange of themedAreaRanges) {
    buttons[selectedRange].setAttribute(
      'aria-pressed',
      String(selectedRange === range),
    )
  }
}

function sizeCard(card: HTMLElement, input: ConformanceInput) {
  card.style.width = `${input.width}px`
  card.style.height = `${input.height}px`
}
