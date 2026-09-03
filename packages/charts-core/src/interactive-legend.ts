import {
  layoutCategoricalLegendItems,
  resolveCategoricalLegendItems,
} from './legend-layout-internal'
import { filterMarkSceneByPoint } from './mark-scene-filter-internal'
import { valueKey } from './scales'
import type {
  ChartColorLegend,
  ChartColorLegendContext,
  ChartHostControl,
  ChartKey,
  ChartLegendPlacement,
  SceneNode,
} from './types'
import type { ControlledSignal } from './interaction-signal'
import type {
  ChartHostControlExtension,
  ChartHostControlInstance,
} from './dom-types'

export interface InteractiveColorLegendChange<TValue extends ChartKey> {
  type: 'toggle'
  value: TValue
  visible: boolean
}

export interface InteractiveColorLegendItemContext {
  readonly visible: boolean
}

export interface InteractiveColorLegendOptions<TValue extends ChartKey> {
  visible: ControlledSignal<
    readonly TValue[],
    InteractiveColorLegendChange<TValue>
  >
  placement?: ChartLegendPlacement
  ariaLabel?: string
  itemWidth?: number
  format?: (value: TValue) => string
  itemAriaLabel?: (
    value: TValue,
    context: InteractiveColorLegendItemContext,
  ) => string
  emptyLabel?: string
}

interface InteractiveLegendControlItem {
  key: string
  value: ChartKey
  label: string
  ariaLabel: string
  color: string
  visible: boolean
}

interface InteractiveLegendControl extends ChartHostControl {
  kind: 'interactive-color-legend'
  bounds: ChartColorLegendContext['bounds']
  ariaLabel: string
  columns: number
  gap: number
  padding: number
  items: readonly InteractiveLegendControlItem[]
  emptyLabel: string
  toggle: (value: ChartKey) => void
}

const defaultItemWidth = 110
const controlGap = 8
const controlPadding = 6
const controlItemHeight = 44

export function interactiveColorLegend<TValue extends ChartKey>(
  options: InteractiveColorLegendOptions<TValue>,
): ChartColorLegend {
  const placement = options.placement ?? 'bottom'
  const minimumItemWidth = Math.max(64, options.itemWidth ?? defaultItemWidth)
  const selectedKeys = new Set(options.visible.value.map(valueKey))
  const isVisible = (value: ChartKey) => selectedKeys.has(valueKey(value))

  return {
    placement,
    seriesVisible: isVisible,
    filterMark(scene, { seriesFromColor }) {
      return seriesFromColor
        ? filterMarkSceneByPoint(
            scene,
            (point) => point.group === null || isVisible(point.group),
          )
        : scene
    },
    height(itemCount, context) {
      assertCategorical(context.colors.kind)
      const layout = layoutCategoricalLegendItems(
        itemCount,
        context.chart.width + controlGap,
        minimumItemWidth + controlGap,
      )
      return (
        controlPadding * 2 +
        layout.rows * controlItemHeight +
        Math.max(0, layout.rows - 1) * controlGap
      )
    },
    render(context) {
      assertCategorical(context.colors.kind)
      return renderStaticFallback(
        context,
        isVisible,
        options.format,
        minimumItemWidth,
      )
    },
    control(context) {
      assertCategorical(context.colors.kind)
      const items = resolveCategoricalLegendItems<TValue>(
        context.colors,
        options.format,
      ).map((item): InteractiveLegendControlItem => {
        const visible = isVisible(item.value)
        return {
          ...item,
          visible,
          ariaLabel:
            options.itemAriaLabel?.(item.value, { visible }) ??
            `Toggle ${item.label} series`,
        }
      })
      const layout = layoutCategoricalLegendItems(
        items.length,
        context.bounds.width + controlGap,
        minimumItemWidth + controlGap,
      )
      return {
        kind: 'interactive-color-legend',
        key: 'interactive-color-legend',
        extension: interactiveLegendControlExtension,
        fallbackNodeKey: 'legend',
        bounds: context.bounds,
        ariaLabel: options.ariaLabel ?? 'Series visibility',
        columns: layout.columns,
        gap: controlGap,
        padding: controlPadding,
        items,
        emptyLabel: options.emptyLabel ?? 'No series shown',
        toggle(value) {
          const toggledKey = valueKey(value)
          const nextVisible = context.colors.domain.filter((candidate) =>
            valueKey(candidate) === toggledKey
              ? !selectedKeys.has(toggledKey)
              : selectedKeys.has(valueKey(candidate)),
          ) as TValue[]
          const visible = nextVisible.some(
            (candidate) => valueKey(candidate) === toggledKey,
          )
          options.visible.onChange(nextVisible, {
            reason: {
              type: 'toggle',
              value: value as TValue,
              visible,
            },
          })
        },
      } satisfies InteractiveLegendControl
    },
  }
}

