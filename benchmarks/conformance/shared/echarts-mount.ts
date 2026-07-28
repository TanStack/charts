import { init } from 'echarts/core'
import type { EChartsCoreOption, EChartsType } from 'echarts/core'
import type {
  ConformanceInput,
  ConformanceMount,
  ConformanceTestDriver,
} from '../types'

export interface EChartsMountContext {
  chart: EChartsType
  surface: HTMLDivElement
  getInput: () => ConformanceInput
}

export function echartsMount(
  render: (input: ConformanceInput) => EChartsCoreOption,
  ariaLabel: string,
  createDriver?: (context: EChartsMountContext) => ConformanceTestDriver,
): ConformanceMount {
  return (container, input) => {
    let currentInput = input
    const surface = container.ownerDocument.createElement('div')
    surface.dataset.conformanceView = 'main'
    applyEChartsAccessibility(surface, ariaLabel)
    setSurfaceSize(surface, input)
    container.append(surface)

    const chart = init(surface, null, {
      renderer: 'svg',
      devicePixelRatio: 1,
      width: input.width,
      height: input.height,
    })

    const renderChart = (nextInput: ConformanceInput) => {
      chart.setOption(
        {
          ...render(nextInput),
          animation: false,
        },
        {
          notMerge: true,
          lazyUpdate: false,
          silent: false,
        },
      )
      chart.getZr().flush()
      applyEChartsAccessibility(surface, ariaLabel)
    }

    renderChart(input)
    const caseDriver = createDriver?.({
      chart,
      surface,
      getInput: () => currentInput,
    })
    const driver = caseDriver
      ? {
          ...caseDriver,
          settle:
            caseDriver.settle ??
            (() => {
              chart.getZr().flush()
            }),
        }
      : undefined

    return {
      driver,
      update(nextInput) {
        currentInput = nextInput
        setSurfaceSize(surface, nextInput)
        chart.resize({
          width: nextInput.width,
          height: nextInput.height,
          animation: { duration: 0 },
          silent: true,
        })
        renderChart(nextInput)
      },
      destroy() {
        chart.dispose()
        surface.remove()
      },
    }
  }
}

function setSurfaceSize(surface: HTMLDivElement, input: ConformanceInput) {
  surface.style.width = `${input.width}px`
  surface.style.height = `${input.height}px`
  surface.style.position = 'relative'
}

export function applyEChartsAccessibility(
  surface: HTMLDivElement,
  ariaLabel: string,
) {
  surface.setAttribute('role', 'application')
  surface.setAttribute('aria-label', ariaLabel)
  surface.tabIndex = 0

  const svg = surface.querySelector<SVGSVGElement>('svg')
  if (!svg) return
  svg.setAttribute('role', 'presentation')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('focusable', 'false')
  svg.removeAttribute('aria-label')
  svg.removeAttribute('tabindex')
}
