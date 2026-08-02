import { barY, defineChart, lineY } from '@tanstack/charts'
import { motion } from '@tanstack/charts/motion'
import { mountChartRenderer } from '@tanstack/charts/renderer'
import { scaleBand, scaleLinear } from 'd3-scale'
import { entranceRows as rows } from './model'
import type {
  ChartMotionTweenTransition,
  ChartRenderer,
  ChartRendererHost,
} from '@tanstack/charts'
import type { MotionRow } from './model'
import type {
  ConformanceInput,
  ConformanceMount,
  ConformanceTestDriver,
} from '../../types'

interface MotionSettings {
  duration: number
  staggerMs: number
  easing: ChartMotionTweenTransition['easing']
  customTiming: boolean
}

export const mount: ConformanceMount = (container, input) => {
  let currentInput = input
  let replayCount = 0
  let host: ChartRendererHost<MotionRow, string, number> | undefined
  let renderer: ChartRenderer<MotionRow, string, number> | undefined
  const settings: MotionSettings = {
    duration: 1_100,
    staggerMs: 55,
    easing: undefined,
    customTiming: true,
  }
  const view = container.ownerDocument.createElement('div')
  const controls = createControls(container.ownerDocument, settings)
  const chart = container.ownerDocument.createElement('div')
  view.dataset.conformanceView = 'main'
  Object.assign(view.style, {
    display: 'grid',
    gridTemplateRows: 'auto minmax(0, 1fr)',
    height: `${input.height}px`,
    color: 'CanvasText',
  })
  chart.style.minHeight = '0'
  view.append(controls.root, chart)
  container.append(view)
  const chartHeight = () =>
    Math.max(
      180,
      currentInput.height - controls.root.getBoundingClientRect().height,
    )

  const replay = () => {
    host?.destroy()
    replayCount += 1
    renderer = motion<MotionRow, string, number>()
    host = mountChartRenderer(chart, {
      definition: chartDefinition(settings),
      renderer,
      width: currentInput.width,
      height: chartHeight(),
      ariaLabel: 'Staggered monthly actuals and target',
    })
  }

  controls.replay.addEventListener('click', replay)
  controls.duration.addEventListener('input', () => {
    controls.durationValue.value = `${controls.duration.value} ms`
  })
  controls.duration.addEventListener('change', () => {
    settings.duration = Number(controls.duration.value)
    replay()
  })
  controls.stagger.addEventListener('input', () => {
    controls.staggerValue.value = `${controls.stagger.value} ms`
  })
  controls.stagger.addEventListener('change', () => {
    settings.staggerMs = Number(controls.stagger.value)
    replay()
  })
  controls.easing.addEventListener('change', () => {
    settings.easing = readEasing(controls.easing.value)
    replay()
  })
  controls.customTiming.addEventListener('change', () => {
    settings.customTiming = controls.customTiming.checked
    replay()
  })
  replay()

  const driver: ConformanceTestDriver = {
    resolveTarget(target) {
      if (target.view && target.view !== 'main') return null
      if (target.anchor !== 'control:replay') return null
      const bounds = controls.replay.getBoundingClientRect()
      return {
        x: bounds.left + bounds.width / 2,
        y: bounds.top + bounds.height / 2,
        focusElement: controls.replay,
      }
    },
    readState() {
      return {
        duration: settings.duration,
        staggerMs: settings.staggerMs,
        customTiming: settings.customTiming,
        replayCount,
        motionState:
          chart
            .querySelector('svg.ts-chart')
            ?.getAttribute('data-ts-motion-state') ?? null,
      }
    },
    settle: () => settleMotion(chart, settings.duration * 1.6),
  }

  return {
    driver,
    update(nextInput) {
      currentInput = nextInput
      view.style.height = `${nextInput.height}px`
      if (!renderer) return
      host?.update({
        definition: chartDefinition(settings),
        renderer,
        width: nextInput.width,
        height: chartHeight(),
        ariaLabel: 'Staggered monthly actuals and target',
      })
    },
    destroy() {
      host?.destroy()
      view.remove()
    },
  }
}

