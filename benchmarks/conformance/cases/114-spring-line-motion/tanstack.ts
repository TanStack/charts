import { defineChart, lineY } from '@tanstack/charts'
import { motion } from '@tanstack/charts/motion'
import { mountChartRenderer } from '@tanstack/charts/renderer'
import { scaleBand, scaleLinear } from 'd3-scale'
import { readChartMotionState, settleChartMotion } from '../../shared/motion'
import { springLineStages } from './model'
import type {
  ChartRenderer,
  ChartRendererHost,
  ChartRendererHostOptions,
} from '@tanstack/charts'
import type { SpringLineRow } from './model'
import type {
  ConformanceInput,
  ConformanceMount,
  ConformanceTestDriver,
} from '../../types'

export type SpringLineTransitionMode = 'spring' | 'tween'

export const mount: ConformanceMount = (container, input) => {
  let currentInput = input
  let stage = Math.abs(input.revision) % springLineStages.length
  let mode: SpringLineTransitionMode = 'spring'
  let interruptionCount = 0
  let timer: number | undefined
  let host: ChartRendererHost<SpringLineRow, string, number> | undefined
  let renderer: ChartRenderer<SpringLineRow, string, number> | undefined
  const view = container.ownerDocument.createElement('div')
  const controls = createControls(container.ownerDocument)
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
  const options = ():
    ChartRendererHostOptions<SpringLineRow, string, number> | undefined => {
    if (!renderer) return undefined
    return {
      definition: springLineMotionDefinition(
        springLineStages[stage] ?? springLineStages[0],
        mode,
      ),
      renderer,
      width: currentInput.width,
      height: chartHeight(),
      ariaLabel: 'Primary and comparison series with spring motion',
    }
  }
  const updateChart = () => {
    const next = options()
    if (next) host?.update(next)
    controls.status.value = `Stage ${stage + 1} of ${springLineStages.length}`
  }
  const rebuild = () => {
    clearTimer(container.ownerDocument.defaultView, timer)
    timer = undefined
    host?.destroy()
    renderer = motion<SpringLineRow, string, number>()
    const next = options()
    if (next) host = mountChartRenderer(chart, next)
    controls.status.value = `Stage ${stage + 1} of ${springLineStages.length}`
  }
  const update = () => {
    clearTimer(container.ownerDocument.defaultView, timer)
    timer = undefined
    stage = (stage + 1) % springLineStages.length
    updateChart()
  }
  const interrupt = () => {
    clearTimer(container.ownerDocument.defaultView, timer)
    stage = 1
    updateChart()
    controls.status.value = 'Reversing in 260 ms'
    timer = container.ownerDocument.defaultView?.setTimeout(() => {
      stage = 2
      interruptionCount += 1
      updateChart()
      timer = undefined
    }, 260)
  }
  const replay = () => {
    stage = 0
    rebuild()
  }

  controls.transition.addEventListener('change', () => {
    mode = controls.transition.value === 'tween' ? 'tween' : 'spring'
    replay()
  })
  controls.update.addEventListener('click', update)
  controls.interrupt.addEventListener('click', interrupt)
  controls.replay.addEventListener('click', replay)
  rebuild()

  const driver: ConformanceTestDriver = {
    resolveTarget(target) {
      if (target.view && target.view !== 'main') return null
      const control =
        target.anchor === 'control:update'
          ? controls.update
          : target.anchor === 'control:interrupt'
            ? controls.interrupt
            : target.anchor === 'control:replay'
              ? controls.replay
              : null
      if (!control) return null
      const bounds = control.getBoundingClientRect()
      return {
        x: bounds.left + bounds.width / 2,
        y: bounds.top + bounds.height / 2,
        focusElement: control,
      }
    },
    readState() {
      return {
        stage,
        mode,
        interruptionCount,
        motionState: readChartMotionState(chart),
      }
    },
    settle: () => settleChartMotion(chart, mode === 'spring' ? 5_000 : 1_500),
  }

  return {
    driver,
    update(nextInput: ConformanceInput) {
      clearTimer(container.ownerDocument.defaultView, timer)
      timer = undefined
      currentInput = nextInput
      stage = Math.abs(nextInput.revision) % springLineStages.length
      view.style.height = `${nextInput.height}px`
      updateChart()
    },
    destroy() {
      clearTimer(container.ownerDocument.defaultView, timer)
      host?.destroy()
      view.remove()
    },
  }
}

export function springLineMotionDefinition(
  rows: readonly SpringLineRow[],
  mode: SpringLineTransitionMode,
) {
  return defineChart({
    motion: {
      transition:
        mode === 'spring'
          ? { type: 'spring', stiffness: 170, damping: 18, mass: 1 }
          : { type: 'tween', duration: 650, easing: 'ease-out' },
    },
    marks: [
      lineY(rows, {
        id: 'primary',
        x: 'period',
        y: 'primary',
        key: 'id',
        stroke: '#7c3aed',
        strokeWidth: 4,
      }),
      lineY(rows, {
        id: 'comparison',
        x: 'period',
        y: 'comparison',
        key: 'id',
        stroke: '#f97316',
        strokeWidth: 3,
        motion(context) {
          return {
            delay: context.phase === 'enter' ? 90 : 0,
            transition:
              mode === 'spring'
                ? { type: 'spring', mass: 1.2 }
                : {
                    type: 'tween',
                    duration: 820,
                    easing: 'ease-in-out',
                  },
          }
        },
      }),
    ],
    x: { scale: scaleBand().domain(rows.map((row) => row.period)) },
    y: { scale: scaleLinear().domain([0, 100]) },
    guides: false,
    margin: { top: 24, right: 24, bottom: 24, left: 24 },
  })
}

function createControls(document: Document) {
  const root = document.createElement('div')
  root.setAttribute('role', 'group')
  root.setAttribute('aria-label', 'Line motion controls')
  Object.assign(root.style, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: '8px',
    padding: '10px',
    font: '500 12px/1.2 system-ui, sans-serif',
  })
  const transition = document.createElement('select')
  transition.setAttribute('aria-label', 'Transition')
  for (const [value, label] of [
    ['spring', 'Spring'],
    ['tween', 'Tween'],
  ]) {
    const option = document.createElement('option')
    option.value = value
    option.textContent = label
    transition.append(option)
  }
  const update = button(document, 'Update')
  const interrupt = button(document, 'Interrupt')
  const replay = button(document, 'Replay')
  const status = document.createElement('output')
  status.setAttribute('aria-live', 'polite')
  status.style.opacity = '0.7'
  root.append(transition, update, interrupt, replay, status)
  return { root, transition, update, interrupt, replay, status }
}

function button(document: Document, label: string) {
  const control = document.createElement('button')
  control.type = 'button'
  control.textContent = label
  control.style.padding = '0 14px'
  return control
}

function clearTimer(view: Window | null, timer: number | undefined) {
  if (timer !== undefined) view?.clearTimeout(timer)
}