function assertCategorical(kind: string | undefined) {
  if (kind !== undefined && kind !== 'categorical') {
    throw new TypeError(
      'interactiveColorLegend requires a categorical color scale',
    )
  }
}

function renderStaticFallback<TValue extends ChartKey>(
  context: ChartColorLegendContext,
  isVisible: (value: ChartKey) => boolean,
  format: ((value: TValue) => string) | undefined,
  minimumItemWidth: number,
): SceneNode {
  const { bounds, colors, theme } = context
  const items = resolveCategoricalLegendItems<TValue>(colors, format)
  const layout = layoutCategoricalLegendItems(
    items.length,
    bounds.width,
    minimumItemWidth,
  )
  const children: SceneNode[] = []

  items.forEach((item, index) => {
    const column = index % layout.columns
    const row = Math.floor(index / layout.columns)
    const x = bounds.x + column * layout.itemWidth
    const y =
      bounds.y +
      controlPadding +
      controlItemHeight / 2 +
      row * (controlItemHeight + controlGap)
    const visible = isVisible(item.value)
    children.push(
      {
        kind: 'dot',
        key: `interactive-legend-dot:${item.key}`,
        x: x + 4,
        y,
        radius: 4,
        style: {
          fill: visible ? item.color : 'none',
          stroke: item.color,
          strokeWidth: 1.5,
          opacity: visible ? 1 : 0.58,
        },
      },
      {
        kind: 'label',
        key: `interactive-legend-label:${item.key}`,
        x: x + 13,
        y,
        text: item.label,
        baseline: 'middle',
        fontSize: 11,
        style: {
          fill: theme.foreground,
          fillOpacity: visible ? 0.76 : 0.46,
        },
      },
    )
  })

  return {
    kind: 'group',
    key: 'legend',
    className: 'ts-chart__legend ts-chart__legend--interactive-fallback',
    ariaHidden: true,
    children,
  }
}

const interactiveLegendControlExtension: ChartHostControlExtension = {
  id: 'interactive-color-legend',
  create: createInteractiveLegendControl,
}

function createInteractiveLegendControl({
  container,
}: Parameters<
  ChartHostControlExtension['create']
>[0]): ChartHostControlInstance {
  let root: HTMLDivElement | undefined
  let status: HTMLSpanElement | undefined
  const buttons = new Map<string, HTMLButtonElement>()

  return {
    update(nextControl) {
      const control = asInteractiveLegendControl(nextControl)
      const element = ensureRoot(container)
      if (!element.isConnected || element.parentElement !== container) {
        container.append(element)
      }
      element.setAttribute('aria-label', control.ariaLabel)
      element.style.left = `${control.bounds.x}px`
      element.style.top = `${control.bounds.y}px`
      element.style.width = `${control.bounds.width}px`
      element.style.height = `${control.bounds.height}px`
      element.style.gridTemplateColumns = `repeat(${control.columns}, minmax(0, 1fr))`
      element.style.gap = `${control.gap}px`
      element.style.padding = `${control.padding}px 0`

      const retained = new Set<string>()
      for (const item of control.items) {
        retained.add(item.key)
        const button = buttons.get(item.key) ?? createButton(element, item.key)
        buttons.set(item.key, button)
        syncButton(button, item, control)
      }
      for (const [key, button] of buttons) {
        if (retained.has(key)) continue
        button.remove()
        buttons.delete(key)
      }
      let cursor = element.firstElementChild
      for (const item of control.items) {
        const button = buttons.get(item.key)
        if (!button) continue
        if (button !== cursor)
          element.insertBefore(button, cursor ?? status ?? null)
        cursor = button.nextElementSibling
      }
      if (status && status !== element.lastElementChild) element.append(status)
      const empty = control.items.every((item) => !item.visible)
      if (status) status.textContent = empty ? control.emptyLabel : ''
    },
    contains(target) {
      return Boolean(target && root?.contains(target as Node))
    },
    destroy() {
      root?.remove()
      root = undefined
      status = undefined
      buttons.clear()
    },
  }

  function ensureRoot(host: HTMLElement) {
    if (root) return root
    root = host.ownerDocument.createElement('div')
    root.className = 'ts-chart__interactive-legend'
    root.setAttribute('role', 'group')
    root.style.position = 'absolute'
    root.style.boxSizing = 'border-box'
    root.style.display = 'grid'
    root.style.alignItems = 'center'
    root.style.pointerEvents = 'auto'
    status = host.ownerDocument.createElement('span')
    status.setAttribute('role', 'status')
    status.setAttribute('aria-live', 'polite')
    visuallyHide(status)
    root.append(status)
    host.append(root)
    return root
  }
}

