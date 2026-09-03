import { barY, defineChart, lineY } from '@tanstack/charts'
import { motion } from '@tanstack/charts/motion'
import { mountChartRenderer } from '@tanstack/charts/renderer'
import { createChartScene } from '@tanstack/charts/scene'
import { renderChartSvg } from '@tanstack/charts/svg'
import { scaleBand, scaleLinear } from 'd3-scale'
import type { ChartMotionRole, ChartScene } from '@tanstack/charts'

interface MotionRow {
  id: string
  period: string
  actual: number
  target: number
  featured?: boolean
}

const width = 480
const height = 300
const duration = 1_100
const rows: MotionRow[] = [
  { id: 'jan', period: 'Jan', actual: 26, target: 30 },
  { id: 'feb', period: 'Feb', actual: 38, target: 34 },
  { id: 'mar', period: 'Mar', actual: 44, target: 42 },
  { id: 'apr', period: 'Apr', actual: 58, target: 49, featured: true },
  { id: 'may', period: 'May', actual: 52, target: 55 },
  { id: 'jun', period: 'Jun', actual: 69, target: 62 },
  { id: 'jul', period: 'Jul', actual: 76, target: 70 },
  { id: 'aug', period: 'Aug', actual: 84, target: 79 },
]

const timing = (context: {
  role: ChartMotionRole
  datumIndex: number
  datum?: unknown
}) => {
  if (context.role === 'line') {
    return {
      delay: 120,
      transition: { type: 'tween' as const, duration: 850 },
    }
  }
  const datum = context.datum as MotionRow | undefined
  if (datum?.featured) {
    return {
      delay: 210,
      transition: { type: 'tween' as const, duration: 720 },
    }
  }
  return undefined
}

