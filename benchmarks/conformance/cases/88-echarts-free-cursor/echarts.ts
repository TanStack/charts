import { LineChart } from 'echarts/charts'
import {
  AriaComponent,
  AxisPointerComponent,
  GridComponent,
  TooltipComponent,
} from 'echarts/components'
import { use } from 'echarts/core'
import { SVGRenderer } from 'echarts/renderers'
import { cars } from '@charts-poc/demo-data/cars'
import type { LineSeriesOption } from 'echarts/charts'
import type {
  AriaComponentOption,
  AxisPointerComponentOption,
  GridComponentOption,
  TooltipComponentOption,
} from 'echarts/components'
import type { ComposeOption, EChartsType } from 'echarts/core'
import { echartsMount } from '../../shared/echarts-mount'
import { clientPointBounds } from '../../shared/driver-geometry'
import {
  freeCursorFractionFromAnchor,
  freeCursorRows,
  freeCursorXDomain,
  freeCursorYDomain,
} from './model'
import { createFreeCursorControls, updateFreeCursorControls } from './controls'
import type { FreeCursorControls } from './controls'
import type {
  ConformanceGeometryQuery,
  ConformanceGeometrySample,
  ConformanceInput,
  ConformanceJsonObject,
  ConformanceMount,
  ConformanceTarget,
  ConformanceTestDriver,
} from '../../types'

use([
  LineChart,
  GridComponent,
  TooltipComponent,
  AxisPointerComponent,
  AriaComponent,
  SVGRenderer,
])

type FreeCursorOption = ComposeOption<
  | LineSeriesOption
  | GridComponentOption
  | TooltipComponentOption
  | AxisPointerComponentOption
  | AriaComponentOption
>

interface CursorState {
  visible: boolean
  xNormalized: number | null
  yNormalized: number | null
  xValue: number | null
  yValue: number | null
  pinned: boolean
}

interface PlotBounds {
  left: number
  top: number
  width: number
  height: number
}

export const mount: ConformanceMount = (container, input) => {
  const state: CursorState = {
    visible: false,
    xNormalized: null,
    yNormalized: null,
    xValue: null,
    yValue: null,
    pinned: false,
  }
  const shell = container.ownerDocument.createElement('div')
  shell.style.display = 'grid'
  shell.style.gridTemplateRows = '68px minmax(0, 1fr)'
  const chartFrame = container.ownerDocument.createElement('div')
  let showCursor:
    ((xNormalized: number, yNormalized: number) => void) | undefined
  const controls = createFreeCursorControls(
    container.ownerDocument,
    (xValue, yValue) => {
      state.visible = true
      state.xNormalized =
        (xValue - freeCursorXDomain[0]) /
        (freeCursorXDomain[1] - freeCursorXDomain[0])
      state.yNormalized =
        1 -
        (yValue - freeCursorYDomain[0]) /
          (freeCursorYDomain[1] - freeCursorYDomain[0])
      state.xValue = xValue
      state.yValue = yValue
      state.pinned = true
      showCursor?.(state.xNormalized, state.yNormalized)
      updateCursorControls(controls, state)
    },
    {
      xDomain: freeCursorXDomain,
      yDomain: freeCursorYDomain,
      xLabel: 'Horsepower',
      yLabel: 'Fuel economy',
      xStep: 0.1,
      yStep: 0.1,
    },
  )
  shell.append(controls.root, chartFrame)
  container.append(shell)
  sizeFreeCursorShell(shell, chartFrame, input)
  let renderCount = 0
  const mountCase = echartsMount(
    (nextInput) => {
      renderCount += 1
      return freeCursorOption(nextInput)
    },
    'Line chart with an unconstrained two-dimensional cursor',
    ({ chart, surface, getInput }) =>
      createDriver(
        chart,
        surface,
        getInput,
        state,
        controls,
        (paint) => {
          showCursor = paint
        },
        () => renderCount,
      ),
  )
  const chartHandle = mountCase(chartFrame, freeCursorInput(input))
  updateCursorControls(controls, state)

  return {
    driver: chartHandle.driver,
    update(nextInput) {
      sizeFreeCursorShell(shell, chartFrame, nextInput)
      chartHandle.update(freeCursorInput(nextInput))
      if (
        state.visible &&
        state.xNormalized !== null &&
        state.yNormalized !== null
      ) {
        showCursor?.(state.xNormalized, state.yNormalized)
      }
    },
    destroy() {
      chartHandle.destroy()
      shell.remove()
    },
  }
}