function createButton(root: HTMLDivElement, key: string) {
  const button = root.ownerDocument.createElement('button')
  button.type = 'button'
  button.dataset.chartLegendKey = key
  button.style.boxSizing = 'border-box'
  button.style.display = 'inline-flex'
  button.style.alignItems = 'center'
  button.style.justifyContent = 'center'
  button.style.gap = '7px'
  button.style.minWidth = '0'
  button.style.minHeight = `${controlItemHeight}px`
  button.style.padding = '8px 12px'
  button.style.border =
    '1px solid color-mix(in srgb, CanvasText 28%, transparent)'
  button.style.borderRadius = '999px'
  button.style.color = 'CanvasText'
  button.style.cursor = 'pointer'
  button.style.font = '600 13px/1 system-ui, sans-serif'
  button.style.outlineOffset = '3px'

  const swatch = root.ownerDocument.createElement('span')
  swatch.dataset.chartLegendSwatch = ''
  swatch.style.boxSizing = 'border-box'
  swatch.style.width = '11px'
  swatch.style.height = '11px'
  swatch.style.flex = '0 0 auto'
  swatch.style.borderRadius = '3px'
  const label = root.ownerDocument.createElement('span')
  label.dataset.chartLegendLabel = ''
  button.append(swatch, label)
  return button
}

function syncButton(
  button: HTMLButtonElement,
  item: InteractiveLegendControlItem,
  control: InteractiveLegendControl,
) {
  button.dataset.seriesId = String(item.value)
  button.dataset.chartLegendValue = String(item.value)
  button.dataset.visible = String(item.visible)
  button.setAttribute('aria-label', item.ariaLabel)
  button.setAttribute('aria-pressed', String(item.visible))
  button.style.background = item.visible
    ? 'color-mix(in srgb, CanvasText 7%, Canvas)'
    : 'Canvas'
  button.style.textDecoration = item.visible ? 'none' : 'line-through'
  button.onclick = (event) => {
    control.toggle(item.value)
  }
  const swatch = button.querySelector<HTMLElement>('[data-chart-legend-swatch]')
  const label = button.querySelector<HTMLElement>('[data-chart-legend-label]')
  if (swatch) {
    swatch.style.border = `2px solid ${item.color}`
    swatch.style.background = item.visible ? item.color : 'transparent'
  }
  if (label) label.textContent = item.label
}

function asInteractiveLegendControl(
  control: ChartHostControl,
): InteractiveLegendControl {
  if (!('kind' in control) || control.kind !== 'interactive-color-legend') {
    throw new TypeError('Expected an interactive color legend control')
  }
  return control as InteractiveLegendControl
}

function visuallyHide(element: HTMLElement) {
  element.style.position = 'absolute'
  element.style.width = '1px'
  element.style.height = '1px'
  element.style.padding = '0'
  element.style.margin = '-1px'
  element.style.overflow = 'hidden'
  element.style.clip = 'rect(0, 0, 0, 0)'
  element.style.whiteSpace = 'nowrap'
  element.style.border = '0'
}
