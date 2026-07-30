import { LitElement, html } from 'lit'
import type { PropertyValues } from 'lit'
import { unsafeHTML } from 'lit/directives/unsafe-html.js'
import {
  createChartAdapter,
  resolveChartAdapterLayout,
} from '@tanstack/charts/adapter'
import type {
  ChartAdapter,
  ChartHostOptions,
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
    ChartHostOptions<TDatum, TXValue, TYValue>,
    TDatum,
    TXValue,
    TYValue
  >
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
    )
    if (!this.adapter) {
      this.adapter = createChartAdapter(options)
      this.initialMarkup = this.adapter.prerender()
    } else {
      this.adapter.update(options)
    }
  }

  protected firstUpdated() {
    this.mountAdapter()
  }

  protected updated(changed: PropertyValues<this>) {
    if (!changed.has('options') || !this.options) return
    this.adapter?.update(
      toHostOptions(this.options, this.options.idPrefix ?? this.idPrefix),
    )
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
): ChartHostOptions<TDatum, TXValue, TYValue> {
  const { class: _class, style: _style, ...options } = props
  return { ...options, idPrefix }
}
