import { createElement, useEffect, useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { Cell, Pie, PieChart, Sector, Tooltip, matchByDataKey } from 'recharts'
import { applyRechartsAccessibility } from '../../shared/recharts-mount'
import { activeDonutLayout } from './layout'
import { browserRows, browserTotal } from './model'
import type { CSSProperties, ReactNode } from 'react'
import type { PieSectorDataItem, TooltipValueType } from 'recharts'
import type {
  ConformanceInput,
  ConformanceMount,
  ConformanceTestDriver,
} from '../../types'
import type { BrowserRow } from './model'

const palette = ['#7c3aed', '#06b6d4', '#f97316', '#ec4899', '#84cc16']
const colorTokens = [
  'var(--ts-chart-1)',
  'var(--ts-chart-2)',
  'var(--ts-chart-3)',
  'var(--ts-chart-4)',
  'var(--ts-chart-5)',
]
const gapAngle = 2.8

interface ActiveDonutReferenceProps {
  input: ConformanceInput
  onSelectionChange: (id: string, value: number, total: number) => void
  onTooltipChange: (row: BrowserRow | null) => void
  onAnimationChange: (animating: boolean) => void
}

function ActiveDonutReference({
  input,
  onSelectionChange,
  onTooltipChange,
  onAnimationChange,
}: ActiveDonutReferenceProps) {
  const [activeId, setActiveId] = useState('chrome')
  const rows = browserRows(input.revision)
  const total = browserTotal(rows)
  const activeIndex = Math.max(
    0,
    rows.findIndex((row) => row.id === activeId),
  )
  const selected = rows[activeIndex] ?? rows[0]!
  const reducedMotion = useMemo(prefersReducedMotion, [])

  useEffect(() => {
    onSelectionChange(selected.id, selected.visitors, total)
  }, [onSelectionChange, selected, total])

  const select = (row: BrowserRow) => {
    setActiveId(row.id)
    onSelectionChange(row.id, row.visitors, total)
  }

  const chart = (width: number, height: number) => {
    const size = Math.min(width, height)
    const cx = width / 2
    const cy = height / 2
    const outerRadius = size * (input.preview ? 0.35 : 0.34)
    const innerRadius = outerRadius * 0.6
    const angles = sectorAngles(rows, activeIndex)
    const activeColor = colorTokens[activeIndex] ?? colorTokens[0]!

    return createElement(
      PieChart,
      {
        key: 'chart',
        width,
        height,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        accessibilityLayer: true,
      },
      [
        createElement(
          Pie,
          {
            key: 'pie',
            data: rows,
            dataKey: 'visitors',
            nameKey: 'label',
            cx,
            cy,
            innerRadius,
            outerRadius,
            startAngle: 90,
            endAngle: -270,
            paddingAngle: gapAngle,
            cornerRadius: 7,
            stroke: 'none',
            animationMatchBy: matchByDataKey('id'),
            animationDuration: 760,
            animationEasing: 'ease-out',
            isAnimationActive: !reducedMotion && activeId !== 'chrome',
            onAnimationStart: () => onAnimationChange(true),
            onAnimationEnd: () => onAnimationChange(false),
            onClick: (_sector: PieSectorDataItem, index: number) => {
              const row = rows[index]
              if (row) select(row)
            },
            onMouseEnter: (_sector: PieSectorDataItem, index: number) => {
              const row = rows[index]
              if (!row) return
              select(row)
              onTooltipChange(row)
            },
            onMouseLeave: () => onTooltipChange(null),
          },
          rows.map((row, index) =>
            createElement(Cell, {
              key: row.id,
              className: `browser-wedge browser-wedge-${row.id}`,
              fill: colorTokens[index],
              stroke: 'none',
              style: { cursor: 'pointer' },
            }),
          ),
        ),
        createElement(Sector, {
          key: `selected-wedge:${selected.id}`,
          className: 'recharts-sector',
          cx,
          cy,
          innerRadius: innerRadius - 1,
          outerRadius: outerRadius + (input.preview ? 5 : 7),
          startAngle: angles.start,
          endAngle: angles.end,
          cornerRadius: 8,
          fill: activeColor,
          stroke: 'Canvas',
          strokeWidth: input.preview ? 1.5 : 2.5,
          pointerEvents: 'none',
        }),
        createElement(Sector, {
          key: `selected-ring:${selected.id}`,
          className: 'recharts-sector',
          cx,
          cy,
          innerRadius: outerRadius + (input.preview ? 9 : 12),
          outerRadius: outerRadius + (input.preview ? 13 : 17),
          startAngle: angles.start,
          endAngle: angles.end,
          cornerRadius: 4,
          fill: activeColor,
          fillOpacity: 0.78,
          stroke: 'none',
          pointerEvents: 'none',
        }),
        createElement(
          'text',
          {
            key: `center-value:${selected.id}`,
            className: 'recharts-text',
            x: cx,
            y: cy - (input.preview ? 7 : 9),
            fill: 'currentColor',
            fontSize: input.preview ? 19 : 26,
            fontWeight: 760,
            textAnchor: 'middle',
            dominantBaseline: 'middle',
            pointerEvents: 'none',
          },
          selected.visitors.toLocaleString('en-US'),
        ),
        createElement(
          'text',
          {
            key: `center-label:${selected.id}`,
            className: 'recharts-text',
            x: cx,
            y: cy + (input.preview ? 12 : 16),
            fill: 'color-mix(in srgb, currentColor 56%, transparent)',
            fontSize: input.preview ? 8 : 11,
            fontWeight: 620,
            textAnchor: 'middle',
            dominantBaseline: 'middle',
            pointerEvents: 'none',
          },
          selected.label,
        ),
        createElement(Tooltip, {
          key: 'tooltip',
          cursor: false,
          contentStyle: {
            color: 'CanvasText',
            background: 'color-mix(in srgb, Canvas 94%, transparent)',
            border: '1px solid color-mix(in srgb, CanvasText 12%, transparent)',
            borderRadius: 10,
            boxShadow:
              '0 12px 34px color-mix(in srgb, CanvasText 14%, transparent)',
            font: '600 12px/1.35 Inter, ui-sans-serif, system-ui, sans-serif',
          },
          formatter: (value: TooltipValueType | undefined, name: ReactNode) =>
            [`${formatTooltipValue(value)} visitors`, String(name)] as [
              string,
              string,
            ],
        }),
      ],
    )
  }

  if (input.preview) return chart(input.width, input.height)

  const layout = activeDonutLayout(input.width, input.height, rows.length)
  const { chartSize, compact } = layout
  const cardStyle: CSSProperties & Record<`--${string}`, string> = {
    '--ts-chart-1': palette[0]!,
    '--ts-chart-2': palette[1]!,
    '--ts-chart-3': palette[2]!,
    '--ts-chart-4': palette[3]!,
    '--ts-chart-5': palette[4]!,
    boxSizing: 'border-box',
    width: input.width,
    height: input.height,
    overflow: 'hidden',
    border: '1px solid color-mix(in srgb, currentColor 12%, transparent)',
    borderRadius: 18,
    color: 'CanvasText',
    background: 'Canvas',
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    boxShadow: '0 18px 55px color-mix(in srgb, CanvasText 7%, transparent)',
  }

  return createElement(
    'section',
    {
      'data-conformance-view': 'main',
      'aria-label': 'Browser visitors',
      style: cardStyle,
    },
    [
      createElement(
        'header',
        { key: 'header', style: { padding: '18px 20px 0' } },
        [
          createElement(
            'div',
            { key: 'title', style: { fontSize: 14, fontWeight: 680 } },
            'Browser visitors',
          ),
          createElement(
            'div',
            {
              key: 'total',
              style: { marginTop: 3, fontSize: 12, opacity: 0.56 },
            },
            `${total.toLocaleString('en-US')} sessions`,
          ),
        ],
      ),
      createElement(
        'div',
        {
          key: 'content',
          'data-donut-content': '',
          'data-chart-size': chartSize,
          style: {
            display: 'flex',
            alignItems: 'center',
            flexDirection: compact ? 'column' : 'row',
            gap: layout.contentGap,
            padding: compact ? '4px 18px 16px' : '2px 24px 20px 8px',
          },
        },
        [
          chart(chartSize, chartSize),
          createElement(
            'div',
            {
              key: 'legend',
              role: 'group',
              'aria-label': 'Select browser',
              'data-browser-legend': '',
              style: {
                display: 'grid',
                gridTemplateColumns: compact
                  ? `repeat(${layout.legendColumns}, minmax(0, 1fr))`
                  : undefined,
                width: compact ? '100%' : 190,
                gap: 4,
              },
            },
            rows.map((row, index) => {
              const active = row.id === selected.id
              return createElement(
                'button',
                {
                  key: row.id,
                  type: 'button',
                  'data-browser': row.id,
                  'aria-pressed': active,
                  onClick: () => select(row),
                  style: {
                    display: 'grid',
                    gridTemplateColumns: '10px 1fr auto',
                    alignItems: 'center',
                    gap: 9,
                    minHeight: 38,
                    padding: '7px 9px',
                    border: 0,
                    borderRadius: 9,
                    color: 'inherit',
                    background: active
                      ? 'color-mix(in srgb, currentColor 7%, Canvas)'
                      : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                  },
                },
                [
                  createElement('span', {
                    key: 'swatch',
                    'aria-hidden': true,
                    style: {
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      background: palette[index],
                    },
                  }),
                  createElement(
                    'span',
                    {
                      key: 'label',
                      style: { fontSize: 12, fontWeight: 620 },
                    },
                    row.label,
                  ),
                  createElement(
                    'span',
                    {
                      key: 'share',
                      style: { fontSize: 12, opacity: 0.6 },
                    },
                    `${Math.round((row.visitors / total) * 100)}%`,
                  ),
                ],
              )
            }),
          ),
        ],
      ),
    ],
  )
}

export const mount: ConformanceMount = (container, input) => {
  const surface = container.ownerDocument.createElement('div')
  container.append(surface)
  const root = createRoot(surface)
  let currentInput = input
  let activeId = 'chrome'
  let activeValue = browserRows(input.revision)[0]?.visitors ?? 0
  let total = browserTotal(browserRows(input.revision))
  let tooltipRow: BrowserRow | null = null
  let animating = false

  const render = () => {
    flushSync(() => {
      root.render(
        createElement(ActiveDonutReference, {
          input: currentInput,
          onSelectionChange(id, value, nextTotal) {
            activeId = id
            activeValue = value
            total = nextTotal
          },
          onTooltipChange(row) {
            tooltipRow = row
          },
          onAnimationChange(nextAnimating) {
            animating = nextAnimating
          },
        }),
      )
    })
    applyRechartsAccessibility(surface, 'Browser visitor share')
  }

  render()

  const driver: ConformanceTestDriver = {
    resolveTarget(target) {
      if (target.view && target.view !== 'main') return null
      if (target.anchor.startsWith('wedge:')) {
        const id = target.anchor.slice('wedge:'.length)
        const path = surface.querySelector<SVGPathElement>(
          `path.browser-wedge-${id}`,
        )
        return path ? svgPathPoint(path) : null
      }
      const id = target.anchor.startsWith('browser:')
        ? target.anchor.slice('browser:'.length)
        : null
      const button = id
        ? surface.querySelector<HTMLButtonElement>(
            `button[data-browser="${id}"]`,
          )
        : null
      return button ? center(button) : null
    },
    readState() {
      const tooltip = surface.querySelector<HTMLElement>(
        '.recharts-tooltip-wrapper',
      )
      return {
        activeId,
        activeValue,
        total,
        focusedId: tooltipRow?.id ?? null,
        tooltip: {
          visible: isTooltipVisible(tooltip),
          id: tooltipRow?.id ?? null,
          label: tooltipRow?.label ?? null,
          value: tooltipRow?.visitors ?? null,
          text: tooltip?.textContent?.trim() ?? '',
        },
      }
    },
    viewBounds(view) {
      if (view && view !== 'main') return null
      const element =
        surface.querySelector<HTMLElement>('[data-conformance-view="main"]') ??
        surface
      const bounds = element.getBoundingClientRect()
      return {
        x: bounds.left,
        y: bounds.top,
        width: bounds.width,
        height: bounds.height,
      }
    },
    settle: () => settleAnimation(surface, () => animating),
  }

  return {
    driver,
    update(nextInput) {
      currentInput = nextInput
      render()
    },
    destroy() {
      flushSync(() => root.unmount())
      surface.remove()
    },
  }
}

function sectorAngles(rows: readonly BrowserRow[], index: number) {
  const total = browserTotal(rows)
  const before = rows
    .slice(0, index)
    .reduce((sum, row) => sum + row.visitors, 0)
  const value = rows[index]?.visitors ?? 0
  return {
    start: 90 - (before / total) * 360 - gapAngle / 2,
    end: 90 - ((before + value) / total) * 360 + gapAngle / 2,
  }
}

function formatTooltipValue(value: TooltipValueType | undefined) {
  if (value === undefined) return '0'
  return Array.isArray(value)
    ? value.map(String).join('–')
    : Number(value).toLocaleString('en-US')
}

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  )
}

