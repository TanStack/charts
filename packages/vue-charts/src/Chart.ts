import {
  Fragment,
  Teleport,
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  onUpdated,
  ref,
  shallowRef,
  useId,
} from 'vue'
import type { VNode, VNodeChild } from 'vue'
import { resolveChartAdapterLayout } from '@tanstack/charts/adapter'
import { createChartRendererAdapter } from '@tanstack/charts/adapter/renderer'
import { renderChartSvg } from '@tanstack/charts/svg'
import { createSvgChartRenderer } from '@tanstack/charts/svg/renderer'
import type {
  ChartRenderContext,
  ChartRenderer,
  ChartRendererHostOptions,
  ChartRendererRenderContext,
  ChartSvgRenderer,
  ChartTooltipBodyTarget,
  ChartTooltipContent,
  ChartValue,
} from '@tanstack/charts'
import type { ChartProps, ChartTooltipBodySlotContext } from './types'

interface ChartComponent {
  <
    TDatum,
    TXValue extends ChartValue = ChartValue,
    TYValue extends ChartValue = ChartValue,
  >(
    props: ChartProps<TDatum, TXValue, TYValue>,
  ): VNode & {
    __ctx?: {
      slots: {
        tooltipBody?: (
          context: ChartTooltipBodySlotContext<TDatum, TXValue, TYValue>,
        ) => VNodeChild
      }
    }
  }
}

const ChartImplementation = defineComponent({
  name: 'TanStackChart',
  inheritAttrs: false,
  props: {
    definition: { required: true },
    ariaLabel: { type: String, required: true },
    ariaDescription: String,
    height: Number,
    aspectRatio: Number,
    width: Number,
    initialWidth: Number,
    tabIndex: Number,
    idPrefix: String,
    className: String,
    renderSvg: Function,
    measureText: Function,
    onFocusChange: Function,
    onFocusGroupChange: Function,
    onSelect: Function,
    onRender: Function,
  },
  setup(componentProps, { attrs, slots }) {
    const currentProps = () =>
      ({
        ...componentProps,
        class: attrs.class,
        style: attrs.style,
      }) as ChartProps<any, any, any>
    const props = currentProps()
    const generatedId = useId()
    const generatedPrefix = `ts-chart-${generatedId.replaceAll(/[^a-zA-Z0-9_-]/g, '')}`
    const currentIdPrefix = () => currentProps().idPrefix ?? generatedPrefix
    const tooltipBodyTarget = shallowRef<ChartTooltipBodyTarget<
      any,
      any,
      any
    > | null>(null)
    const defaultTooltipBody = () =>
      renderDefaultTooltipBody(tooltipBodyTarget.value?.content ?? '')
    const handleTooltipBodyChange = (
      target: ChartTooltipBodyTarget<any, any, any> | null,
    ) => {
      tooltipBodyTarget.value = target
    }
    let activeRenderSvg = props.renderSvg ?? renderChartSvg
    let renderer = createSvgChartRenderer(activeRenderSvg)
    const resolveRenderer = (renderSvg: ChartSvgRenderer<any, any, any>) => {
      if (renderSvg !== activeRenderSvg) {
        activeRenderSvg = renderSvg
        renderer = createSvgChartRenderer(renderSvg)
      }
      return renderer
    }
    const adapter = createChartRendererAdapter(
      toHostOptions(
        props,
        currentIdPrefix(),
        resolveRenderer,
        slots.tooltipBody ? handleTooltipBodyChange : undefined,
      ),
    )
    const initialMarkup = adapter.prerender()
    const container = ref<HTMLElement>()

    onMounted(() => {
      if (!container.value) return
      adapter.update(
        toHostOptions(
          currentProps(),
          currentIdPrefix(),
          resolveRenderer,
          slots.tooltipBody ? handleTooltipBodyChange : undefined,
        ),
      )
      adapter.mount(container.value)
    })
    onUpdated(() =>
      adapter.update(
        toHostOptions(
          currentProps(),
          currentIdPrefix(),
          resolveRenderer,
          slots.tooltipBody ? handleTooltipBodyChange : undefined,
        ),
      ),
    )
    onBeforeUnmount(() => adapter.destroy())

    return () => {
      const props = currentProps()
      const layout = resolveChartAdapterLayout(props)
      const target = tooltipBodyTarget.value
      return [
        h(
          'div',
          {
            class: ['ts-chart-host', props.class],
            style: [
              {
                position: 'relative',
                width: props.width === undefined ? '100%' : props.width,
                height:
                  props.height ??
                  (layout.aspectRatio === undefined ? 320 : undefined),
                aspectRatio:
                  props.height === undefined ? layout.aspectRatio : undefined,
              },
              props.style,
            ],
          },
          [
            h('div', {
              ref: container,
              class: 'ts-chart-surface',
              style: { width: '100%', height: '100%' },
              innerHTML: initialMarkup,
            }),
          ],
        ),
        target && slots.tooltipBody
          ? h(
              Teleport,
              { to: target.element },
              slots.tooltipBody({
                points: target.points,
                content: target.content,
                pinned: target.pinned,
                dismiss: target.dismiss,
                defaultBody: defaultTooltipBody,
              }),
            )
          : null,
      ]
    }
  },
})

