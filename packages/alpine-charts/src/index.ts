import { resolveChartAdapterLayout } from '@tanstack/charts/adapter'
import { createChartRendererAdapter } from '@tanstack/charts/adapter/renderer'
import { renderChartSvg } from '@tanstack/charts/svg'
import { createSvgChartRenderer } from '@tanstack/charts/svg/renderer'
import type {
  ChartHostOptions,
  ChartRendererHostOptions,
  ChartTooltipBodyContext,
  ChartTooltipBodyTarget,
  ChartTooltipContent,
  ChartValue,
} from '@tanstack/charts'

export type AlpineChartTooltipBody =
  Node | string | number | null | undefined | readonly AlpineChartTooltipBody[]

export interface ChartTooltipBodyRenderContext<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> extends ChartTooltipBodyContext<TDatum, TXValue, TYValue> {
  defaultBody: DocumentFragment
}

export type ChartOptions<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = ChartHostOptions<TDatum, TXValue, TYValue> & {
  renderTooltipBody?: (
    context: ChartTooltipBodyRenderContext<TDatum, TXValue, TYValue>,
  ) => AlpineChartTooltipBody
}

interface AlpineDirectiveUtilities {
  evaluateLater: (
    expression: string,
  ) => (receiver: (value: unknown) => void) => void
  effect: (callback: () => void) => void
  cleanup: (callback: () => void) => void
}

interface AlpineLike {
  directive: (
    name: string,
    callback: (
      element: HTMLElement,
      directive: { expression: string },
      utilities: AlpineDirectiveUtilities,
    ) => void,
  ) => void
}

let nextChartId = 0

export function charts(Alpine: AlpineLike) {
  Alpine.directive(
    'chart',
    (element, { expression }, { evaluateLater, effect, cleanup }) => {
      const evaluate = evaluateLater(expression)
      const surface = element.ownerDocument.createElement('div')
      surface.className = 'ts-chart-surface'
      surface.style.width = '100%'
      surface.style.height = '100%'
      const hadHostClass = element.classList.contains('ts-chart-host')
      element.classList.add('ts-chart-host')
      element.append(surface)
      const initialStyle = {
        position: element.style.position,
        width: element.style.width,
        height: element.style.height,
        aspectRatio: element.style.aspectRatio,
      }
      let adapter:
        ReturnType<typeof createChartRendererAdapter<any, any, any>> | undefined
      let activeRenderSvg: ChartOptions<any, any, any>['renderSvg']
      let renderer = createSvgChartRenderer(renderChartSvg)
      let activeRenderTooltipBody:
        ChartOptions<any, any, any>['renderTooltipBody'] | undefined
      let onTooltipBodyChange:
        | ((target: ChartTooltipBodyTarget<any, any, any> | null) => void)
        | undefined
      const generatedId = `ts-chart-alpine-${++nextChartId}`

      effect(() => {
        evaluate((value) => {
          const options = value as ChartOptions<any, any, any>
          if (options.renderSvg !== activeRenderSvg) {
            activeRenderSvg = options.renderSvg
            renderer = createSvgChartRenderer(
              options.renderSvg ?? renderChartSvg,
            )
          }
          if (options.renderTooltipBody !== activeRenderTooltipBody) {
            activeRenderTooltipBody = options.renderTooltipBody
            onTooltipBodyChange = options.renderTooltipBody
              ? createTooltipBodyChangeHandler(options.renderTooltipBody)
              : undefined
          }
          const hostOptions: ChartRendererHostOptions<any, any, any> = {
            renderer,
            definition: options.definition,
            ariaLabel: options.ariaLabel,
            ariaDescription: options.ariaDescription,
            className: options.className,
            tabIndex: options.tabIndex,
            idPrefix: options.idPrefix ?? generatedId,
            height: options.height,
            aspectRatio: options.aspectRatio,
            width: options.width,
            initialWidth: options.initialWidth,
            measureText: options.measureText,
            onFocusChange: options.onFocusChange,
            onFocusGroupChange: options.onFocusGroupChange,
            onSelect: options.onSelect,
            onRender: options.onRender
              ? (context) => {
                  const svg =
                    context.surface.defaultElement ?? context.surface.element
                  const SvgElement =
                    context.container.ownerDocument.defaultView?.SVGSVGElement
                  if (!SvgElement || !(svg instanceof SvgElement)) {
                    throw new TypeError('Expected the SVG chart surface.')
                  }
                  options.onRender?.({
                    container: context.container,
                    scene: context.scene,
                    surface: context.surface,
                    svg,
                    interaction: context.interaction,
                  })
                }
              : undefined,
            onTooltipBodyChange,
          }
          applyLayout(element, options, initialStyle)
          if (adapter) {
            adapter.update(hostOptions)
          } else {
            adapter = createChartRendererAdapter(hostOptions)
            adapter.mount(surface)
          }
        })
      })

      cleanup(() => {
        adapter?.destroy()
        surface.remove()
        if (!hadHostClass) element.classList.remove('ts-chart-host')
        Object.assign(element.style, initialStyle)
      })
    },
  )
}

