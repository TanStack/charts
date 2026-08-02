import { barY, defineChart, lineY } from '@tanstack/charts'
import { motion } from '@tanstack/charts/motion'
import { mountChartRenderer } from '@tanstack/charts/renderer'
import { scaleBand, scaleLinear } from 'd3-scale'
import { updateStages as stages } from './model'
import type {
  ChartDefinition,
  ChartRenderer,
  ChartRendererHost,
  ChartRendererHostOptions,
} from '@tanstack/charts'
import type {
  ChartMotionSpringTransition,
  ChartMotionTweenTransition,
} from '@tanstack/charts/motion'
import type { UpdateRow } from './model'
import type {
  ConformanceInput,
  ConformanceMount,
  ConformanceTestDriver,
} from '../../types'

interface UpdateSettings {
  duration: number
  easing: ChartMotionTweenTransition['easing']
  spring: boolean
  stiffness: number
  damping: number
  mass: number
}

export const mount: ConformanceMount = (container, input) => {
  let currentInput = input
  let stage = Math.abs(input.revision) % stages.length
  let interruptionCount = 0
  let timer: number | undefined
  let host: ChartRendererHost<UpdateRow, string, number> | undefined
  let renderer: ChartRenderer<UpdateRow, string, number> | undefined
  const settings: UpdateSettings = {
    duration: 1_100,
    easing: undefined,
    spring: false,
    stiffness: 170,
    damping: 14,
    mass: 1,
  }
  let activeTimeout = settings.duration * 1.6
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

  const options = ():
    ChartRendererHostOptions<UpdateRow, string, number> | undefined => {
    if (!renderer) return undefined
    return {
      definition: chartDefinition(stages[stage] ?? stages[0], settings),
      renderer,
      width: currentInput.width,
      height: chartHeight(),
      ariaLabel: 'Keyed actuals and targets during interrupted updates',
    }
  }
  const updateChart = () => {
    const next = options()
    if (next) host?.update(next)
    controls.status.value = `Stage ${stage + 1} of ${stages.length}`
  }
  const rebuild = () => {
    clearTimer(container.ownerDocument.defaultView, timer)
    timer = undefined
    host?.destroy()
    activeTimeout = settings.spring ? 5_000 : settings.duration * 1.6
    renderer = motion<UpdateRow, string, number>()
    const next = options()
    if (next) host = mountChartRenderer(chart, next)
    controls.durationField.style.display = settings.spring
      ? 'none'
      : 'inline-flex'
    controls.springFields.style.display = settings.spring ? 'contents' : 'none'
    controls.physics.value = settings.spring
      ? `${springRegime(settings)} · momentum preserved`
      : ''
    controls.status.value = `Stage ${stage + 1} of ${stages.length}`
  }
  const advance = () => {
    clearTimer(container.ownerDocument.defaultView, timer)
    timer = undefined
    stage = (stage + 1) % stages.length
    updateChart()
  }
  const interrupt = () => {
    clearTimer(container.ownerDocument.defaultView, timer)
    stage = 1
    updateChart()
    controls.status.value = 'Interrupting in 400 ms'
    timer = container.ownerDocument.defaultView?.setTimeout(() => {
      stage = 2
      interruptionCount += 1
      updateChart()
      timer = undefined
    }, 400)
  }
  const replay = () => {
    stage = 0
    rebuild()
  }

  controls.advance.addEventListener('click', advance)
  controls.interrupt.addEventListener('click', interrupt)
  controls.replay.addEventListener('click', replay)
  controls.duration.addEventListener('input', () => {
    controls.durationValue.value = `${controls.duration.value} ms`
  })
  controls.duration.addEventListener('change', () => {
    settings.duration = Number(controls.duration.value)
    rebuild()
  })
  controls.easing.addEventListener('change', () => {
    settings.spring = controls.easing.value === 'spring'
    settings.easing = readEasing(controls.easing.value)
    rebuild()
  })
  for (const [control, output, key, suffix] of [
    [controls.stiffness, controls.stiffnessValue, 'stiffness', ''],
    [controls.damping, controls.dampingValue, 'damping', ''],
    [controls.mass, controls.massValue, 'mass', '×'],
  ] as const) {
    control.addEventListener('input', () => {
      output.value = `${control.value}${suffix}`
    })
    control.addEventListener('change', () => {
      settings[key] = Number(control.value)
      rebuild()
    })
  }
  rebuild()

  const driver: ConformanceTestDriver = {
    resolveTarget(target) {
      if (target.view && target.view !== 'main') return null
      const control =
        target.anchor === 'control:update'
          ? controls.advance
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
        interruptionCount,
        ids: (stages[stage] ?? stages[0]).map((row) => row.id),
        motionState:
          chart
            .querySelector('svg.ts-chart')
            ?.getAttribute('data-ts-motion-state') ?? null,
      }
    },
    settle: () => settleMotion(chart, activeTimeout),
  }

  return {
    driver,
    update(nextInput) {
      clearTimer(container.ownerDocument.defaultView, timer)
      timer = undefined
      currentInput = nextInput
      stage = Math.abs(nextInput.revision) % stages.length
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

function chartDefinition(
  rows: readonly UpdateRow[],
  settings: UpdateSettings,
): ChartDefinition<UpdateRow, string, number> {
  return defineChart({
    motion: {
      transition: settings.spring
        ? springTransition(settings)
        : {
            type: 'tween',
            duration: settings.duration,
            easing: settings.easing,
          },
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
          if (settings.spring) {
            if (context.phase === 'exit') {
              return {
                transition: {
                  type: 'spring',
                  stiffness: settings.stiffness * 1.25,
                  damping: settings.damping * 1.15,
                },
              }
            }
            if (context.datum?.featured) {
              return {
                delay: context.phase === 'enter' ? 70 : 0,
                transition: {
                  type: 'spring',
                  mass: settings.mass * 1.35,
                },
              }
            }
            return undefined
          }
          if (context.phase === 'exit') {
            return {
              transition: {
                type: 'tween',
                duration: settings.duration * 0.45,
              },
            }
          }
          if (context.datum?.featured) {
            return {
              delay: settings.duration * 0.16,
              transition: {
                type: 'tween',
                duration: settings.duration * 0.6,
              },
            }
          }
          return undefined
        },
      }),
      lineY(rows, {
        x: 'period',
        y: 'target',
        key: 'id',
        stroke: '#f97316',
        strokeWidth: 3,
        motion: {
          delay: 80,
          transition: settings.spring
            ? {
                type: 'spring',
                stiffness: settings.stiffness * 0.78,
              }
            : {
                type: 'tween',
                duration: settings.duration * 0.82,
              },
        },
      }),
    ],
    x: { scale: scaleBand().domain(rows.map((row) => row.period)) },
    y: { scale: scaleLinear().domain([0, 100]) },
    guides: false,
    margin: { top: 20, right: 20, bottom: 20, left: 20 },
    maxFocusDistance: 28,
  })
}