export const Chart = ChartImplementation as unknown as ChartComponent

function toHostOptions<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  props: ChartProps<TDatum, TXValue, TYValue>,
  idPrefix: string,
  resolveRenderer: (
    renderSvg: ChartSvgRenderer<TDatum, TXValue, TYValue>,
  ) => ChartRenderer<TDatum, TXValue, TYValue>,
  onTooltipBodyChange:
    | ((
        target: ChartTooltipBodyTarget<TDatum, TXValue, TYValue> | null,
      ) => void)
    | undefined,
): ChartRendererHostOptions<TDatum, TXValue, TYValue> {
  const {
    class: _class,
    style: _style,
    renderSvg,
    onRender,
    ...options
  } = props
  return {
    ...options,
    idPrefix,
    renderer: resolveRenderer(renderSvg ?? renderChartSvg),
    onRender: adaptOnRender(onRender),
    onTooltipBodyChange,
  }
}

function adaptOnRender<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  onRender:
    | ((context: ChartRenderContext<TDatum, TXValue, TYValue>) => void)
    | undefined,
) {
  if (!onRender) return undefined
  return (
    context: ChartRendererRenderContext<TDatum, TXValue, TYValue>,
  ): void => {
    const svg = context.surface.element
    const SvgElement =
      context.container.ownerDocument.defaultView?.SVGSVGElement
    if (!SvgElement || !(svg instanceof SvgElement)) {
      throw new TypeError('Expected the SVG chart surface.')
    }
    onRender({
      container: context.container,
      scene: context.scene,
      svg,
    })
  }
}

function renderDefaultTooltipBody(
  content: ChartTooltipContent | string,
): VNode {
  if (typeof content === 'string') {
    return h(Fragment, null, [content])
  }

  return h(Fragment, null, [
    content.title
      ? h(
          'div',
          {
            class: 'ts-chart-tooltip__title',
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontWeight: 650,
              marginBottom: content.rows.length ? '0.3rem' : 0,
            },
          },
          [
            content.color ? renderTooltipSwatch(content.color) : null,
            content.title,
          ],
        )
      : null,
    content.rows.length
      ? h(
          'div',
          { class: 'ts-chart-tooltip__rows', 'aria-hidden': 'true' },
          content.rows.map((row) =>
            h(
              'div',
              {
                class: 'ts-chart-tooltip__row',
                style: {
                  display: 'grid',
                  gridTemplateColumns: '0.55rem minmax(0,1fr) auto',
                  alignItems: 'center',
                  columnGap: '0.4rem',
                },
              },
              [
                row.color ? renderTooltipSwatch(row.color) : h('span'),
                h('span', row.label),
                h(
                  'span',
                  {
                    style: {
                      textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums',
                      whiteSpace: 'nowrap',
                    },
                  },
                  row.value,
                ),
              ],
            ),
          ),
        )
      : null,
  ])
}

function renderTooltipSwatch(color: string) {
  return h('span', {
    class: 'ts-chart-tooltip__swatch',
    'aria-hidden': 'true',
    style: {
      display: 'block',
      width: '0.55rem',
      height: '0.55rem',
      borderRadius: '0.15rem',
      boxShadow: 'inset 0 0 0 1px rgb(0 0 0/.12)',
      background: color,
    },
  })
}