function freeCursorOption(_input: ConformanceInput): FreeCursorOption {
  const rows = freeCursorRows(cars)
  return {
    animation: false,
    aria: {
      enabled: true,
      description:
        'Selected car observations with a free horsepower and fuel-economy crosshair that does not snap to data.',
    },
    grid: {
      top: 22,
      right: 24,
      bottom: 44,
      left: 58,
    },
    xAxis: {
      type: 'value',
      min: freeCursorXDomain[0],
      max: freeCursorXDomain[1],
      name: 'Horsepower',
      nameLocation: 'middle',
      nameGap: 28,
      axisPointer: {
        show: true,
        snap: false,
        type: 'line',
        label: { show: true },
        lineStyle: {
          color: '#64748b',
          width: 1,
          type: 'dashed',
        },
      },
    },
    yAxis: {
      type: 'value',
      min: freeCursorYDomain[0],
      max: freeCursorYDomain[1],
      name: 'Fuel economy (mpg)',
      splitLine: {
        show: true,
        lineStyle: { color: '#e2e8f0' },
      },
      axisPointer: {
        show: true,
        snap: false,
        type: 'line',
        label: { show: true },
        lineStyle: {
          color: '#64748b',
          width: 1,
          type: 'dashed',
        },
      },
    },
    axisPointer: {
      show: true,
      snap: false,
      type: 'cross',
    },
    tooltip: {
      show: true,
      showContent: false,
      trigger: 'axis',
      triggerOn: 'none',
      transitionDuration: 0,
      axisPointer: {
        type: 'cross',
        snap: false,
      },
    },
    series: [
      {
        id: 'free-cursor-line',
        type: 'line',
        data: rows.map((datum) => [
          datum['power (hp)'],
          datum['economy (mpg)'],
        ]),
        color: '#0f766e',
        lineStyle: {
          color: '#0f766e',
          width: 2,
        },
        itemStyle: {
          color: '#0f766e',
          borderColor: '#ffffff',
          borderWidth: 1,
        },
        showSymbol: true,
        symbol: 'circle',
        symbolSize: 7,
        emphasis: { disabled: true },
        animation: false,
      },
    ],
  }
}

function createDriver(
  chart: EChartsType,
  surface: HTMLDivElement,
  getInput: () => ConformanceInput,
  state: CursorState,
  controls: FreeCursorControls,
  setShowCursor: (
    paint: (xNormalized: number, yNormalized: number) => void,
  ) => void,
  getRenderCount: () => number,
): ConformanceTestDriver {
  const showCursor = (xNormalized: number, yNormalized: number) => {
    const plot = plotBounds(chart)
    if (!plot) return
    chart.dispatchAction({
      type: 'showTip',
      x: plot.left + plot.width * xNormalized,
      y: plot.top + plot.height * yNormalized,
    })
  }
  setShowCursor(showCursor)

  const handlePointerMove = (event: PointerEvent) => {
    if (state.pinned) return
    const plot = plotBounds(chart)
    if (!plot) return
    const surfaceBounds = surface.getBoundingClientRect()
    const x = event.clientX - surfaceBounds.left
    const y = event.clientY - surfaceBounds.top
    if (
      x < plot.left ||
      x > plot.left + plot.width ||
      y < plot.top ||
      y > plot.top + plot.height
    ) {
      clearCursor(state)
      chart.dispatchAction({ type: 'hideTip' })
      updateCursorControls(controls, state)
      return
    }
    state.visible = true
    state.xNormalized = (x - plot.left) / plot.width
    state.yNormalized = (y - plot.top) / plot.height
    state.xValue = roundCursorValue(
      freeCursorXDomain[0] +
        (freeCursorXDomain[1] - freeCursorXDomain[0]) * state.xNormalized,
    )
    state.yValue = roundCursorValue(
      freeCursorYDomain[1] -
        (freeCursorYDomain[1] - freeCursorYDomain[0]) * state.yNormalized,
    )
    showCursor(state.xNormalized, state.yNormalized)
    updateCursorControls(controls, state)
  }
  const handlePointerLeave = () => {
    if (state.pinned) return
    clearCursor(state)
    chart.dispatchAction({ type: 'hideTip' })
    updateCursorControls(controls, state)
  }
  const handlePointerCancel = () => handlePointerLeave()
  const handleClick = () => {
    if (!state.visible) return
    if (state.pinned) {
      clearCursor(state)
      chart.dispatchAction({ type: 'hideTip' })
    } else {
      state.pinned = true
    }
    updateCursorControls(controls, state)
  }
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !state.visible) return
    event.preventDefault()
    clearCursor(state)
    chart.dispatchAction({ type: 'hideTip' })
    updateCursorControls(controls, state)
  }
  surface.addEventListener('pointermove', handlePointerMove)
  surface.addEventListener('pointerdown', handlePointerMove)
  surface.addEventListener('mouseleave', handlePointerLeave)
  surface.addEventListener('pointercancel', handlePointerCancel)
  surface.addEventListener('click', handleClick)
  surface.addEventListener('keydown', handleKeyDown)
  controls.root.addEventListener('keydown', handleKeyDown)

  return {
    resolveTarget(target) {
      return resolveTarget(chart, surface, controls, target)
    },
    readState() {
      return interactionState(state, getRenderCount())
    },
    geometry(query) {
      return geometry(chart, surface, getInput(), query)
    },
  }
}