function clearTimer(view: Window | null, timer: number | undefined) {
  if (timer !== undefined) view?.clearTimeout(timer)
}

function readEasing(value: string): UpdateSettings['easing'] {
  return value === 'linear' ||
    value === 'ease' ||
    value === 'ease-in' ||
    value === 'ease-out' ||
    value === 'ease-in-out'
    ? value
    : undefined
}

function springRegime(settings: UpdateSettings) {
  const ratio =
    settings.damping / (2 * Math.sqrt(settings.stiffness * settings.mass))
  if (ratio < 0.99) return 'underdamped'
  if (ratio > 1.01) return 'overdamped'
  return 'critical'
}

function springTransition(
  settings: UpdateSettings,
  overrides: Partial<ChartMotionSpringTransition> = {},
): ChartMotionSpringTransition {
  return {
    type: 'spring',
    stiffness: settings.stiffness,
    damping: settings.damping,
    mass: settings.mass,
    ...overrides,
  }
}

function createControls(document: Document, settings: UpdateSettings) {
  const root = document.createElement('div')
  root.setAttribute('role', 'group')
  root.setAttribute('aria-label', 'Keyed update motion controls')
  Object.assign(root.style, {
    display: 'flex',
    alignItems: 'center',
    alignContent: 'center',
    flexWrap: 'wrap',
    gap: '8px 12px',
    padding: '8px 10px',
    font: '500 12px/1.2 system-ui, sans-serif',
  })

  const duration = document.createElement('input')
  duration.type = 'range'
  duration.min = '300'
  duration.max = '1800'
  duration.step = '100'
  duration.value = String(settings.duration)
  duration.style.width = '96px'
  const durationValue = document.createElement('output')
  durationValue.value = `${settings.duration} ms`
  const easing = document.createElement('select')
  for (const [value, label] of [
    ['polished', 'Tween · Polished'],
    ['spring', 'Spring'],
    ['ease', 'Tween · Ease'],
    ['ease-out', 'Tween · Ease out'],
    ['ease-in-out', 'Tween · Ease in/out'],
    ['linear', 'Tween · Linear'],
  ]) {
    const option = document.createElement('option')
    option.value = value
    option.textContent = label
    easing.append(option)
  }
  const stiffness = range(document, 40, 400, 10, settings.stiffness)
  const stiffnessValue = document.createElement('output')
  stiffnessValue.value = String(settings.stiffness)
  const damping = range(document, 0, 50, 1, settings.damping)
  const dampingValue = document.createElement('output')
  dampingValue.value = String(settings.damping)
  const mass = range(document, 0.25, 3, 0.25, settings.mass)
  const massValue = document.createElement('output')
  massValue.value = `${settings.mass}×`
  const springFields = document.createElement('span')
  springFields.style.display = 'none'
  springFields.append(
    field(document, 'Stiffness', stiffness, stiffnessValue),
    field(document, 'Damping', damping, dampingValue),
    field(document, 'Mass', mass, massValue),
  )
  const physics = document.createElement('output')
  physics.style.opacity = '0.7'
  const advance = button(document, 'Update')
  const interrupt = button(document, 'Interrupt')
  const replay = button(document, 'Replay')
  const status = document.createElement('output')
  status.setAttribute('aria-live', 'polite')
  status.style.opacity = '0.7'
  const durationField = field(document, 'Duration', duration, durationValue)
  root.append(
    durationField,
    field(document, 'Transition', easing),
    springFields,
    physics,
    advance,
    interrupt,
    replay,
    status,
  )
  return {
    root,
    durationField,
    duration,
    durationValue,
    easing,
    stiffness,
    stiffnessValue,
    damping,
    dampingValue,
    mass,
    massValue,
    springFields,
    physics,
    advance,
    interrupt,
    replay,
    status,
  }
}

function range(
  document: Document,
  min: number,
  max: number,
  step: number,
  value: number,
) {
  const control = document.createElement('input')
  control.type = 'range'
  control.min = String(min)
  control.max = String(max)
  control.step = String(step)
  control.value = String(value)
  control.style.width = '88px'
  return control
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
