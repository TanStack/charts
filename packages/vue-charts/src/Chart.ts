import {
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  onUpdated,
  ref,
  useId,
} from 'vue'
import type { VNode } from 'vue'
import {
  createChartAdapter,
  resolveChartAdapterLayout,
} from '@tanstack/charts/adapter'
import type { ChartHostOptions, ChartValue } from '@tanstack/charts'
import type { ChartProps } from './types'

interface ChartComponent {
  <
    TDatum,
    TXValue extends ChartValue = ChartValue,
    TYValue extends ChartValue = ChartValue,
  >(
    props: ChartProps<TDatum, TXValue, TYValue>,
  ): VNode
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
  setup(componentProps, { attrs }) {
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
    const adapter = createChartAdapter(toHostOptions(props, currentIdPrefix()))
    const initialMarkup = adapter.prerender()
    const container = ref<HTMLElement>()

    onMounted(() => {
      if (!container.value) return
      adapter.update(toHostOptions(currentProps(), currentIdPrefix()))
      adapter.mount(container.value)
    })
    onUpdated(() =>
      adapter.update(toHostOptions(currentProps(), currentIdPrefix())),
    )
    onBeforeUnmount(() => adapter.destroy())

    return () => {
      const props = currentProps()
      const layout = resolveChartAdapterLayout(props)
      return h(
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
      )
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
): ChartHostOptions<TDatum, TXValue, TYValue> {
  const { class: _class, style: _style, ...options } = props
  return { ...options, idPrefix }
}
