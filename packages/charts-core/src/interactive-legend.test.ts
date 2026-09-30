import { scaleLinear } from 'd3-scale'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { mountChart } from './dom'
import {
  controlledSignal,
  type ControlledSignalChangeContext,
} from './interaction-signal'
import {
  interactiveColorLegend,
  type InteractiveColorLegendChange,
  type InteractiveColorLegendItemContext,
} from './interactive-legend'
import { lineY } from './line'
import { dot } from './dot'
import { createChartScene, defineChart } from './scene'
import { renderChartSvg } from './svg'
import { tooltip } from './tooltip'
import type { ChartHost } from './dom-types'
import type {
  ChartBounds,
  ChartHostControl,
  ChartKey,
  StaticChartDefinition,
} from './types'

const rows = [
  { x: 0, y: 120, series: 'Manufacturing' as const },
  { x: 1, y: 160, series: 'Manufacturing' as const },
  { x: 0, y: 70, series: 'Construction' as const },
  { x: 1, y: 90, series: 'Construction' as const },
]

type Series = (typeof rows)[number]['series']

describe('interactiveColorLegend', () => {
  it('filters dot series when z supplies both ownership and default color', () => {
    const scene = createChartScene(
      defineChart({
        marks: [dot(rows, { x: 'x', y: 'y', z: 'series' })],
        scales: { x: { scale: scaleLinear }, y: { scale: scaleLinear } },
        color: {
          legend: interactiveColorLegend({
            visible: controlledSignal<
              readonly Series[],
              InteractiveColorLegendChange<Series>
            >(['Manufacturing'], () => {}),
          }),
        },
      }),
      { width: 480, height: 320 },
    )
    expect(scene.points).toHaveLength(2)
    expect(scene.points.every((point) => point.group === 'Manufacturing')).toBe(
      true,
    )
  })

  it('does not treat independent dot paint categories as semantic series', () => {
    const data = rows.map((row, index) => ({
      ...row,
      paint: index % 2 ? 'cool' : 'warm',
    }))
    const scene = createChartScene(
      defineChart({
        marks: [dot(data, { x: 'x', y: 'y', z: 'series', color: 'paint' })],
        scales: { x: { scale: scaleLinear }, y: { scale: scaleLinear } },
        color: {
          legend: interactiveColorLegend({
            visible: controlledSignal<
              readonly string[],
              InteractiveColorLegendChange<string>
            >(['warm'], () => {}),
          }),
        },
      }),
      { width: 480, height: 320 },
    )
    expect(scene.points).toHaveLength(data.length)
    expect(new Set(scene.points.map((point) => point.group))).toEqual(
      new Set(['Manufacturing', 'Construction']),
    )
  })

  it('refreshes hovered ownership on data updates and clears disabled or removed emphasis', () => {
    let data = rows.map((row) => ({ ...row }))
    let hover: 'series' | false = 'series'
    let visible: readonly Series[] = ['Manufacturing', 'Construction']
    let showLegend = true
    const observed: (typeof data)[number][] = []
    const options = () => ({
      definition: defineChart({
        marks: [
          lineY(data, {
            id: 'industries',
            x: 'x',
            y: 'y',
            color: 'series',
            states: [
              {
                when: (context) => {
                  expect(context.data[context.index]).toBe(context.datum)
                  observed.push(context.datum)
                  return !context.matches('series')
                },
                style: { opacity: 0.2 },
              },
            ],
          }),
        ],
        scales: { x: { scale: scaleLinear }, y: { scale: scaleLinear } },
        color: {
          domain: ['Manufacturing', 'Construction'],
          range: ['#2563eb', '#f97316'],
          legend: showLegend
            ? interactiveColorLegend({
                hover,
                visible: controlledSignal(visible, () => {}),
              })
            : undefined,
        },
        svgAnimation: false,
        keyboard: false,
        pointer: false,
      }),
      width: 480,
      height: 320,
      ariaLabel: 'Updated emphasis',
    })
    const container = document.createElement('div')
    document.body.append(container)
    const host = mountChart(container, options())
    try {
      const button = legendButton(container, 'Construction')
      button.dispatchEvent(new MouseEvent('pointerenter'))
      expect(
        container.querySelector('[stroke="#2563eb"][opacity="0.2"]'),
      ).not.toBeNull()
      data = data.map((row) => ({ ...row, y: row.y + 10 }))
      observed.length = 0
      host.update(options())
      expect(legendButton(container, 'Construction')).toBe(button)
      expect(
        container.querySelector('[stroke="#2563eb"][opacity="0.2"]'),
      ).not.toBeNull()
      expect(observed.length).toBeGreaterThan(0)
      expect(observed.every((datum) => data.includes(datum))).toBe(true)
      hover = false
      host.update(options())
      expect(container.querySelector('[opacity="0.2"]')).toBeNull()
      button.dispatchEvent(new MouseEvent('pointerenter'))
      expect(container.querySelector('[opacity="0.2"]')).toBeNull()
      hover = 'series'
      host.update(options())
      button.dispatchEvent(new MouseEvent('pointerenter'))
      visible = ['Manufacturing']
      host.update(options())
      expect(container.querySelector('[opacity="0.2"]')).toBeNull()
      expect(
        host
          .getScene()
          .points.every((point) => point.group === 'Manufacturing'),
      ).toBe(true)
      visible = ['Manufacturing', 'Construction']
      host.update(options())
      button.dispatchEvent(new MouseEvent('pointerenter'))
      showLegend = false
      host.update(options())
      expect(container.querySelector('button[data-series-id]')).toBeNull()
      expect(container.querySelector('[opacity="0.2"]')).toBeNull()
    } finally {
      host.destroy()
      container.remove()
    }
  })

  it('emphasizes a series without replacing pinned interaction focus or tooltip', () => {
    const container = document.createElement('div')
    document.body.append(container)
    const onFocusChange = vi.fn()
    const stateSources: string[] = []
    const definition = defineChart({
      marks: [
        lineY(rows, {
          id: 'industries',
          x: 'x',
          y: 'y',
          color: 'series',
          states: [
            {
              when: (context) => {
                stateSources.push(context.focus.source)
                return !context.matches('series')
              },
              style: { opacity: 0.2 },
            },
          ],
        }),
      ],
      scales: { x: { scale: scaleLinear }, y: { scale: scaleLinear } },
      color: {
        domain: ['Manufacturing', 'Construction'],
        range: ['#2563eb', '#f97316'],
        legend: interactiveColorLegend({
          hover: 'series',
          visible: controlledSignal<
            readonly Series[],
            InteractiveColorLegendChange<Series>
          >(['Manufacturing', 'Construction'], () => {}),
        }),
      },
      svgAnimation: false,
      pointer: false,
      keyboard: false,
      tooltip,
    })
    const host = mountChart(container, {
      definition,
      width: 480,
      height: 320,
      ariaLabel: 'Series',
      onFocusChange,
    })
    try {
      const point = host
        .getScene()
        .points.find((point) => point.group === 'Manufacturing')!
      host.interaction.setControlledFocus(point, { pinned: true })
      const tooltipElement =
        container.querySelector<HTMLElement>('.ts-chart-tooltip')!
      const pinnedText = tooltipElement.textContent
      onFocusChange.mockClear()
      stateSources.length = 0
      const construction = legendButton(container, 'Construction')
      construction.dispatchEvent(new MouseEvent('pointerenter'))
      expect(
        container.querySelector('[stroke="#2563eb"][opacity="0.2"]'),
      ).not.toBeNull()
      expect(
        container.querySelector('[stroke="#f97316"][opacity="0.2"]'),
      ).toBeNull()
      expect(stateSources).toContain('legend')
      expect(onFocusChange).not.toHaveBeenCalled()
      expect(tooltipElement.hidden).toBe(false)
      expect(tooltipElement.textContent).toBe(pinnedText)
      construction.dispatchEvent(new MouseEvent('pointerleave'))
      expect(
        container.querySelector('[stroke="#f97316"][opacity="0.2"]'),
      ).not.toBeNull()
      expect(
        container.querySelector('[stroke="#2563eb"][opacity="0.2"]'),
      ).toBeNull()
      construction.focus()
      expect(
        container.querySelector('[stroke="#2563eb"][opacity="0.2"]'),
      ).not.toBeNull()
      construction.blur()
      expect(
        container.querySelector('[stroke="#f97316"][opacity="0.2"]'),
      ).not.toBeNull()
      expect(onFocusChange).not.toHaveBeenCalled()
      expect(tooltipElement.textContent).toBe(pinnedText)
      host.interaction.setControlledFocus(null)
      onFocusChange.mockClear()
      construction.dispatchEvent(new MouseEvent('pointerenter'))
      expect(
        container.querySelector('[stroke="#2563eb"][opacity="0.2"]'),
      ).not.toBeNull()
      expect(tooltipElement.hidden).toBe(true)
      expect(onFocusChange).not.toHaveBeenCalled()
      construction.dispatchEvent(new MouseEvent('pointerleave'))
      expect(container.querySelector('[opacity="0.2"]')).toBeNull()
    } finally {
      host.destroy()
      expect(container.childElementCount).toBe(0)
      container.remove()
    }
  })

  it('filters series after scale resolution and retains a static fallback', () => {
    const definition = createDefinition(['Manufacturing'], () => {})
    const scene = createChartScene(definition, { width: 480, height: 320 })

    expect(scene.colors.domain).toEqual(['Manufacturing', 'Construction'])
    expect(scene.scales.x.domain).toEqual([0, 1])
    expect(scene.scales.y.domain).toEqual([0, 900])
    expect(scene.points).toHaveLength(2)
    expect(new Set(scene.points.map((point) => point.group))).toEqual(
      new Set(['Manufacturing']),
    )
    expect(scene.nodes.some((node) => node.key === 'legend')).toBe(true)
    expect(scene.controls).toHaveLength(1)
    expect(renderChartSvg(scene, { ariaLabel: 'Chart' })).toContain(
      'ts-chart__legend--interactive-fallback',
    )
  })

  it('keeps bottom legend space separate from x-axis guide space', () => {
    const withoutLegend = createChartScene(
      defineChart({
        marks: [lineY(rows, { x: 'x', y: 'y', color: 'series' })],
        scales: {
          x: { scale: scaleLinear },
          y: { scale: scaleLinear().domain([0, 900]) },
        },
        color: {
          domain: ['Manufacturing', 'Construction'],
          range: ['#2563eb', '#f97316'],
        },
      }),
      { width: 480, height: 320 },
    )
    const withLegend = createChartScene(
      createDefinition(['Manufacturing', 'Construction'], () => {}),
      { width: 480, height: 320 },
    )
    const control = interactiveControl(withLegend.controls?.[0])

    expect(withLegend.margin.bottom).toBeGreaterThan(
      withoutLegend.margin.bottom + 40,
    )
    expect(control).toMatchObject({
      fallbackNodeKey: 'legend',
      kind: 'interactive-color-legend',
    })
    expect(control.bounds.y).toBeGreaterThanOrEqual(
      withLegend.chart.y + withLegend.chart.height,
    )
  })

  it('uses the authored item width for the static fallback layout', () => {
    const scene = createChartScene(
      createDefinition(['Manufacturing', 'Construction'], () => {}, 200),
      { width: 320, height: 320 },
    )
    const legend = scene.nodes.find((node) => node.key === 'legend')
    if (legend?.kind !== 'group') throw new Error('Expected legend fallback')
    const labelRows = new Set(
      legend.children.flatMap((node) =>
        node.kind === 'label' ? [node.y] : [],
      ),
    )

    expect(labelRows.size).toBe(2)
  })

  it('passes named visibility context to item aria-label callbacks', () => {
    const itemAriaLabel = vi.fn(
      (value: Series, { visible }: InteractiveColorLegendItemContext) =>
        `${value} is ${visible ? 'visible' : 'hidden'}`,
    )

    createChartScene(
      createDefinition(['Manufacturing'], () => {}, undefined, itemAriaLabel),
      { width: 480, height: 320 },
    )

    expect(itemAriaLabel.mock.calls).toEqual([
      ['Manufacturing', { visible: true }],
      ['Construction', { visible: false }],
    ])
    expectTypeOf(itemAriaLabel)
      .parameter(1)
      .toEqualTypeOf<InteractiveColorLegendItemContext>()
  })

  it('emits domain-ordered controlled changes without internal drift', () => {
    const onChange = vi.fn()
    const scene = createChartScene(
      createDefinition(['Construction'], onChange),
      { width: 480, height: 320 },
    )
    const control = interactiveControl(scene.controls?.[0])

    control.toggle('Manufacturing')
    expect(onChange).toHaveBeenCalledWith(['Manufacturing', 'Construction'], {
      type: 'toggle',
      value: 'Manufacturing',
      visible: true,
    })
    expect(scene.points).toHaveLength(2)
  })

  it('supports a controlled zero-visible state without changing domains', () => {
    const scene = createChartScene(
      createDefinition([], () => {}),
      {
        width: 480,
        height: 320,
      },
    )

    expect(scene.points).toHaveLength(0)
    expect(scene.scales.y.domain).toEqual([0, 900])
    expect(scene.colors.domain).toEqual(['Manufacturing', 'Construction'])
  })

  it('rejects quantitative color legends', () => {
    expect(() =>
      createChartScene(
        defineChart({
          marks: [lineY(rows, { x: 'x', y: 'y', z: 'series', color: 'y' })],
          scales: {
            x: { scale: scaleLinear },
            y: { scale: scaleLinear },
          },
          color: {
            scale: scaleLinear<string>().range(['#eff6ff', '#1d4ed8']),
            legend: interactiveColorLegend({
              visible: controlledSignal<readonly number[], any>(
                [120],
                () => {},
              ),
            }),
          },
        }),
        { width: 480, height: 320 },
      ),
    ).toThrow(/categorical color scale/u)
  })

  it('mounts stable native buttons without leaking events into the chart', () => {
    const container = document.createElement('div')
    document.body.append(container)
    let visible: readonly Series[] = ['Manufacturing', 'Construction']
    let host: ChartHost<(typeof rows)[number], number, number>
    const onSelect = vi.fn()
    const options = () => ({
      definition: createDefinition(visible, (next) => {
        visible = next
        host.update(options())
      }),
      width: 480,
      height: 320,
      ariaLabel: 'Interactive series chart',
      onSelect,
    })
    host = mountChart(container, options())

    const manufacturing = legendButton(container, 'Manufacturing')
    manufacturing.focus()
    manufacturing.click()

    expect(visible).toEqual(['Construction'])
    expect(manufacturing.getAttribute('aria-pressed')).toBe('false')
    expect(document.activeElement).toBe(manufacturing)
    expect(legendButton(container, 'Manufacturing')).toBe(manufacturing)
    expect(onSelect).not.toHaveBeenCalled()
    expect(container.querySelector('.ts-chart__legend')).toBeNull()
    expect(host.getScene().nodes.some((node) => node.key === 'legend')).toBe(
      false,
    )

    host.destroy()
    expect(container.childElementCount).toBe(0)
    container.remove()
  })

  it('preserves literal selection and change-reason types', () => {
    const signal = controlledSignal<
      readonly Series[],
      InteractiveColorLegendChange<Series>
    >(['Manufacturing'], () => {})
    const legend = interactiveColorLegend({ visible: signal })

    expectTypeOf(signal.onChange)
      .parameter(0)
      .toEqualTypeOf<readonly Series[]>()
    expectTypeOf(signal.onChange)
      .parameter(1)
      .toEqualTypeOf<
        ControlledSignalChangeContext<InteractiveColorLegendChange<Series>>
      >()
    expectTypeOf(legend).not.toBeAny()
  })
})