function isTooltipVisible(tooltip: HTMLElement | null) {
  if (!tooltip) return false
  const view = tooltip.ownerDocument.defaultView
  const style = view?.getComputedStyle(tooltip)
  return style?.visibility !== 'hidden' && style?.opacity !== '0'
}

function center(element: HTMLElement | SVGElement) {
  const bounds = element.getBoundingClientRect()
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
    focusElement: element,
  }
}

function svgPathPoint(path: SVGPathElement) {
  const svg = path.ownerSVGElement
  const matrix = path.getScreenCTM()
  if (!svg || !matrix) return null
  const bounds = path.getBBox()
  const candidates: Array<{ x: number; y: number; distance: number }> = []

  for (let row = 1; row < 32; row += 1) {
    for (let column = 1; column < 32; column += 1) {
      const x = bounds.x + (bounds.width * column) / 32
      const y = bounds.y + (bounds.height * row) / 32
      const point = svg.createSVGPoint()
      point.x = x
      point.y = y
      if (!path.isPointInFill(point)) continue
      candidates.push({
        x,
        y,
        distance:
          Math.abs(x - (bounds.x + bounds.width / 2)) +
          Math.abs(y - (bounds.y + bounds.height / 2)),
      })
    }
  }

  const candidate = candidates.sort(
    (left, right) => left.distance - right.distance,
  )[0]
  const fallback = candidate ?? radialPathPoint(path, svg)
  if (!fallback) return null
  const point = svg.createSVGPoint()
  point.x = fallback.x
  point.y = fallback.y
  const screen = point.matrixTransform(matrix)
  return { x: screen.x, y: screen.y, focusElement: path }
}

