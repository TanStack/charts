import { scaleBand, scaleLinear } from 'd3-scale'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { boxY } from './box'
import type { BoxDatum } from './box'
import { dot } from './dot'
import { mountChart } from './dom'
import { whenFocused } from './focus-mark'
import { controlledSignal } from './interaction-signal'
import { interactiveColorLegend } from './interactive-legend'
import { lineY } from './line'
import { compositeMark } from './mark-composite'
import { createChartScene, defineChart } from './scene'
import { keyedSelection, whenSelected } from './selection'
import { renderChartSvg } from './svg'
import { text } from './text'
import { waffleY } from './waffle'
import type { ChartHost } from './dom-types'
import type {
  KeyedSelectionChange,
  KeyedSelectionKeyContext,
} from './selection'
import type {
  ChartKey,
  ChartMarkPointX,
  ChartMarkPointY,
  ChartMarkScaleX,
  ChartMarkScaleY,
  ChartPoint,
  SceneNode,
} from './types'

interface Row {
  id: 'a' | 'b'
  x: number
  y: number
}

type RowId = Row['id']

const rows: readonly Row[] = [
  { id: 'a', x: 0, y: 2 },
  { id: 'b', x: 1, y: 5 },
]

describe('controlled keyed selection', () => {
  it('emits typed semantic changes without mutating its snapshot', () => {
    const onChange = vi.fn()
    const key = vi.fn(
      (
        datum: Row,
        { point }: KeyedSelectionKeyContext<Row, number, number>,
      ) => {
        expect(point.datum).toBe(datum)
        return datum.id
      },
    )
    const selected = controlledSignal<
      RowId | null,
      KeyedSelectionChange<Row, RowId, number, number>
    >(null, onChange)
    const selection = keyedSelection<Row, RowId, number, number>({
      selected,
      key,
    })
    const point = chartPoint(rows[0])

    selection.change(point, 'pointer')
    selection.change(point, 'keyboard')

    expect(onChange).toHaveBeenNthCalledWith(1, 'a', {
      reason: {
        type: 'select',
        value: 'a',
        point,
        source: 'pointer',
      },
    })
    expect(onChange).toHaveBeenNthCalledWith(2, 'a', {
      reason: {
        type: 'select',
        value: 'a',
        point,
        source: 'keyboard',
      },
    })
    expect(selection.selected.value).toBeNull()
    expect(selection.matches(point)).toBe(false)
    expect(key).toHaveBeenCalledWith(rows[0], { point })
    expectTypeOf(key)
      .parameter(1)
      .toEqualTypeOf<KeyedSelectionKeyContext<Row, number, number>>()
    expectTypeOf(selection.selected.value).toEqualTypeOf<RowId | null>()
  })

  it('emits an explicit clear from a selected snapshot', () => {
    const onChange = vi.fn()
    const selection = createSelection('a', onChange)

    selection.change(null, 'pointer')

    expect(onChange).toHaveBeenCalledWith(null, {
      type: 'clear',
      value: null,
      point: null,
      source: 'pointer',
    })
    expect(selection.selected.value).toBe('a')
  })

  it('ignores unkeyed points and uses canonical string/number identity', () => {
    const stringChange = vi.fn()
    const stringSelection = keyedSelection<Row, RowId, number, number>({
      selected: controlledSignal<RowId | null, any>('a', stringChange),
      key: () => undefined,
    })
    stringSelection.change(chartPoint(rows[1]), 'pointer')
    expect(stringChange).not.toHaveBeenCalled()

    const numericSelection = keyedSelection<Row, number, number, number>({
      selected: controlledSignal<number | null, any>(1, () => {}),
      key: () => 1,
    })
    const textualSelection = keyedSelection<Row, string, number, number>({
      selected: controlledSignal<string | null, any>('1', () => {}),
      key: () => '1',
    })
    expect(numericSelection.matches(chartPoint(rows[0]))).toBe(true)
    expect(textualSelection.matches(chartPoint(rows[0]))).toBe(true)
  })

  it('filters a decorative overlay after domains resolve without adding points', () => {
    const selection = createSelection('b', () => {})
    const selectedMark = whenSelected(
      dot(rows, {
        id: 'selected-observation',
        x: 'x',
        y: 'y',
        key: 'id',
        r: 7,
        fill: '#f97316',
      }),
      selection,
    )
    const definition = defineChart({
      marks: [
        dot(rows, {
          id: 'observations',
          x: 'x',
          y: 'y',
          key: 'id',
          r: 4,
        }),
        selectedMark,
      ],
      x: { scale: scaleLinear },
      y: { scale: scaleLinear },
      selection,
    })
    const scene = createChartScene(definition, { width: 400, height: 240 })
    const selectedNodes = markPrimitives(scene.nodes, 'selected-observation')

    expect(scene.scales.x.domain).toEqual([0, 1])
    expect(scene.scales.y.domain).toEqual([2, 5])
    expect(scene.points).toHaveLength(2)
    expect(scene.points.map((point) => point.markId)).toEqual([
      'observations',
      'observations',
    ])
    expect(selectedNodes).toHaveLength(1)
    expect(selectedNodes[0]).toMatchObject({ kind: 'dot', radius: 7 })
    expect(selectedNodes[0]).not.toHaveProperty('interaction')
    expect(renderChartSvg(scene, { ariaLabel: 'Selected point' })).toContain(
      '#f97316',
    )
    expectTypeOf<ChartMarkPointX<typeof selectedMark>>().toEqualTypeOf<never>()
    expectTypeOf<ChartMarkPointY<typeof selectedMark>>().toEqualTypeOf<never>()
    expectTypeOf<ChartMarkScaleX<typeof selectedMark>>().toEqualTypeOf<number>()
    expectTypeOf<ChartMarkScaleY<typeof selectedMark>>().toEqualTypeOf<number>()
  })

  it('removes inherited focus, states, labels, and interaction while preserving motion and keys', () => {
    const selection = createSelection('a', () => {})
    const motion = { transition: { type: 'tween' as const, duration: 80 } }
    const focused = whenFocused(
      dot(rows, {
        id: 'selected-decoration',
        x: 'x',
        y: 'y',
        key: 'id',
        motion,
        states: [
          {
            when: { focus: 'primary' },
            style: { r: 10, fill: '#ef4444' },
          },
        ],
      }),
      { match: 'primary' },
    )
    const labeled = {
      ...focused,
      initialize(context: Parameters<typeof focused.initialize>[0]) {
        return { ...focused.initialize(context), layoutLabels: () => [] }
      },
    }
    const selectedMark = whenSelected(labeled, selection)
    const initialized = selectedMark.initialize({ markIndex: 0 })
    const scene = createChartScene(
      defineChart({
        marks: [selectedMark],
        x: { scale: scaleLinear },
        y: { scale: scaleLinear },
        selection,
      }),
      { width: 320, height: 180 },
    )
    const primitives = markPrimitives(scene.nodes, 'selected-decoration')

    expect(initialized.motion).toBe(motion)
    expect(initialized).not.toHaveProperty('focus')
    expect(initialized).not.toHaveProperty('states')
    expect(initialized).not.toHaveProperty('layoutLabels')
    expect(scene.points).toHaveLength(0)
    expect(primitives).toHaveLength(1)
    expect(primitives[0]?.key).toContain('selected-decoration')
    expect(primitives[0]).not.toHaveProperty('interaction')
    expect(
      flatten(scene.nodes).some((node) => node.kind === 'group' && node.focus),
    ).toBe(false)
    expect(
      flatten(scene.nodes).some((node) => node.kind === 'group' && node.states),
    ).toBe(false)
  })

  it('treats colon-containing point keys as opaque structural identities', () => {
    const labels = [
      { id: 'a' as const, x: 0, y: 2, label: 'Parent' },
      { id: 'a:child' as const, x: 1, y: 5, label: 'Child' },
    ]
    type LabelRow = (typeof labels)[number]
    const selection = keyedSelection<LabelRow, LabelRow['id'], number, number>({
      selected: controlledSignal<LabelRow['id'] | null, any>(
        'a:child',
        () => {},
      ),
      key: (datum) => datum.id,
    })
    const scene = createChartScene(
      defineChart({
        marks: [
          whenSelected(
            text(labels, {
              id: 'selected-labels',
              x: 'x',
              y: 'y',
              text: 'label',
              key: 'id',
            }),
            selection,
          ),
        ],
        x: { scale: scaleLinear },
        y: { scale: scaleLinear },
        guides: false,
        focusRing: false,
        selection,
      }),
      { width: 320, height: 180 },
    )
    const selectedLabels = flatten(scene.nodes).filter(
      (node) => node.kind === 'label',
    )

    expect(selectedLabels).toHaveLength(1)
    expect(selectedLabels[0]).toMatchObject({ text: 'Child' })
    expect(scene.points).toHaveLength(0)
  })

  it('does not confuse an exact point key with another point fragment key', () => {
    const lineRows = [
      { id: 'a' as const, x: 0, y: 2 },
      { id: 'a:dot' as const, x: 1, y: 5 },
    ]
    type LineRow = (typeof lineRows)[number]
    const selection = keyedSelection<LineRow, LineRow['id'], number, number>({
      selected: controlledSignal<LineRow['id'] | null, any>('a:dot', () => {}),
      key: (datum) => datum.id,
    })
    const scene = createChartScene(
      defineChart({
        marks: [
          whenSelected(
            lineY(lineRows, {
              id: 'selected-line',
              x: 'x',
              y: 'y',
              key: 'id',
              points: true,
            }),
            selection,
          ),
        ],
        x: { scale: scaleLinear },
        y: { scale: scaleLinear },
        guides: false,
        focusRing: false,
        selection,
      }),
      { width: 320, height: 180 },
    )
    const selectedDots = flatten(scene.nodes).filter(
      (node) => node.kind === 'dot',
    )

    expect(selectedDots).toHaveLength(1)
    expect(selectedDots[0]?.key).toContain('string:5:a:dot:dot')
    expect(scene.points).toHaveLength(0)
  })

  it('scopes decorative boxplot children to the selected summary', () => {
    const observations = [
      { id: 'a-1', group: 'A' as const, value: 1 },
      { id: 'a-2', group: 'A' as const, value: 2 },
      { id: 'a-3', group: 'A' as const, value: 3 },
      { id: 'b-1', group: 'B' as const, value: 4 },
      { id: 'b-2', group: 'B' as const, value: 5 },
      { id: 'b-3', group: 'B' as const, value: 6 },
    ]
    type Observation = (typeof observations)[number]
    type BoxPoint = BoxDatum<Observation, string>
    const selection = keyedSelection<BoxPoint, string, string, number>({
      selected: controlledSignal<string | null, any>('B', () => {}),
      key: (datum) => datum.category,
    })
    const scene = createChartScene(
      defineChart({
        marks: [
          whenSelected(
            boxY(observations, {
              id: 'selected-box',
              x: 'group',
              y: 'value',
              key: 'id',
            }),
            selection,
          ),
        ],
        x: { scale: scaleBand<string> },
        y: { scale: scaleLinear },
        guides: false,
        focusRing: false,
        selection,
      }),
      { width: 320, height: 180 },
    )
    const nodes = flatten(scene.nodes)

    expect(
      nodes.filter(
        (node) =>
          node.kind === 'rect' && node.key.includes('selected-box:box:'),
      ),
    ).toHaveLength(1)
    expect(
      nodes.filter(
        (node) =>
          node.kind === 'rule' && node.key.includes('selected-box:whisker:'),
      ),
    ).toHaveLength(1)
    expect(
      nodes.filter(
        (node) =>
          node.kind === 'rule' && node.key.includes('selected-box:median:'),
      ),
    ).toHaveLength(1)
  })

  it('preserves selected candidates from a nested retarget focus mark', () => {
    const selection = createSelection('a', () => {})
    const selectedMark = whenSelected(
      compositeMark(
        [
          whenFocused(
            dot(rows, {
              id: 'retarget-candidate',
              x: 'x',
              y: 'y',
              key: 'id',
            }),
            { match: 'primary', retarget: true },
          ),
        ],
        { id: 'selected-composite' },
      ),
      selection,
    )
    const scene = createChartScene(
      defineChart({
        marks: [selectedMark],
        x: { scale: scaleLinear },
        y: { scale: scaleLinear },
        guides: false,
        focusRing: false,
        selection,
      }),
      { width: 320, height: 180 },
    )
    const selectedDots = flatten(scene.nodes).filter(
      (node) => node.kind === 'dot',
    )

    expect(selectedDots).toHaveLength(1)
    expect(selectedDots[0]?.key).toContain('retarget-candidate')
    expect(selectedDots[0]).not.toHaveProperty('interaction')
    expect(scene.points).toHaveLength(0)
    expect(
      flatten(scene.nodes).some((node) => node.kind === 'group' && node.focus),
    ).toBe(false)
  })

  it('uses nested focus and state point metadata to scope decorative labels', () => {
    const selection = createSelection('a', () => {})
    const selectedMark = whenSelected(
      compositeMark(
        [
          whenFocused(
            text(rows, {
              id: 'focused-labels',
              x: 'x',
              y: 'y',
              text: 'id',
              key: 'id',
            }),
            { match: 'primary' },
          ),
          text(rows, {
            id: 'state-labels',
            x: 'x',
            y: 'y',
            text: 'id',
            key: 'id',
            states: [
              {
                when: { focus: 'primary' },
                style: { fill: '#ef4444' },
              },
            ],
          }),
        ],
        { id: 'metadata-composite' },
      ),
      selection,
    )
    const scene = createChartScene(
      defineChart({
        marks: [selectedMark],
        x: { scale: scaleLinear },
        y: { scale: scaleLinear },
        guides: false,
        focusRing: false,
        selection,
      }),
      { width: 320, height: 180 },
    )
    const nodes = flatten(scene.nodes)
    const selectedLabels = nodes.filter((node) => node.kind === 'label')

    expect(selectedLabels).toHaveLength(2)
    expect(selectedLabels.map((label) => label.text)).toEqual(['a', 'a'])
    expect(
      nodes.some(
        (node) => node.kind === 'group' && Boolean(node.focus || node.states),
      ),
    ).toBe(false)
    expect(scene.points).toHaveLength(0)
  })

  it('paints every structural point sharing one semantic selection key', () => {
    const duplicates = [
      { id: 'a-1', selection: 'a' as const, x: 0, y: 2 },
      { id: 'a-2', selection: 'a' as const, x: 1, y: 4 },
      { id: 'b-1', selection: 'b' as const, x: 2, y: 6 },
    ]
    type Duplicate = (typeof duplicates)[number]
    const onChange = vi.fn()
    const selection = keyedSelection<Duplicate, 'a' | 'b', number, number>({
      selected: controlledSignal<'a' | 'b' | null, any>('a', onChange),
      key: (datum) => datum.selection,
    })
    const scene = createChartScene(
      defineChart({
        marks: [
          dot(duplicates, {
            id: 'base-duplicates',
            x: 'x',
            y: 'y',
            key: 'id',
          }),
          whenSelected(
            dot(duplicates, {
              id: 'selected-duplicates',
              x: 'x',
              y: 'y',
              key: 'id',
              r: 7,
            }),
            selection,
          ),
        ],
        x: { scale: scaleLinear },
        y: { scale: scaleLinear },
        selection,
      }),
      { width: 360, height: 200 },
    )

    expect(scene.points).toHaveLength(duplicates.length)
    expect(markPrimitives(scene.nodes, 'selected-duplicates')).toHaveLength(2)
    selection.change(scene.points[1]!, 'pointer')
    expect(onChange.mock.lastCall?.[1]).toMatchObject({
      reason: {
        type: 'select',
        point: scene.points[1],
      },
    })
  })

  it('keeps every colon-keyed fragment for one selected logical waffle point', () => {
    const data = [
      { id: 'a' as const, value: 2 },
      { id: 'a:child' as const, value: 3 },
    ]
    const selection = keyedSelection<
      (typeof data)[number],
      'a' | 'a:child',
      ChartKey,
      number
    >({
      selected: controlledSignal<'a' | 'a:child' | null, any>(
        'a:child',
        () => {},
      ),
      key: (datum) => datum.id,
    })
    const scene = createChartScene(
      defineChart({
        marks: [
          whenSelected(
            waffleY(data, {
              id: 'selected-waffle',
              y: 'value',
              key: 'id',
              unit: 1,
              columns: 5,
            }),
            selection,
          ),
        ],
        guides: false,
        focusRing: false,
        selection,
      }),
      { width: 180, height: 120 },
    )

    expect(markPrimitives(scene.nodes, 'selected-waffle')).toHaveLength(3)
    expect(scene.points).toHaveLength(0)
  })

  it('applies interactive legend visibility before selected-mark filtering', () => {
    const legendRows = [
      { id: 'shown-row' as const, series: 'shown' as const, x: 0, y: 1 },
      { id: 'hidden-row' as const, series: 'hidden' as const, x: 10, y: 9 },
    ]
    type LegendRow = (typeof legendRows)[number]
    type LegendId = LegendRow['id']
    const build = (selected: LegendId) => {
      const selection = keyedSelection<LegendRow, LegendId, number, number>({
        selected: controlledSignal<LegendId | null, any>(selected, () => {}),
        key: (datum) => datum.id,
      })
      return createChartScene(
        defineChart({
          marks: [
            lineY(legendRows, {
              id: 'legend-base',
              x: 'x',
              y: 'y',
              color: 'series',
              key: 'id',
            }),
            whenSelected(
              lineY(legendRows, {
                id: 'legend-selected',
                x: 'x',
                y: 'y',
                color: 'series',
                key: 'id',
                strokeWidth: 7,
              }),
              selection,
            ),
          ],
          x: { scale: scaleLinear },
          y: { scale: scaleLinear },
          color: {
            domain: ['shown', 'hidden'],
            range: ['#2563eb', '#f97316'],
            legend: interactiveColorLegend({
              visible: controlledSignal<readonly ('shown' | 'hidden')[], any>(
                ['shown'],
                () => {},
              ),
            }),
          },
          selection,
        }),
        { width: 360, height: 220 },
      )
    }
    const shown = build('shown-row')
    const hidden = build('hidden-row')

    expect(hidden.scales.x.domain).toEqual(shown.scales.x.domain)
    expect(hidden.scales.y.domain).toEqual(shown.scales.y.domain)
    expect(hidden.scales.x.domain).toEqual([0, 10])
    expect(hidden.scales.y.domain).toEqual([1, 9])
    expect(hidden.points).toHaveLength(1)
    expect(markNodes(shown.nodes, 'legend-selected')).toHaveLength(2)
    expect(markNodes(hidden.nodes, 'legend-selected')).toHaveLength(0)
  })

  it('rejects a selected child whose post-domain filter would be ambiguous', () => {
    const selection = createSelection('a', () => {})
    const composed = compositeMark([
      whenSelected(dot(rows, { x: 'x', y: 'y', key: 'id' }), selection),
    ])

    expect(() => composed.initialize({ markIndex: 0 })).toThrow(
      'wrap the composed mark instead',
    )
  })

  it('reuses host pointer and keyboard activation and clears on background', () => {
    const container = document.createElement('div')
    document.body.append(container)
    let selected: RowId | null = null
    const changes: KeyedSelectionChange<Row, RowId, number, number>[] = []
    let host!: ChartHost<Row, number, number>
    const options = () => {
      const selection = createSelection(selected, (next, reason) => {
        selected = next
        changes.push(reason)
        host.update(options())
      })
      return {
        definition: defineChart({
          marks: [dot(rows, { x: 'x', y: 'y', key: 'id' })],
          x: { scale: scaleLinear().domain([0, 1]) },
          y: { scale: scaleLinear().domain([0, 5]) },
          maxFocusDistance: 8,
          selection,
        }),
        width: 400,
        height: 240,
        ariaLabel: 'Selectable points',
      }
    }
    host = mountChart(container, options())
    const svg = container.querySelector<SVGSVGElement>('svg')
    if (!svg) throw new Error('Expected SVG surface')
    vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      right: 400,
      bottom: 240,
      left: 0,
      width: 400,
      height: 240,
      toJSON: () => ({}),
    })
    const first = host.getScene().points[0]!
    svg.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        clientX: first.x,
        clientY: first.y,
      }),
    )
    expect(selected).toBe('a')
    expect(changes.at(-1)).toMatchObject({ type: 'select', source: 'pointer' })

    svg.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }),
    )
    svg.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }),
    )
    expect(selected).toBe('b')
    expect(changes.at(-1)).toMatchObject({ type: 'select', source: 'keyboard' })

    svg.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'Home' }),
    )
    svg.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: ' ' }))
    expect(selected).toBe('a')
    expect(changes.at(-1)).toMatchObject({ type: 'select', source: 'keyboard' })

    const changeCount = changes.length
    svg.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }),
    )
    expect(changes).toHaveLength(changeCount)

    svg.dispatchEvent(
      new MouseEvent('click', { bubbles: true, clientX: 399, clientY: 1 }),
    )
    expect(selected).toBeNull()
    expect(changes.at(-1)).toMatchObject({ type: 'clear', source: 'pointer' })

    host.destroy()
    container.remove()
  })

  it('keeps the accepted selection painted until its controller snapshot updates', () => {
    const container = document.createElement('div')
    document.body.append(container)
    let selected: RowId | null = 'a'
    const changes: KeyedSelectionChange<Row, RowId, number, number>[] = []
    const onSelect = vi.fn()
    let host!: ChartHost<Row, number, number>
    const options = () => {
      const selection = createSelection(selected, (_next, reason) => {
        changes.push(reason)
      })
      return {
        definition: defineChart({
          marks: [
            dot(rows, {
              id: 'controlled-base',
              x: 'x',
              y: 'y',
              key: 'id',
            }),
            whenSelected(
              dot(rows, {
                id: 'controlled-selected',
                x: 'x',
                y: 'y',
                key: 'id',
                r: 7,
              }),
              selection,
            ),
          ],
          x: { scale: scaleLinear().domain([0, 1]) },
          y: { scale: scaleLinear().domain([0, 5]) },
          maxFocusDistance: 8,
          selection,
        }),
        width: 400,
        height: 240,
        ariaLabel: 'Controlled selection',
        onSelect,
      }
    }
    host = mountChart(container, options())
    const svg = container.querySelector<SVGSVGElement>('svg')
    if (!svg) throw new Error('Expected SVG surface')
    vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      right: 400,
      bottom: 240,
      left: 0,
      width: 400,
      height: 240,
      toJSON: () => ({}),
    })
    const second = host.getScene().points[1]!

    svg.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        clientX: second.x,
        clientY: second.y,
      }),
    )
    expect(changes.at(-1)).toMatchObject({ value: 'b', point: second })
    expect(onSelect).toHaveBeenCalledWith(second)
    expect(selectedPrimitiveDatum(host.getScene(), 'controlled-selected')).toBe(
      rows[0],
    )

    selected = 'b'
    host.update(options())
    expect(selectedPrimitiveDatum(host.getScene(), 'controlled-selected')).toBe(
      rows[1],
    )

    svg.dispatchEvent(
      new MouseEvent('click', { bubbles: true, clientX: 399, clientY: 1 }),
    )
    expect(changes.at(-1)).toMatchObject({ type: 'clear', value: null })
    expect(selectedPrimitiveDatum(host.getScene(), 'controlled-selected')).toBe(
      rows[1],
    )

    host.destroy()
    container.remove()
  })
})

