import { barY, defineChart, lineY } from '@tanstack/charts'
import { motion } from '@tanstack/charts/motion'
import { mountChartRenderer } from '@tanstack/charts/renderer'
import { scaleBand, scaleLinear } from 'd3-scale'
import type {
  DomChartDefinition,
  ChartMotionContext,
  ChartPoint,
  ChartSurface,
} from '@tanstack/charts'

interface UpdateRow {
  id: string
  period: string
  actual: number
  target: number
  featured?: boolean
}

const width = 760
const height = 380
const spring = {
  type: 'spring' as const,
  stiffness: 170,
  damping: 14,
  mass: 1,
}
const initialRows: UpdateRow[] = [
  { id: 'jan', period: 'Jan', actual: 28, target: 32 },
  { id: 'feb', period: 'Feb', actual: 36, target: 35 },
  { id: 'mar', period: 'Mar', actual: 45, target: 43 },
  { id: 'apr', period: 'Apr', actual: 57, target: 50, featured: true },
  { id: 'may', period: 'May', actual: 51, target: 56 },
  { id: 'jun', period: 'Jun', actual: 68, target: 63 },
  { id: 'jul', period: 'Jul', actual: 75, target: 71 },
  { id: 'aug', period: 'Aug', actual: 83, target: 79 },
]
const firstUpdate: UpdateRow[] = [
  { id: 'aug', period: 'Aug', actual: 64, target: 72 },
  { id: 'apr', period: 'Apr', actual: 86, target: 68, featured: true },
  { id: 'jan', period: 'Jan', actual: 48, target: 42 },
  { id: 'jul', period: 'Jul', actual: 58, target: 65 },
  { id: 'mar', period: 'Mar', actual: 72, target: 55 },
  { id: 'sep', period: 'Sep', actual: 39, target: 76 },
  { id: 'jun', period: 'Jun', actual: 78, target: 61 },
  { id: 'may', period: 'May', actual: 62, target: 59 },
]
const interruptedUpdate: UpdateRow[] = [
  { id: 'may', period: 'May', actual: 88, target: 70 },
  { id: 'oct', period: 'Oct', actual: 54, target: 82 },
  { id: 'mar', period: 'Mar', actual: 33, target: 48 },
  { id: 'aug', period: 'Aug', actual: 91, target: 77 },
  { id: 'apr', period: 'Apr', actual: 43, target: 63, featured: true },
  { id: 'sep', period: 'Sep', actual: 74, target: 80 },
  { id: 'jan', period: 'Jan', actual: 66, target: 52 },
  { id: 'jul', period: 'Jul', actual: 49, target: 68 },
]

const timing = (context: ChartMotionContext<UpdateRow>) => {
  if (context.role === 'line') {
    return {
      delay: context.phase === 'enter' ? 80 : 0,
      transition: { ...spring, stiffness: 135 },
    }
  }
  if (context.phase === 'exit') {
    return {
      transition: { ...spring, stiffness: 215, damping: 17 },
    }
  }
  const datum = context.datum as UpdateRow | undefined
  if (datum?.featured) {
    return {
      delay: context.phase === 'enter' ? 180 : 0,
      transition: { ...spring, mass: 1.35 },
    }
  }
  return undefined
}

const renderer = motion<UpdateRow, string, number>({ transition: spring })

