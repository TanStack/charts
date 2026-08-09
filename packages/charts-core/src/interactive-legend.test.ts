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
import { createChartScene, defineChart } from './scene'
import { renderChartSvg } from './svg'
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
        x: { scale: scaleLinear },
        y: { scale: scaleLinear().domain([0, 900]) },
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
          x: { scale: scaleLinear },
          y: { scale: scaleLinear },
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
      x: { scale: scaleLinear },
      y: { scale: scaleLinear().domain([0, 900]) },
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
