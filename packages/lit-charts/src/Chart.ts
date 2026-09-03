import { LitElement, html, nothing, render as renderLit } from 'lit'
import type { PropertyValues, TemplateResult } from 'lit'
import { ref } from 'lit/directives/ref.js'
import { unsafeHTML } from 'lit/directives/unsafe-html.js'
import { resolveChartAdapterLayout } from '@tanstack/charts/adapter'
import { createChartRendererAdapter } from '@tanstack/charts/adapter/renderer'
import { renderChartSvg } from '@tanstack/charts/svg'
import { createSvgChartRenderer } from '@tanstack/charts/svg/renderer'
import type {
  ChartAdapter,
  ChartRenderer,
  ChartRendererHostOptions,
  ChartRendererRenderContext,
  ChartSvgRenderer,
  ChartTooltipBodyTarget,
  ChartTooltipContent,
  ChartValue,
} from '@tanstack/charts'
import type { ChartProps } from './types'

let nextChartId = 0

export class Chart<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> extends LitElement {
  static properties = {
    options: { attribute: false },
  }

  declare options: ChartProps<TDatum, TXValue, TYValue>

  private adapter?: ChartAdapter<
    ChartRendererHostOptions<TDatum, TXValue, TYValue>,
    TDatum,
    TXValue,
    TYValue
  >
  private activeRenderSvg?: ChartSvgRenderer<TDatum, TXValue, TYValue>
  private renderer?: ChartRenderer<TDatum, TXValue, TYValue>
  private tooltipBodyTarget?: ChartTooltipBodyTarget<TDatum, TXValue, TYValue>
  private idPrefix = `ts-chart-lit-${++nextChartId}`
  private initialMarkup = ''
  private mounted = false

  protected createRenderRoot() {
    return this
  }

  protected willUpdate(changed: PropertyValues<this>) {
    if (!changed.has('options') || !this.options) return
    const options = toHostOptions(
      this.options,
      this.options.idPrefix ?? this.idPrefix,
      this.resolveRenderer(this.options.renderSvg ?? renderChartSvg),
      this.options.renderTooltipBody ? this.handleTooltipBodyChange : undefined,
    )
    if (!this.adapter) {
      this.adapter = createChartRendererAdapter(options)
      this.initialMarkup = this.adapter.prerender()
    } else {
      this.adapter.update(options)
    }
  }

  protected firstUpdated() {
    this.mountAdapter()
  }

  protected updated(changed: PropertyValues<this>) {
    if (changed.has('options') && this.tooltipBodyTarget) {
      this.renderTooltipBody(this.tooltipBodyTarget)
    }
  }

  connectedCallback() {
    super.connectedCallback()
    if (this.hasUpdated && !this.mounted) {
      void this.updateComplete.then(() => this.mountAdapter())
    }
  }

  disconnectedCallback() {
    this.mounted = false
    this.adapter?.destroy()
    this.clearTooltipBody()
    super.disconnectedCallback()
  }

  protected render() {
    if (!this.options) return undefined
    const layout = resolveChartAdapterLayout(this.options)
    const outerStyle = [
      'display:block',
      'position:relative',
      `width:${this.options.width === undefined ? '100%' : `${this.options.width}px`}`,
      this.options.height !== undefined
        ? `height:${this.options.height}px`
        : layout.aspectRatio === undefined
          ? 'height:320px'
          : `aspect-ratio:${layout.aspectRatio}`,
      this.options.style,
    ]
      .filter(Boolean)
      .join(';')

    return html`
      <div
        class=${
          this.options.class
            ? `ts-chart-host ${this.options.class}`
            : 'ts-chart-host'
        }
        style=${outerStyle}
      >
        <div
          class="ts-chart-surface"
          style="width:100%;height:100%"
          data-chart-surface
        >
          ${unsafeHTML(this.initialMarkup)}
        </div>
      </div>
    `
  }

  private resolveRenderer(
    renderSvg: ChartSvgRenderer<TDatum, TXValue, TYValue>,
  ) {
    if (!this.renderer || renderSvg !== this.activeRenderSvg) {
      this.activeRenderSvg = renderSvg
      this.renderer = createSvgChartRenderer(renderSvg)
    }
    return this.renderer
  }

