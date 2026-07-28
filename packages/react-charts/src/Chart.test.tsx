import * as React from 'react'
import { act } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { areaY, defineChart, lineY } from '@tanstack/charts'
import { renderChartSvgWithResources } from '@tanstack/charts/svg/resources'
import { scaleLinear } from 'd3-scale'
import { Chart } from './Chart'

const data = [
  { id: 'jan', month: 1, value: 8 },
  { id: 'feb', month: 2, value: 12 },
]
const definition = defineChart({
  marks: [
    lineY(data, {
      id: 'revenue',
      x: 'month',
      y: 'value',
      key: 'id',
      points: true,
    }),
  ],
  x: { scale: scaleLinear().domain([1, 2]) },
  y: { scale: scaleLinear().domain([8, 12]) },
})

const typedDynamicDefinition = defineChart<{
  data: typeof data
  stroke: string
}>()(({ input }) => ({
  marks: [
    lineY(input.data, {
      x: 'month',
      y: 'value',
      key: 'id',
      stroke: input.stroke,
    }),
  ],
  x: { scale: scaleLinear().domain([1, 2]) },
  y: { scale: scaleLinear().domain([8, 12]) },
}))

if (false) {
  const missingInput = (
    // @ts-expect-error Dynamic chart props require input.
    <Chart definition={typedDynamicDefinition} ariaLabel="Revenue" />
  )
  const staticInput = (
    // @ts-expect-error Static chart props do not accept input.
    <Chart definition={definition} input={{}} ariaLabel="Revenue" />
  )
  const invalidDynamicProps = {
    definition: typedDynamicDefinition,
    input: { data, stroke: 42 },
    ariaLabel: 'Revenue',
  }
  const wrongInput = (
    // @ts-expect-error Dynamic chart input is inferred from the definition.
    <Chart {...invalidDynamicProps} />
  )
  const inferredCallback = (
    <Chart
      definition={typedDynamicDefinition}
      input={{ data, stroke: 'red' }}
      ariaLabel="Revenue"
      onFocusChange={(point) => {
        expectTypeOf(point?.datum).toEqualTypeOf<
          (typeof data)[number] | undefined
        >()
      }}
    />
  )
  void [missingInput, staticInput, wrongInput, inferredCallback]
}

