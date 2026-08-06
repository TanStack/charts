import { barY, defineChart, lineY } from '@tanstack/charts'
import { motion } from '@tanstack/charts/motion'
import { mountChartRenderer } from '@tanstack/charts/renderer'
import { scaleBand, scaleLinear } from 'd3-scale'
import { readChartMotionState, settleChartMotion } from '../../shared/motion'
import { definitionMotionStages } from './model'
import { tanstackCase } from '../../shared/mount'
import type {
  ChartRendererHost,
  ChartRendererHostOptions,
} from '@tanstack/charts'
import type { DefinitionMotionRow } from './model'
import type {
  ConformanceInput,
  ConformanceMount,
  ConformanceTestDriver,
} from '../../types'

const renderer = motion<DefinitionMotionRow, string, number>()

export const mount: ConformanceMount = (container, input) => {
  let currentInput = input
  let stage = Math.abs(input.revision) % definitionMotionStages.length
  let interruptionCount = 0
  let timer: number | undefined
  let host: ChartRendererHost<DefinitionMotionRow, string, number> | undefined
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
      220,
      currentInput.height - controls.root.getBoundingClientRect().height,
    )
  const options = (): ChartRendererHostOptions<
    DefinitionMotionRow,
    string,
    number
  > => ({
    definition: definitionMotionDefinition(
      definitionMotionStages[stage] ?? definitionMotionStages[0],
    ),
    renderer,
    width: currentInput.width,
    height: chartHeight(),
    ariaLabel: 'Definition-owned chart, mark, datum, and guide motion',
  })
  const updateChart = () => {
    host?.update(options())
    controls.status.value = `Stage ${stage + 1} of ${definitionMotionStages.length}`
  }
  const advance = () => {
    clearTimer(container.ownerDocument.defaultView, timer)
    timer = undefined
    stage = (stage + 1) % definitionMotionStages.length
    updateChart()
  }
  const interrupt = () => {
    clearTimer(container.ownerDocument.defaultView, timer)
    stage = 1
    updateChart()
    controls.status.value = 'Retargeting in 220 ms'
    timer = container.ownerDocument.defaultView?.setTimeout(() => {
      stage = 2
      interruptionCount += 1
      updateChart()
      timer = undefined
    }, 220)
  }
  const replay = () => {
    clearTimer(container.ownerDocument.defaultView, timer)
    timer = undefined
    host?.destroy()
    stage = 0
    host = mountChartRenderer(chart, options())
    controls.status.value = `Stage 1 of ${definitionMotionStages.length}`
  }

  controls.update.addEventListener('click', advance)
  controls.interrupt.addEventListener('click', interrupt)
  controls.replay.addEventListener('click', replay)
  host = mountChartRenderer(chart, options())
  controls.status.value = `Stage ${stage + 1} of ${definitionMotionStages.length}`

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
        interruptionCount,
        motionState: readChartMotionState(chart),
      }
    },
    settle: () => settleChartMotion(chart, 5_000),
  }

  return {
    driver,
    update(nextInput: ConformanceInput) {
      clearTimer(container.ownerDocument.defaultView, timer)
      timer = undefined
      currentInput = nextInput
      stage = Math.abs(nextInput.revision) % definitionMotionStages.length
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

export function definitionMotionDefinition(
  rows: readonly DefinitionMotionRow[],
) {
  const maximum = Math.max(100, ...rows.map((row) => row.actual))
  const yMaximum = Math.ceil(maximum / 20) * 20
  const guideMotion = {
    transition: {
      type: 'tween' as const,
      duration: 260,
      easing: 'ease-out' as const,
    },
  }
  return defineChart({
    motion: {
      transition: { type: 'spring', stiffness: 170, damping: 18, mass: 1 },
    },
    marks: [
      barY(rows, {
        id: 'actual',
        x: 'period',
        y: 'actual',
        key: 'id',
        fill: '#7c3aed',
        radius: 6,
        inset: 5,
        motion(context) {
          return {
            delay: context.phase === 'enter' ? context.datumIndex * 34 : 0,
            transition: context.datum?.featured
              ? { type: 'spring', mass: 1.45 }
              : undefined,
          }
        },
      }),
      lineY(rows, {
        id: 'target',
        x: 'period',
        y: 'target',
        key: 'id',
        stroke: '#f97316',
        strokeWidth: 3,
        motion: {
          transition: {
            type: 'tween',
            duration: 520,
            easing: 'ease-in-out',
          },
        },
      }),
    ],
    x: {
      scale: scaleBand().domain(rows.map((row) => row.period)),
      axis: {
        motion: guideMotion,
        ticks: { motion: guideMotion },
        tickLabels: {
          motion(context) {
            return {
              delay: context.datumIndex * 18,
              transition: { type: 'tween', duration: 220 },
            }
          },
        },
        label: { text: 'Period', motion: guideMotion },
      },
    },
    y: {
      scale: scaleLinear().domain([0, yMaximum]),
      grid: true,
      axis: {
        motion: guideMotion,
        ticks: { motion: guideMotion },
        tickLabels: { motion: guideMotion },
        label: { text: 'Value', motion: guideMotion },
      },
    },
    margin: { top: 20, right: 24 },
    maxFocusDistance: 32,
  })
}

export const catalogCase = tanstackCase(
  (input) =>
    definitionMotionDefinition(
      definitionMotionStages[
        Math.abs(input.revision) % definitionMotionStages.length
      ] ?? definitionMotionStages[0],
    ),
  'Definition-owned chart, mark, datum, and guide motion',
)

function createControls(document: Document) {
  const root = document.createElement('div')
  root.setAttribute('role', 'group')
  root.setAttribute('aria-label', 'Definition motion controls')
  Object.assign(root.style, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: '8px',
    padding: '10px',
    font: '500 12px/1.2 system-ui, sans-serif',
  })
  const update = button(document, 'Update')
  const interrupt = button(document, 'Interrupt')
  const replay = button(document, 'Replay')
  const status = document.createElement('output')
  status.setAttribute('aria-live', 'polite')
  status.style.opacity = '0.7'
  root.append(update, interrupt, replay, status)
  return { root, update, interrupt, replay, status }
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