function createDefinition(
  visible: readonly Series[],
  onChange: (
    value: readonly Series[],
    reason: InteractiveColorLegendChange<Series>,
  ) => void,
  itemWidth?: number,
  itemAriaLabel?: (
    value: Series,
    context: InteractiveColorLegendItemContext,
  ) => string,
): StaticChartDefinition<(typeof rows)[number], number, number, 'dom'> {
  return defineChart(
    defineChart({
      marks: [
        lineY(rows, {
          id: 'industry-lines',
          x: 'x',
          y: 'y',
          color: 'series',
        }),
      ],
      scales: {
        x: { scale: scaleLinear },
        y: { scale: scaleLinear().domain([0, 900]) },
      },
      color: {
        domain: ['Manufacturing', 'Construction'],
        range: ['#2563eb', '#f97316'],
        legend: interactiveColorLegend({
          visible: controlledSignal<
            readonly Series[],
            InteractiveColorLegendChange<Series>
          >(visible, (next, { reason }) => onChange(next, reason)),
          ariaLabel: 'Series visibility',
          itemWidth,
          itemAriaLabel,
        }),
      },
    }),
    { svgAnimation: false, keyboard: false },
  )
}

function interactiveControl(control: ChartHostControl | undefined) {
  if (!control || !('kind' in control) || !('bounds' in control)) {
    throw new Error('Expected an interactive legend control')
  }
  return control as ChartHostControl & {
    kind: 'interactive-color-legend'
    bounds: ChartBounds
    toggle: (value: ChartKey) => void
  }
}

function legendButton(container: HTMLElement, value: ChartKey) {
  const button = container.querySelector<HTMLButtonElement>(
    `[data-chart-legend-value="${String(value)}"]`,
  )
  if (!button) throw new Error(`Missing legend button for ${String(value)}`)
  return button
}