export function mount(root: HTMLElement) {
  root.className = 'motion-update-poc'
  root.innerHTML = `<header><h1>Retained spring controller</h1><output>Initial entrance</output></header><div data-chart></div>`
  installStyles(root.ownerDocument)
  const chart = root.querySelector<HTMLElement>('[data-chart]')!
  const output = root.querySelector<HTMLOutputElement>('output')!
  let surface: ChartSurface<UpdateRow, string, number> | undefined
  let focusedId = ''
  const options = (rows: UpdateRow[]) => ({
    definition: chartDefinition(rows),
    renderer,
    width,
    height,
    ariaLabel: 'Interrupted motion chart',
    onRender(context: { surface: ChartSurface<UpdateRow, string, number> }) {
      surface = context.surface
    },
    onFocusChange(point: ChartPoint<UpdateRow> | null) {
      focusedId = point?.datum.id ?? ''
      root.dataset.focusedDatum = focusedId
    },
  })
  const host = mountChartRenderer(chart, options(initialRows))
  const firstTimer = window.setTimeout(() => {
    output.value = 'Reorder, insert, and remove'
    root.dataset.stage = 'first-update'
    host.update(options(firstUpdate))
  }, 1_600)
  const interruptTimer = window.setTimeout(() => {
    output.value = 'Interrupted at 400 ms'
    root.dataset.stage = 'interrupted-update'
    const before = readBarGeometry(chart)
    host.update(options(interruptedUpdate))
    root.dataset.interruptionDelta = String(
      maximumGeometryDelta(before, readBarGeometry(chart)),
    )
  }, 2_000)

  return {
    captureDurationMs: 3_700,
    probeInteraction() {
      const scene = host.getScene()
      const points = surface?.getPresentationPoints?.() as
        readonly ChartPoint<UpdateRow>[] | undefined
      const point =
        points?.find((candidate) => candidate.datum.id === 'apr') ?? points?.[0]
      const svg = chart.querySelector<SVGSVGElement>('svg.ts-chart')
      if (!point || !svg) return { expectedId: '', focusedId, error: null }
      const bounds = svg.getBoundingClientRect()
      const clientX = bounds.left + (point.x / scene.width) * bounds.width
      const clientY = bounds.top + (point.y / scene.height) * bounds.height
      svg.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          clientX,
          clientY,
        }),
      )
      const focused = surface
        ?.getPresentationPoints?.()
        ?.find((candidate) => candidate.datum.id === focusedId)
      return {
        expectedId: point.datum.id,
        focusedId,
        error: focused
          ? Math.hypot(focused.x - point.x, focused.y - point.y)
          : null,
      }
    },
    destroy() {
      window.clearTimeout(firstTimer)
      window.clearTimeout(interruptTimer)
      host.destroy()
    },
  }
}

function readBarGeometry(container: HTMLElement) {
  return new Map(
    [
      ...container.querySelectorAll<SVGRectElement>(
        'g.ts-chart__bar-y > rect[data-ts-key]',
      ),
    ].map((bar) => [
      bar.dataset.tsKey!,
      ['x', 'y', 'width', 'height'].map((name) =>
        Number(bar.getAttribute(name)),
      ),
    ]),
  )
}

function maximumGeometryDelta(
  before: Map<string, number[]>,
  after: Map<string, number[]>,
) {
  let maximum = 0
  for (const [key, values] of after) {
    const previous = before.get(key)
    if (!previous) continue
    for (let index = 0; index < values.length; index++) {
      maximum = Math.max(
        maximum,
        Math.abs((values[index] ?? 0) - (previous[index] ?? 0)),
      )
    }
  }
  return maximum
}

function chartDefinition(
  rows: UpdateRow[],
): DomChartDefinition<UpdateRow, string, number> {
  return defineChart(
    {
      motion: timing,
      marks: [
        barY(rows, {
          x: 'period',
          y: 'actual',
          key: 'id',
          fill: '#7c3aed',
          radius: 7,
          inset: 4,
        }),
        lineY(rows, {
          x: 'period',
          y: 'target',
          key: 'id',
          stroke: '#f97316',
          strokeWidth: 3,
          points: true,
        }),
      ],
      scales: {
        x: { scale: scaleBand().domain(rows.map((row) => row.period)) },
        y: { scale: scaleLinear().domain([0, 100]) },
      },

      guides: false,
      margin: { top: 24, right: 24, bottom: 24, left: 24 },
    },
    {
      maxFocusDistance: 28,
    },
  )
}

function installStyles(document: Document) {
  if (document.querySelector('[data-motion-update-poc-styles]')) return
  const style = document.createElement('style')
  style.dataset.motionUpdatePocStyles = ''
  style.textContent = `
    html, body { margin: 0; background: #f4f4f5; color: #18181b; }
    body { font-family: ui-sans-serif, system-ui, sans-serif; }
    .motion-update-poc { width: ${width}px; margin: 20px; padding: 20px; border: 1px solid #e4e4e7; border-radius: 16px; background: white; box-shadow: 0 12px 36px rgb(0 0 0 / 0.08); }
    .motion-update-poc header { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 12px; }
    .motion-update-poc h1 { margin: 0; font-size: 15px; font-weight: 680; }
    .motion-update-poc output { color: #71717a; font-size: 13px; }
    .motion-update-poc [data-chart] { width: ${width}px; height: ${height}px; }
    .motion-update-poc svg { display: block; overflow: visible; }
  `
  document.head.append(style)
}