  private readonly handleTooltipBodyChange = (
    target: ChartTooltipBodyTarget<TDatum, TXValue, TYValue> | null,
  ) => {
    if (!target) {
      this.clearTooltipBody()
      return
    }
    if (
      this.tooltipBodyTarget &&
      this.tooltipBodyTarget.element !== target.element
    ) {
      renderLit(nothing, this.tooltipBodyTarget.element)
    }
    this.tooltipBodyTarget = target
    this.renderTooltipBody(target)
  }

  private renderTooltipBody(
    target: ChartTooltipBodyTarget<TDatum, TXValue, TYValue>,
  ) {
    const renderTooltipBody = this.options.renderTooltipBody
    if (!renderTooltipBody) {
      renderLit(nothing, target.element)
      return
    }
    renderLit(
      renderTooltipBody({
        points: target.points,
        content: target.content,
        defaultBody: renderDefaultTooltipBody(target.content),
        pinned: target.pinned,
        dismiss: target.dismiss,
      }),
      target.element,
    )
  }

  private clearTooltipBody() {
    if (!this.tooltipBodyTarget) return
    renderLit(nothing, this.tooltipBodyTarget.element)
    this.tooltipBodyTarget = undefined
  }

  private mountAdapter() {
    if (this.mounted) return
    const container = this.querySelector<HTMLElement>('[data-chart-surface]')
    if (!container || !this.adapter) return
    this.adapter.mount(container)
    this.mounted = true
  }
}

export function defineChartElement(tagName = 'tanstack-chart') {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, Chart)
  }
}

function toHostOptions<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  props: ChartProps<TDatum, TXValue, TYValue>,
  idPrefix: string,
  renderer: ChartRenderer<TDatum, TXValue, TYValue>,
  onTooltipBodyChange:
    | ((
        target: ChartTooltipBodyTarget<TDatum, TXValue, TYValue> | null,
      ) => void)
    | undefined,
): ChartRendererHostOptions<TDatum, TXValue, TYValue> {
  const {
    class: _class,
    style: _style,
    renderSvg: _renderSvg,
    renderTooltipBody: _renderTooltipBody,
    onRender,
    ...options
  } = props
  return {
    ...options,
    idPrefix,
    renderer,
    onRender: adaptOnRender(onRender),
    onTooltipBodyChange,
  }
}

function adaptOnRender<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(onRender: ChartProps<TDatum, TXValue, TYValue>['onRender']) {
  if (!onRender) return undefined
  return (
    context: ChartRendererRenderContext<TDatum, TXValue, TYValue>,
  ): void => {
    const svg = context.surface.defaultElement ?? context.surface.element
    const SvgElement =
      context.container.ownerDocument.defaultView?.SVGSVGElement
    if (!SvgElement || !(svg instanceof SvgElement)) {
      throw new TypeError('Expected the SVG chart surface.')
    }
    onRender({
      container: context.container,
      scene: context.scene,
      surface: context.surface,
      svg,
      interaction: context.interaction,
    })
  }
}

function renderDefaultTooltipBody(
  content: ChartTooltipContent | string,
): TemplateResult {
  if (typeof content === 'string') return html`${content}`

  const title = content.title
    ? html`<div
        class="ts-chart-tooltip__title"
        style=${
          `display:flex;align-items:center;gap:0.4rem;font-weight:650;` +
          `margin-bottom:${content.rows.length ? '0.3rem' : '0'}`
        }
      >
        ${
          content.color ? renderTooltipSwatch(content.color) : nothing
        }${content.title}
      </div>`
    : nothing
  const rows = content.rows.length
    ? html`<div class="ts-chart-tooltip__rows" aria-hidden="true">
        ${content.rows.map(
          (row) =>
            html`<div
              class="ts-chart-tooltip__row"
              style="display:grid;grid-template-columns:0.55rem minmax(0,1fr) auto;align-items:center;column-gap:0.4rem"
            >
              ${
                row.color ? renderTooltipSwatch(row.color) : html`<span></span>`
              }<span>${row.label}</span
              ><span
                style="text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap"
                >${row.value}</span
              >
            </div>`,
        )}
      </div>`
    : nothing

  return html`${title}${rows}`
}

function renderTooltipSwatch(color: string): TemplateResult {
  return html`<span
    ${ref((element) => {
      if (element) (element as HTMLElement).style.background = color
    })}
    class="ts-chart-tooltip__swatch"
    aria-hidden="true"
    style="display:block;width:0.55rem;height:0.55rem;border-radius:0.15rem;box-shadow:inset 0 0 0 1px rgb(0 0 0/.12)"
  ></span>`
}