function radialPathPoint(path: SVGPathElement, svg: SVGSVGElement) {
  const viewBox = svg.viewBox.baseVal
  const centerX = viewBox.x + viewBox.width / 2
  const centerY = viewBox.y + viewBox.height / 2
  const length = path.getTotalLength()

  for (let index = 1; index < 64; index += 1) {
    const boundary = path.getPointAtLength((length * index) / 64)
    for (const ratio of [0.74, 0.8, 0.86]) {
      const point = svg.createSVGPoint()
      point.x = centerX + (boundary.x - centerX) * ratio
      point.y = centerY + (boundary.y - centerY) * ratio
      if (path.isPointInFill(point)) return { x: point.x, y: point.y }
    }
  }
  return null
}

function settleAnimation(
  root: HTMLElement,
  isAnimating: () => boolean,
  timeout = 2_500,
) {
  const view = root.ownerDocument.defaultView
  if (!view || !isAnimating()) return Promise.resolve()
  const started = view.performance.now()
  return new Promise<void>((resolve) => {
    const finish = () => {
      view.requestAnimationFrame(() =>
        view.requestAnimationFrame(() => resolve()),
      )
    }
    const check = () => {
      if (!isAnimating() || view.performance.now() - started >= timeout) {
        finish()
        return
      }
      view.requestAnimationFrame(check)
    }
    check()
  })
}