function clearCursor(state: CursorState) {
  state.visible = false
  state.xNormalized = null
  state.yNormalized = null
  state.xValue = null
  state.yValue = null
  state.pinned = false
}

function resolveTarget(
  chart: EChartsType,
  surface: HTMLDivElement,
  controls: FreeCursorControls,
  target: ConformanceTarget,
) {
  if (target.view !== undefined && target.view !== 'main') return null
  const control =
    target.anchor === 'control:x'
      ? controls.x
      : target.anchor === 'control:y'
        ? controls.y
        : null
  if (control) {
    const bounds = control.getBoundingClientRect()
    return {
      x: bounds.left + bounds.width / 2,
      y: bounds.top + bounds.height / 2,
      focusElement: control,
    }
  }
  const fraction = freeCursorFractionFromAnchor(target.anchor)
  const plot = plotBounds(chart)
  if (!fraction || !plot) return null
  const bounds = surface.getBoundingClientRect()
  return {
    x: bounds.left + plot.left + plot.width * fraction.x,
    y: bounds.top + plot.top + plot.height * fraction.y,
    focusElement: surface,
  }
}

function geometry(
  chart: EChartsType,
  surface: HTMLDivElement,
  input: ConformanceInput,
  query: ConformanceGeometryQuery,
): readonly ConformanceGeometrySample[] {
  if (query.view !== undefined && query.view !== 'main') return []
  const surfaceBounds = surface.getBoundingClientRect()
  const rows = freeCursorRows(cars)

  if (query.role === 'dot') {
    return rows.flatMap((datum) => {
      const point = pixelPoint(
        chart,
        datum['power (hp)'],
        datum['economy (mpg)'],
      )
      return point
        ? [
            {
              x: surfaceBounds.left + point[0] - 3.5,
              y: surfaceBounds.top + point[1] - 3.5,
              width: 7,
              height: 7,
              paint: '#0f766e',
            },
          ]
        : []
    })
  }

  if (query.role === 'line') {
    const points = rows.flatMap((datum) => {
      const point = pixelPoint(
        chart,
        datum['power (hp)'],
        datum['economy (mpg)'],
      )
      return point ? [point] : []
    })
    const sample = clientPointBounds(points, surfaceBounds, {
      paint: '#0f766e',
    })
    return sample ? [sample] : []
  }

  return []
}

function plotBounds(chart: EChartsType): PlotBounds | null {
  const topLeft = pixelPoint(chart, freeCursorXDomain[0], freeCursorYDomain[1])
  const bottomRight = pixelPoint(
    chart,
    freeCursorXDomain[1],
    freeCursorYDomain[0],
  )
  if (!topLeft || !bottomRight) return null
  return {
    left: Math.min(topLeft[0], bottomRight[0]),
    top: Math.min(topLeft[1], bottomRight[1]),
    width: Math.abs(bottomRight[0] - topLeft[0]),
    height: Math.abs(bottomRight[1] - topLeft[1]),
  }
}

function pixelPoint(
  chart: EChartsType,
  x: number,
  y: number,
): readonly [number, number] | null {
  const point = chart.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [x, y])
  if (
    !Array.isArray(point) ||
    point.length < 2 ||
    typeof point[0] !== 'number' ||
    typeof point[1] !== 'number' ||
    !Number.isFinite(point[0]) ||
    !Number.isFinite(point[1])
  ) {
    return null
  }
  return [point[0], point[1]]
}

function interactionState(
  state: CursorState,
  renderCount: number,
): ConformanceJsonObject {
  return {
    cursor: {
      visible: state.visible,
      xNormalized: state.xNormalized,
      yNormalized: state.yNormalized,
      xValue: state.xValue,
      yValue: state.yValue,
      pinned: state.pinned,
      snapped: false,
      datum: null,
    },
    render: {
      count: renderCount,
    },
  }
}

function updateCursorControls(
  controls: FreeCursorControls,
  state: CursorState,
) {
  updateFreeCursorControls(controls, {
    visible: state.visible,
    x: state.xValue,
    y: state.yValue,
    pinned: state.pinned,
  })
}

function freeCursorInput(input: ConformanceInput): ConformanceInput {
  return {
    ...input,
    height: freeCursorChartHeight(input.height),
  }
}

function sizeFreeCursorShell(
  shell: HTMLDivElement,
  chartFrame: HTMLDivElement,
  input: ConformanceInput,
) {
  shell.style.width = `${input.width}px`
  shell.style.height = `${input.height}px`
  chartFrame.style.width = `${input.width}px`
  chartFrame.style.height = `${freeCursorChartHeight(input.height)}px`
}

function freeCursorChartHeight(height: number) {
  return Math.max(180, height - 68)
}

function roundCursorValue(value: number) {
  return Math.round(value * 10) / 10
}