function createSelection(
  selected: RowId | null,
  onChange: (
    value: RowId | null,
    reason: KeyedSelectionChange<Row, RowId, number, number>,
  ) => void,
) {
  return keyedSelection<Row, RowId, number, number>({
    selected: controlledSignal<
      RowId | null,
      KeyedSelectionChange<Row, RowId, number, number>
    >(selected, (next, { reason }) => onChange(next, reason)),
    key: (datum) => datum.id,
  })
}

function chartPoint(datum: Row): ChartPoint<Row, number, number> {
  return {
    key: `point:${datum.id}`,
    markId: 'points',
    group: null,
    groupLabel: 'points',
    datum,
    datumIndex: rows.indexOf(datum),
    xValue: datum.x,
    yValue: datum.y,
    x: datum.x,
    y: datum.y,
    color: '#2563eb',
  }
}

function markPrimitives(nodes: readonly SceneNode[], markId: string) {
  const output: SceneNode[] = []
  const visit = (children: readonly SceneNode[]) => {
    for (const node of children) {
      if (node.kind === 'group') {
        if (node.key === markId) output.push(...node.children)
        else visit(node.children)
      }
    }
  }
  visit(nodes)
  return output
}

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}

function markNodes(nodes: readonly SceneNode[], markId: string) {
  return flatten(nodes).filter(
    (node) => node.key === markId || node.key.startsWith(`${markId}:`),
  )
}

function selectedPrimitiveDatum(
  scene: ReturnType<typeof createChartScene<Row, number, number>>,
  markId: string,
) {
  const primitive = markPrimitives(scene.nodes, markId)[0]
  if (!primitive || primitive.kind === 'group' || primitive.kind === 'label') {
    return null
  }
  return primitive.key.includes(':string:1:a') ? rows[0] : rows[1]
}