const baseDefinition = defineChart({
  motion: timing,
  marks: [
    barY(rows, {
      x: 'period',
      y: 'actual',
      key: 'id',
      fill: '#7c3aed',
      radius: 6,
      inset: 3,
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
  margin: { top: 20, right: 20, bottom: 20, left: 20 },
})

export function mount(root: HTMLElement) {
  root.className = 'motion-poc'
  root.innerHTML = `
    <section data-motion-panel="reference"><h2>Bklit-derived reference</h2><div></div></section>
    <section data-motion-panel="candidate"><h2>TanStack motion POC</h2><div></div></section>
  `
  installStyles(root.ownerDocument)
  const reference = root.querySelector<HTMLElement>(
    '[data-motion-panel="reference"] > div',
  )!
  const candidate = root.querySelector<HTMLElement>(
    '[data-motion-panel="candidate"] > div',
  )!
  const scene = createChartScene(baseDefinition, { width, height })
  reference.innerHTML = renderChartSvg(scene, {
    ariaLabel: 'Bklit-derived motion reference',
    idPrefix: 'reference',
  })
  const cancelReference = animateBklitReference(reference, scene)
  const renderer = motion<MotionRow, string, number>({
    transition: { type: 'tween', duration },
  })
  const host = mountChartRenderer(candidate, {
    definition: baseDefinition,
    renderer,
    width,
    height,
    ariaLabel: 'TanStack motion POC',
    idPrefix: 'candidate',
  })
  return {
    captureDurationMs: duration * 1.4,
    destroy() {
      cancelReference()
      host.destroy()
    },
  }
}

function animateBklitReference(container: HTMLElement, scene: ChartScene) {
  const root = container.querySelector<SVGSVGElement>('svg.ts-chart')!
  const points = new Map(scene.points.map((point) => [point.key, point]))
  const tracks: ReferenceTrack[] = []
  const bars = [
    ...root.querySelectorAll<SVGRectElement>('g.ts-chart__bar-y > rect'),
  ]
  const stagger = (duration * 0.4) / bars.length
  bars.forEach((bar, index) => {
    const key = bar.getAttribute('data-ts-key') ?? String(index)
    const point = points.get(key)
    const targetY = Number(bar.getAttribute('y'))
    const targetHeight = Number(bar.getAttribute('height'))
    const baseline = scene.scales.y.map(point?.y1Value ?? 0)
    const authored = timing({
      role: 'bar',
      datumIndex: index,
      datum: point?.datum,
    })
    bar.setAttribute('y', String(baseline))
    bar.setAttribute('height', '0')
    tracks.push({
      delay: Math.min(duration * 0.4, authored?.delay ?? index * stagger),
      duration: authored?.transition?.duration ?? duration,
      apply(progress) {
        const eased = bklitEase(progress)
        bar.setAttribute('y', format(baseline + (targetY - baseline) * eased))
        bar.setAttribute('height', format(targetHeight * eased))
      },
      finish() {
        bar.setAttribute('y', format(targetY))
        bar.setAttribute('height', format(targetHeight))
      },
    })
  })

  const line = root.querySelector<SVGGElement>('g.ts-chart__line')
  if (line) {
    const definitions = root.querySelector('defs') ?? createSvg(root, 'defs')
    const clip = createSvg(root, 'clipPath')
    const clipRectangle = createSvg(root, 'rect')
    clip.id = 'bklit-reference-reveal'
    clipRectangle.setAttribute('x', String(scene.chart.x))
    clipRectangle.setAttribute('y', String(scene.chart.y))
    clipRectangle.setAttribute('width', '0')
    clipRectangle.setAttribute('height', String(scene.chart.height))
    clip.append(clipRectangle)
    definitions.append(clip)
    line.setAttribute('clip-path', 'url(#bklit-reference-reveal)')
    const authored = timing({ role: 'line', datumIndex: 0 })
    tracks.push({
      delay: authored?.delay ?? 0,
      duration: authored?.transition?.duration ?? duration,
      apply(progress) {
        clipRectangle.setAttribute(
          'width',
          format(scene.chart.width * bklitEase(progress)),
        )
      },
      finish() {
        line.removeAttribute('clip-path')
        clip.remove()
      },
    })
  }

  return runReferenceTracks(root, tracks)
}

interface ReferenceTrack {
  delay: number
  duration: number
  apply: (progress: number) => void
  finish: () => void
}

function runReferenceTracks(
  root: SVGSVGElement,
  tracks: readonly ReferenceTrack[],
) {
  let frame = 0
  let start: number | undefined
  let cancelled = false
  const total = Math.max(...tracks.map((track) => track.delay + track.duration))
  root.dataset.referenceMotionState = 'running'
  const tick = (time: number) => {
    if (cancelled) return
    start ??= time
    const elapsed = time - start
    tracks.forEach((track) => {
      const progress = Math.max(
        0,
        Math.min(1, (elapsed - track.delay) / track.duration),
      )
      track.apply(progress)
    })
    if (elapsed < total) frame = requestAnimationFrame(tick)
    else {
      tracks.forEach((track) => track.finish())
      root.dataset.referenceMotionState = 'finished'
    }
  }
  frame = requestAnimationFrame(tick)
  return () => {
    cancelled = true
    cancelAnimationFrame(frame)
  }
}

function createSvg<TName extends keyof SVGElementTagNameMap>(
  root: SVGSVGElement,
  name: TName,
) {
  const element = root.ownerDocument.createElementNS(
    'http://www.w3.org/2000/svg',
    name,
  )
  if (name === 'defs') root.prepend(element)
  return element
}

function bklitEase(progress: number) {
  return cubicBezier(progress, 0.85, 0, 0.15, 1)
}

function cubicBezier(
  progress: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) {
  const sample = (time: number, first: number, second: number) => {
    const inverse = 1 - time
    return (
      3 * inverse * inverse * time * first +
      3 * inverse * time * time * second +
      time * time * time
    )
  }
  let low = 0
  let high = 1
  let time = progress
  for (let iteration = 0; iteration < 12; iteration++) {
    time = (low + high) / 2
    if (sample(time, x1, x2) < progress) low = time
    else high = time
  }
  return sample(time, y1, y2)
}

function format(value: number) {
  return String(Math.round(value * 1_000) / 1_000)
}

function installStyles(document: Document) {
  if (document.querySelector('[data-motion-poc-styles]')) return
  const style = document.createElement('style')
  style.dataset.motionPocStyles = ''
  style.textContent = `
    html, body { margin: 0; background: #f4f4f5; color: #18181b; }
    body { font-family: ui-sans-serif, system-ui, sans-serif; }
    .motion-poc { display: grid; grid-template-columns: repeat(2, 520px); gap: 20px; padding: 20px; }
    .motion-poc section { margin: 0; padding: 16px; border: 1px solid #e4e4e7; border-radius: 14px; background: white; box-shadow: 0 8px 30px rgb(0 0 0 / 0.06); }
    .motion-poc h2 { margin: 0 0 12px; font-size: 14px; font-weight: 650; }
    .motion-poc section > div { width: ${width}px; height: ${height}px; }
    .motion-poc svg { display: block; overflow: visible; }
  `
  document.head.append(style)
}