function chartDefinition(settings: MotionSettings) {
  const { duration, easing, staggerMs, customTiming } = settings
  return defineChart({
    motion: {
      transition: { type: 'tween', duration, easing },
    },
    marks: [
      barY(rows, {
        x: 'period',
        y: 'actual',
        key: 'id',
        fill: '#7c3aed',
        radius: 7,
        inset: 4,
        motion(context) {
          if (customTiming && context.datum?.featured) {
            return {
              delay: duration * 0.19,
              transition: { type: 'tween', duration: duration * 0.64 },
            }
          }
          return { delay: context.datumIndex * staggerMs }
        },
      }),
      lineY(rows, {
        x: 'period',
        y: 'target',
        key: 'id',
        stroke: '#f97316',
        strokeWidth: 3,
        motion: customTiming
          ? {
              delay: duration * 0.1,
              transition: { type: 'tween', duration: duration * 0.78 },
            }
          : undefined,
      }),
    ],
    x: { scale: scaleBand().domain(rows.map((row) => row.period)) },
    y: { scale: scaleLinear().domain([0, 100]) },
    guides: false,
    margin: { top: 20, right: 20, bottom: 20, left: 20 },
  })
}

function readEasing(value: string): MotionSettings['easing'] {
  return value === 'linear' ||
    value === 'ease' ||
    value === 'ease-in' ||
    value === 'ease-out' ||
    value === 'ease-in-out'
    ? value
    : undefined
}

function createControls(document: Document, settings: MotionSettings) {
  const root = document.createElement('div')
  root.setAttribute('role', 'group')
  root.setAttribute('aria-label', 'Entrance motion controls')
  Object.assign(root.style, {
    display: 'flex',
    alignItems: 'center',
    alignContent: 'center',
    flexWrap: 'wrap',
    gap: '8px 12px',
    padding: '8px 10px',
    font: '500 12px/1.2 system-ui, sans-serif',
  })

  const duration = range(document, 300, 1_800, 100, settings.duration)
  const durationValue = document.createElement('output')
  durationValue.value = `${settings.duration} ms`
  const stagger = range(document, 0, 120, 5, settings.staggerMs)
  const staggerValue = document.createElement('output')
  staggerValue.value = `${settings.staggerMs} ms`
  const easing = document.createElement('select')
  for (const [value, label] of [
    ['polished', 'Polished'],
    ['ease', 'Ease'],
    ['ease-out', 'Ease out'],
    ['ease-in-out', 'Ease in/out'],
    ['linear', 'Linear'],
  ]) {
    const option = document.createElement('option')
    option.value = value
    option.textContent = label
    easing.append(option)
  }
  const customTiming = document.createElement('input')
  customTiming.type = 'checkbox'
  customTiming.checked = settings.customTiming
  const replay = button(document, 'Replay')
  root.append(
    field(document, 'Duration', duration, durationValue),
    field(document, 'Stagger', stagger, staggerValue),
    field(document, 'Easing', easing),
    field(document, 'Apr + line timing', customTiming),
    replay,
  )
  return {
    root,
    duration,
    durationValue,
    stagger,
    staggerValue,
    easing,
    customTiming,
    replay,
  }
}

function field(
  document: Document,
  label: string,
  control: HTMLElement,
  value?: HTMLOutputElement,
) {
  const root = document.createElement('label')
  Object.assign(root.style, {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    whiteSpace: 'nowrap',
  })
  root.append(label, control)
  if (value) root.append(value)
  return root
}

function range(
  document: Document,
  min: number,
  max: number,
  step: number,
  value: number,
) {
  const input = document.createElement('input')
  input.type = 'range'
  input.min = String(min)
  input.max = String(max)
  input.step = String(step)
  input.value = String(value)
  input.style.width = '96px'
  return input
}

function button(document: Document, label: string) {
  const control = document.createElement('button')
  control.type = 'button'
  control.textContent = label
  control.style.padding = '0 14px'
  return control
}

function settleMotion(chart: HTMLElement, timeout: number) {
  const view = chart.ownerDocument.defaultView
  if (!view) return Promise.resolve()
  const started = view.performance.now()
  return new Promise<void>((resolve) => {
    const check = () => {
      const state = chart
        .querySelector('svg.ts-chart')
        ?.getAttribute('data-ts-motion-state')
      if (
        state === 'finished' ||
        state === null ||
        view.performance.now() - started >= timeout
      ) {
        resolve()
        return
      }
      view.requestAnimationFrame(check)
    }
    check()
  })
}