describe('React adapter', () => {
  it('server-renders the complete shared SVG renderer output', () => {
    const html = renderToString(
      <Chart
        definition={definition}
        width={480}
        height={260}
        ariaLabel="Revenue"
        ariaDescription="Monthly revenue"
      />,
    )

    expect(html).toContain('class="ts-chart-host"')
    expect(html).toContain('class="ts-chart"')
    expect(html).toContain('aria-label="Revenue"')
    expect(html).toContain('<desc>Monthly revenue</desc>')
    expect(html).toContain('<path')
  })

  it('server-renders a deterministic proportional size', () => {
    const html = renderToString(
      <Chart
        definition={definition}
        initialWidth={480}
        aspectRatio={2}
        ariaLabel="Revenue"
      />,
    )

    expect(html).toContain('viewBox="0 0 480 240"')
    expect(html).toContain('aspect-ratio:2')
  })

  it('server-renders unique scoped resource IDs for sibling charts', () => {
    const gradientDefinition = defineChart({
      marks: [areaY([1, 3, 2], { fill: 'url(#fill)' })],
      x: { scale: scaleLinear().domain([0, 2]) },
      y: { scale: scaleLinear().domain([0, 3]) },
      gradients: [
        {
          id: 'fill',
          stops: [
            { offset: 0, color: 'red' },
            { offset: 1, color: 'blue' },
          ],
        },
      ],
    })
    const html = renderToString(
      <>
        <Chart
          definition={gradientDefinition}
          renderSvg={renderChartSvgWithResources}
          width={480}
          height={260}
          ariaLabel="First"
        />
        <Chart
          definition={gradientDefinition}
          renderSvg={renderChartSvgWithResources}
          width={480}
          height={260}
          ariaLabel="Second"
        />
      </>,
    )
    const ids = [...html.matchAll(/<linearGradient[^>]+id="([^"]+)"/g)].map(
      (match) => match[1],
    )

    expect(ids).toHaveLength(2)
    expect(new Set(ids).size).toBe(2)
    expect(html).toContain(`fill="url(#${ids[0]})"`)
    expect(html).toContain(`fill="url(#${ids[1]})"`)
  })

  it('bridges pointer focus to the original datum', async () => {
    const target = document.createElement('div')
    const onFocusChange = vi.fn()
    const root = createRoot(target)

    function StatefulChart() {
      const [, setFocused] = React.useState<unknown>(null)
      return (
        <Chart
          definition={definition}
          width={480}
          height={260}
          ariaLabel="Revenue"
          maxFocusDistance={1_000}
          onFocusChange={(point) => {
            onFocusChange(point)
            setFocused(point)
          }}
        />
      )
    }

    await act(async () => {
      root.render(<StatefulChart />)
    })

    const svg = target.querySelector('svg')
    if (!svg) throw new Error('Expected an SVG chart')
    vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      right: 480,
      bottom: 260,
      left: 0,
      width: 480,
      height: 260,
      toJSON: () => ({}),
    })

    await act(async () => {
      svg.dispatchEvent(
        new MouseEvent('pointermove', {
          bubbles: true,
          clientX: 52,
          clientY: 200,
        }),
      )
    })

    expect(onFocusChange).toHaveBeenCalled()
    expect(onFocusChange.mock.calls.at(-1)?.[0]?.datum).toBe(data[0])
    expect(
      target.querySelector('[data-ts-chart-focus]')?.getAttribute('visibility'),
    ).toBe('visible')

    await act(async () => root.unmount())
  })

  it('preserves the chart DOM for structurally equal dynamic input', async () => {
    const prepare = vi.fn(
      (input: { data: typeof data; stroke: string }) => input.data,
    )
    const dynamicDefinition = defineChart<{
      data: typeof data
      stroke: string
    }>()({
      prepare,
      prepareEqual: (previous, next) => previous.data === next.data,
      chart: ({ input, prepared }) => ({
        marks: [
          lineY(prepared, {
            x: 'month',
            y: 'value',
            key: 'id',
            stroke: input.stroke,
          }),
        ],
        x: { scale: scaleLinear().domain([1, 2]) },
        y: { scale: scaleLinear().domain([8, 12]) },
      }),
    })
    const target = document.createElement('div')
    const root = createRoot(target)

    await act(async () => {
      root.render(
        <Chart
          definition={dynamicDefinition}
          input={{ data, stroke: 'red' }}
          width={480}
          height={260}
          ariaLabel="Revenue"
        />,
      )
    })
    expect(prepare).toHaveBeenCalledOnce()
    const initialSvg = target.querySelector('svg')
    const prepareCount = prepare.mock.calls.length

    await act(async () => {
      root.render(
        <Chart
          definition={dynamicDefinition}
          input={{ data, stroke: 'red' }}
          width={480}
          height={260}
          ariaLabel="Revenue"
        />,
      )
    })

    expect(target.querySelector('svg')).toBe(initialSvg)
    expect(prepare).toHaveBeenCalledTimes(prepareCount)
    await act(async () => root.unmount())
  })

  it('hydrates complete server markup without replacing the SVG', async () => {
    const target = document.createElement('div')
    target.innerHTML = renderToString(
      <Chart
        definition={definition}
        width={480}
        height={260}
        ariaLabel="Revenue"
      />,
    )
    const serverSvg = target.querySelector('svg')
    let root!: ReturnType<typeof hydrateRoot>

    await act(async () => {
      root = hydrateRoot(
        target,
        <Chart
          definition={definition}
          width={480}
          height={260}
          ariaLabel="Revenue"
        />,
      )
    })

    expect(target.querySelector('svg')).toBe(serverSvg)
    await act(async () => root.unmount())
  })
})