function createTooltipBodyChangeHandler<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  renderTooltipBody: (
    context: ChartTooltipBodyRenderContext<TDatum, TXValue, TYValue>,
  ) => AlpineChartTooltipBody,
) {
  let activeElement: HTMLElement | undefined
  return (target: ChartTooltipBodyTarget<TDatum, TXValue, TYValue> | null) => {
    if (activeElement) activeElement.replaceChildren()
    activeElement = target?.element
    if (!target) return
    const defaultBody = createDefaultTooltipBody(
      target.element.ownerDocument,
      target.content,
    )
    const content = renderTooltipBody({
      points: target.points,
      content: target.content,
      defaultBody,
      pinned: target.pinned,
      dismiss: target.dismiss,
    })
    const fragment = target.element.ownerDocument.createDocumentFragment()
    appendTooltipBody(fragment, content)
    target.element.replaceChildren(fragment)
  }
}

function appendTooltipBody(
  parent: DocumentFragment,
  content: AlpineChartTooltipBody,
): void {
  if (content === null || content === undefined) return
  if (Array.isArray(content)) {
    for (const child of content) appendTooltipBody(parent, child)
    return
  }
  if (typeof content === 'string' || typeof content === 'number') {
    parent.append(String(content))
    return
  }
  parent.append(content as Node)
}

function createDefaultTooltipBody(
  document: Document,
  content: ChartTooltipContent | string,
) {
  const fragment = document.createDocumentFragment()
  if (typeof content === 'string') {
    fragment.append(content)
    return fragment
  }
  if (content.title) {
    const title = document.createElement('div')
    title.className = 'ts-chart-tooltip__title'
    title.style.cssText = `display:flex;align-items:center;gap:.4rem;font-weight:650;margin-bottom:${content.rows.length ? '.3rem' : '0'}`
    if (content.color)
      title.append(createTooltipSwatch(document, content.color))
    title.append(content.title)
    fragment.append(title)
  }
  if (content.rows.length) {
    const rows = document.createElement('div')
    rows.className = 'ts-chart-tooltip__rows'
    rows.setAttribute('aria-hidden', 'true')
    for (const row of content.rows) {
      const line = document.createElement('div')
      line.className = 'ts-chart-tooltip__row'
      line.style.cssText =
        'display:grid;grid-template-columns:.55rem minmax(0,1fr) auto;align-items:center;column-gap:.4rem'
      const swatch = row.color
        ? createTooltipSwatch(document, row.color)
        : document.createElement('span')
      const label = document.createElement('span')
      label.textContent = row.label
      const value = document.createElement('span')
      value.textContent = row.value
      value.style.cssText =
        'text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap'
      line.append(swatch, label, value)
      rows.append(line)
    }
    fragment.append(rows)
  }
  return fragment
}

function createTooltipSwatch(document: Document, color: string) {
  const swatch = document.createElement('span')
  swatch.className = 'ts-chart-tooltip__swatch'
  swatch.setAttribute('aria-hidden', 'true')
  swatch.style.cssText =
    'display:block;width:.55rem;height:.55rem;border-radius:.15rem;box-shadow:inset 0 0 0 1px rgb(0 0 0/.12)'
  swatch.style.background = color
  return swatch
}

function applyLayout(
  element: HTMLElement,
  options: ChartOptions<any, any, any>,
  initial: {
    position: string
    width: string
    height: string
    aspectRatio: string
  },
) {
  const layout = resolveChartAdapterLayout(options)
  element.style.position = initial.position || 'relative'
  element.style.width =
    options.width === undefined ? initial.width || '100%' : `${options.width}px`
  element.style.height =
    options.height !== undefined
      ? `${options.height}px`
      : layout.aspectRatio === undefined
        ? initial.height || '320px'
        : initial.height
  element.style.aspectRatio =
    options.height === undefined && layout.aspectRatio !== undefined
      ? String(layout.aspectRatio)
      : initial.aspectRatio
}

export type {
  DomChartDefinition as ChartDefinition,
  ChartPoint,
} from '@tanstack/charts'
