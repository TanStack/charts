import { describe, expect, expectTypeOf, it } from 'vitest'
import { lineY } from '../line'
import { pie, polar, radialArc } from '../polar'
import { ruleX, ruleY } from '../rule'
import { createChartScene, defineChart } from '../scene'
import { scaleBand } from '../scales-band'
import { scaleLinear } from '../scales-linear'
import { text } from '../text'
import type {
  ChartDefinition,
  ChartValue,
  DomChartDefinition,
  SceneNode,
} from '../types'
import { ChartJsonError } from './error'
import { chartFromJson } from './chart-from-json'
import { chartJsonOperations } from './operation-contracts'
import { chartJsonSchema } from './schema'
import { validateChartJsonVersion } from './version-compatibility'
import { chartJsonVersion } from './version'

const rows = [
  { category: 'Alpha', value: 3 },
  { category: 'Beta', value: 7 },
]

function lineSource(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    chartsVersion: chartJsonVersion,
    spec: {
      marks: [
        {
          $call: 'tanstack.mark.line-y',
          data: { $data: 'rows' },
          x: 'category',
          y: 'value',
        },
      ],
      x: { scale: { $call: 'tanstack.scale.band' } },
      y: { scale: { $call: 'tanstack.scale.linear' } },
    },
    ...overrides,
  })
}

function pieSource(
  mark: Record<string, unknown> = {},
  spec: Record<string, unknown> = {},
  data: readonly unknown[] = rows,
): string {
  return JSON.stringify({
    chartsVersion: chartJsonVersion,
    spec: {
      marks: [
        {
          $call: 'tanstack.mark.pie',
          data: { $data: 'rows' },
          value: 'value',
          category: 'category',
          ...mark,
        },
      ],
      color: {
        domain: ['Alpha', 'Beta'],
        range: ['#2563eb', '#f97316'],
      },
      ...spec,
    },
    data: { rows: data },
  })
}

function issueFrom(source: string): ChartJsonError {
  try {
    chartFromJson(source)
  } catch (error) {
    expect(error).toBeInstanceOf(ChartJsonError)
    return error as ChartJsonError
  }
  throw new Error('Expected Chart JSON to fail')
}

describe('chartFromJson', () => {
  it('translates bundled JSON to an ordinary host-neutral definition', () => {
    const metadata = {
      title: 'Category totals',
      description: 'Totals for Alpha and Beta.',
    }
    const definition = chartFromJson(lineSource({ data: { rows }, metadata }))
    const portable = createChartScene(definition, {
      width: 480,
      height: 260,
    })
    const direct = createChartScene(
      defineChart({
        marks: [lineY(rows, { x: 'category', y: 'value' })],
        x: { scale: scaleBand<string> },
        y: { scale: scaleLinear },
      }),
      { width: 480, height: 260 },
    )

    expect(portable.scales.x.domain).toEqual(direct.scales.x.domain)
    expect(portable.scales.y.domain).toEqual(direct.scales.y.domain)
    expect(portable.nodes).toEqual(direct.nodes)
    expect(definition.metadata).toEqual(metadata)
    expectTypeOf(definition).toMatchTypeOf<
      ChartDefinition<unknown, ChartValue, ChartValue, never>
    >()
    const domDefinition: DomChartDefinition = definition
    void domDefinition
  })

  it('translates full-span reference rules like the direct mark API', () => {
    const definition = chartFromJson(
      JSON.stringify({
        chartsVersion: chartJsonVersion,
        spec: {
          marks: [
            {
              $call: 'tanstack.mark.rule-x',
              data: { $data: 'rows' },
              id: 'events',
              x: 'category',
              color: 'category',
              strokeOpacity: 0.8,
              strokeWidth: 2,
              strokeDasharray: '4 2',
            },
            {
              $call: 'tanstack.mark.rule-y',
              data: { $data: 'rows' },
              id: 'targets',
              y: 'value',
              stroke: '#b91c1c',
              strokeOpacity: 0.4,
              strokeWidth: 3,
              strokeDasharray: '2 3',
            },
          ],
          x: { scale: { $call: 'tanstack.scale.band' } },
          y: { scale: { $call: 'tanstack.scale.linear' } },
          color: {
            domain: ['Alpha', 'Beta'],
            range: ['#2563eb', '#f97316'],
          },
        },
        data: { rows },
      }),
    )
    const portable = createChartScene(definition, {
      width: 480,
      height: 260,
    })
    const direct = createChartScene(
      defineChart({
        marks: [
          ruleX(rows, {
            id: 'events',
            x: 'category',
            color: 'category',
            strokeOpacity: 0.8,
            strokeWidth: 2,
            strokeDasharray: '4 2',
          }),
          ruleY(rows, {
            id: 'targets',
            y: 'value',
            stroke: '#b91c1c',
            strokeOpacity: 0.4,
            strokeWidth: 3,
            strokeDasharray: '2 3',
          }),
        ],
        x: { scale: scaleBand<string> },
        y: { scale: scaleLinear },
        color: {
          domain: ['Alpha', 'Beta'],
          range: ['#2563eb', '#f97316'],
        },
      }),
      { width: 480, height: 260 },
    )

    expect(portable.nodes).toEqual(direct.nodes)
    expect(portable.scales.x.domain).toEqual(direct.scales.x.domain)
    expect(portable.scales.y.domain).toEqual(direct.scales.y.domain)
  })

  it('preserves native scalar-datum fallback for reference rules', () => {
    const portable = createChartScene(
      chartFromJson(
        JSON.stringify({
          chartsVersion: chartJsonVersion,
          spec: {
            marks: [
              {
                $call: 'tanstack.mark.rule-x',
                data: { $data: 'events' },
              },
              {
                $call: 'tanstack.mark.rule-y',
                data: { $data: 'targets' },
              },
            ],
            x: { scale: { $call: 'tanstack.scale.band' } },
            y: { scale: { $call: 'tanstack.scale.linear' } },
          },
          data: { events: ['Alpha'], targets: [5] },
        }),
      ),
      { width: 320, height: 180 },
    )
    const direct = createChartScene(
      defineChart({
        marks: [ruleX(['Alpha']), ruleY([5])],
        x: { scale: scaleBand<string> },
        y: { scale: scaleLinear },
      }),
      { width: 320, height: 180 },
    )

    expect(portable.nodes).toEqual(direct.nodes)
    expect(portable.scales.x.domain).toEqual(direct.scales.x.domain)
    expect(portable.scales.y.domain).toEqual(direct.scales.y.domain)
    expect(
      flatten(portable.nodes).filter(
        (node) =>
          node.kind === 'group' && node.className?.includes('ts-chart__rule'),
      ),
    ).toHaveLength(2)
  })

  it('publishes closed rule annotation contracts in the schema', () => {
    const definitions = (chartJsonSchema as any).$defs

    expect(definitions['operation:tanstack.mark.rule-x']).toMatchObject({
      required: ['$call', 'data'],
      additionalProperties: false,
    })
    expect(
      Object.keys(
        definitions['operation:tanstack.mark.rule-x'].properties,
      ).sort(),
    ).toEqual([
      '$call',
      'color',
      'data',
      'id',
      'stroke',
      'strokeDasharray',
      'strokeOpacity',
      'strokeWidth',
      'x',
    ])
    expect(definitions['operation:tanstack.mark.rule-y']).toMatchObject({
      required: ['$call', 'data'],
      additionalProperties: false,
    })
    expect(
      Object.keys(
        definitions['operation:tanstack.mark.rule-y'].properties,
      ).sort(),
    ).toEqual([
      '$call',
      'color',
      'data',
      'id',
      'stroke',
      'strokeDasharray',
      'strokeOpacity',
      'strokeWidth',
      'y',
    ])
  })

  it('lets a detached iterable replace bundled rows', () => {
    function* replacement() {
      yield { category: 'Replacement', value: 11 }
    }
    const definition = chartFromJson(lineSource({ data: { rows } }), {
      data: { rows: replacement() },
    })
    const scene = createChartScene(definition, {
      width: 320,
      height: 180,
    })

    expect(scene.scales.x.domain).toEqual(['Replacement'])
  })

  it('materializes a shared host iterator for every referencing mark', () => {
    const authored = JSON.parse(lineSource())
    authored.spec.marks.push({ ...authored.spec.marks[0], id: 'second-line' })
    function* replacement() {
      yield { category: 'Alpha', value: 3 }
      yield { category: 'Beta', value: 7 }
    }

    const scene = createChartScene(
      chartFromJson(JSON.stringify(authored), {
        data: { rows: replacement() },
      }),
      { width: 320, height: 180 },
    )
    const lineGroups = flatten(scene.nodes).filter(
      (node) =>
        node.kind === 'group' && node.className?.includes('ts-chart__line'),
    )

    expect(lineGroups).toHaveLength(2)
  })

  it.each([
    ['pie', undefined],
    ['donut', 0.55],
  ] as const)('renders a %s like the direct polar API', (_, ratio) => {
    const id = ratio === undefined ? 'revenue-pie' : 'revenue-donut'
    const definition = chartFromJson(
      pieSource({
        id,
        ...(ratio === undefined ? {} : { innerRadiusRatio: ratio }),
      }),
    )
    const portable = createChartScene(definition, {
      width: 480,
      height: 260,
    })
    const slices = pie(rows, { value: 'value' })
    const direct = createChartScene(
      defineChart({
        marks: [
          polar({
            id,
            marks: [
              radialArc(slices, {
                z: 'category',
                color: 'category',
                ...(ratio === undefined
                  ? {}
                  : { innerRadius: ({ radius }) => radius * ratio }),
              }),
            ],
          }),
        ],
        color: {
          domain: ['Alpha', 'Beta'],
          range: ['#2563eb', '#f97316'],
        },
      }),
      { width: 480, height: 260 },
    )

    expect(portable.nodes).toEqual(direct.nodes)
    expect(definition.marks[0]?.initialize({ markIndex: 0 }).id).toBe(id)
    expect(definition).not.toHaveProperty('x')
    expect(definition).not.toHaveProperty('y')
  })

  it('renders positioned text like the direct API', () => {
    const labelRows = [
      { category: 'Alpha', value: 3, label: 'Three' },
      { category: 'Beta', value: 7, label: 'Seven' },
    ]
    const source = JSON.stringify({
      chartsVersion: chartJsonVersion,
      spec: {
        marks: [
          {
            $call: 'tanstack.mark.text',
            data: { $data: 'rows' },
            id: 'value-labels',
            x: 'category',
            y: 'value',
            text: 'label',
            key: 'category',
            fill: '#111827',
            fontSize: 12,
            fontWeight: 600,
            anchor: 'end',
            rotate: -12,
            dx: 4,
            dy: -6,
          },
        ],
        x: { scale: { $call: 'tanstack.scale.band' } },
        y: { scale: { $call: 'tanstack.scale.linear' } },
      },
      data: { rows: labelRows },
    })
    const portable = createChartScene(chartFromJson(source), {
      width: 480,
      height: 260,
    })
    const direct = createChartScene(
      defineChart({
        marks: [
          text(labelRows, {
            id: 'value-labels',
            x: 'category',
            y: 'value',
            text: 'label',
            key: 'category',
            fill: '#111827',
            fontSize: 12,
            fontWeight: 600,
            anchor: 'end',
            rotate: -12,
            dx: 4,
            dy: -6,
          }),
        ],
        x: { scale: scaleBand<string> },
        y: { scale: scaleLinear },
      }),
      { width: 480, height: 260 },
    )

    expect(portable.nodes).toEqual(direct.nodes)
    expect(portable.points).toEqual(direct.points)
    expect(flatten(portable.nodes)).toContainEqual(
      expect.objectContaining({
        kind: 'label',
        text: 'Three',
        anchor: 'end',
        rotate: -12,
        fontSize: 12,
        fontWeight: 600,
      }),
    )
  })

  it('rejects an invalid text anchor at its argument path', () => {
    const authored = JSON.parse(lineSource({ data: { rows } }))
    authored.spec.marks = [
      {
        $call: 'tanstack.mark.text',
        data: { $data: 'rows' },
        x: 'category',
        y: 'value',
        text: 'value',
        anchor: 'left',
      },
    ]

    const error = issueFrom(JSON.stringify(authored))

    expect(error.issues).toContainEqual(
      expect.objectContaining({
        code: 'invalid-arguments',
        path: '/spec/marks/0/anchor',
      }),
    )
  })

  it('supports exactly the fixed operation set and nested roles', () => {
    expect(chartJsonOperations.map(({ id }) => id)).toEqual([
      'tanstack.accessor.iso-date',
      'tanstack.legend.color',
      'tanstack.layout.group',
      'tanstack.mark.area-y',
      'tanstack.mark.bar-x',
      'tanstack.mark.bar-y',
      'tanstack.mark.dot',
      'tanstack.mark.line-y',
      'tanstack.mark.rule-x',
      'tanstack.mark.rule-y',
      'tanstack.mark.text',
      'tanstack.mark.pie',
      'tanstack.scale.band',
      'tanstack.scale.linear',
      'tanstack.scale.point',
      'tanstack.scale.utc',
    ])

    const definition = chartFromJson(
      JSON.stringify({
        chartsVersion: chartJsonVersion,
        spec: {
          marks: [
            {
              $call: 'tanstack.mark.area-y',
              data: { $data: 'rows' },
              x: {
                $call: 'tanstack.accessor.iso-date',
                field: 'recordedAt',
              },
              y: 'value',
            },
            {
              $call: 'tanstack.mark.bar-x',
              data: { $data: 'rows' },
              x: 'value',
              y: 'category',
              layout: {
                $call: 'tanstack.layout.group',
                scale: { $call: 'tanstack.scale.band' },
                padding: 2,
              },
            },
            {
              $call: 'tanstack.mark.bar-y',
              data: { $data: 'rows' },
              x: 'category',
              y: 'value',
            },
            {
              $call: 'tanstack.mark.dot',
              data: { $data: 'rows' },
              x: 'category',
              y: 'value',
              r: 3,
            },
            {
              $call: 'tanstack.mark.line-y',
              data: { $data: 'rows' },
              x: 'category',
              y: 'value',
              points: true,
            },
          ],
          x: { scale: { $call: 'tanstack.scale.point' } },
          y: { scale: { $call: 'tanstack.scale.utc' } },
          color: {
            domain: ['Alpha', 'Beta'],
            range: ['#2563eb', '#f97316'],
            legend: {
              $call: 'tanstack.legend.color',
              label: 'Category',
              placement: 'bottom',
            },
          },
        },
        data: {
          rows: [
            {
              category: 'Alpha',
              value: 3,
              recordedAt: '2026-08-19T12:00:00Z',
            },
          ],
        },
      }),
    )

    expect(definition.marks).toHaveLength(5)
  })

  it('keeps operation descriptions and required data in the schema', () => {
    const schema = chartJsonSchema as any
    const definitions = schema.$defs as Record<string, any>
    const operationKeys = Object.keys(definitions).filter((key) =>
      key.startsWith('operation:'),
    )

    expect(operationKeys).toHaveLength(16)
    expect(definitions['operation:tanstack.mark.bar-y'].required).toEqual([
      '$call',
      'data',
    ])
    expect(
      definitions['operation:tanstack.mark.bar-y'].description,
    ).toBeTruthy()
    expect(definitions['operation:tanstack.mark.pie'].required).toEqual([
      '$call',
      'data',
      'value',
      'category',
    ])
    expect(definitions['operation:tanstack.mark.text'].required).toEqual([
      '$call',
      'data',
    ])
    expect(definitions['argument:text-anchor']).toEqual({
      enum: ['start', 'middle', 'end'],
    })
    expect(definitions['argument:ratio']).toEqual({
      type: 'number',
      minimum: 0,
      exclusiveMaximum: 1,
    })
    expect(definitions['argument:data']).toEqual({ $ref: '#/$defs/data' })
    expect(schema.properties.data.additionalProperties.type).toBe('array')

    const [cartesian, circular] = schema.properties.spec.oneOf
    expect(cartesian.required).toEqual(['marks', 'x', 'y'])
    expect(cartesian.properties.marks.items).toEqual({
      $ref: '#/$defs/result:mark:cartesian',
    })
    expect(circular.required).toEqual(['marks'])
    expect(circular.properties.marks).toMatchObject({
      minItems: 1,
      maxItems: 1,
      items: { $ref: '#/$defs/result:mark:circular' },
    })
    expect(circular.properties).not.toHaveProperty('x')
    expect(circular.properties).not.toHaveProperty('y')
    expect(circular.properties).not.toHaveProperty('guides')
  })

  it('keeps the circular dialect singular and separate from Cartesian charts', () => {
    const mixed = JSON.parse(pieSource())
    mixed.spec.marks.push({
      $call: 'tanstack.mark.line-y',
      data: { $data: 'rows' },
      x: 'category',
      y: 'value',
    })
    expect(issueFrom(JSON.stringify(mixed)).issues[0]).toMatchObject({
      code: 'invalid-arguments',
      path: '/spec/marks',
    })

    const repeated = JSON.parse(pieSource())
    repeated.spec.marks.push({ ...repeated.spec.marks[0] })
    expect(issueFrom(JSON.stringify(repeated)).issues[0]).toMatchObject({
      code: 'invalid-arguments',
      path: '/spec/marks',
    })

    for (const [field, value] of [
      ['x', { scale: { $call: 'tanstack.scale.band' } }],
      ['y', { scale: { $call: 'tanstack.scale.linear' } }],
      ['guides', false],
    ] as const) {
      const forbidden = JSON.parse(pieSource())
      forbidden.spec[field] = value
      expect(issueFrom(JSON.stringify(forbidden)).issues[0]).toMatchObject({
        code: 'invalid-arguments',
        path: `/spec/${field}`,
      })
    }
  })

  it('validates pie arguments and source fields at the call boundary', () => {
    for (const ratio of [-0.01, 1]) {
      expect(
        issueFrom(pieSource({ innerRadiusRatio: ratio })).issues[0],
      ).toMatchObject({
        code: 'invalid-arguments',
        path: '/spec/marks/0/innerRadiusRatio',
      })
    }

    expect(
      issueFrom(pieSource({}, {}, [{ category: 'Alpha', value: -1 }]))
        .issues[0],
    ).toMatchObject({
      code: 'call-error',
      path: '/spec/marks/0',
      callId: 'tanstack.mark.pie',
    })
    expect(
      issueFrom(pieSource({}, {}, [{ category: false, value: 1 }])).issues[0],
    ).toMatchObject({
      code: 'call-error',
      path: '/spec/marks/0',
      callId: 'tanstack.mark.pie',
    })

    const missingCategory = JSON.parse(pieSource())
    delete missingCategory.spec.marks[0].category
    expect(issueFrom(JSON.stringify(missingCategory)).issues[0]).toMatchObject({
      code: 'invalid-arguments',
      path: '/spec/marks/0/category',
      callId: 'tanstack.mark.pie',
    })
  })

  it('rejects obsolete and open-ended grammar', () => {
    const obsolete = JSON.parse(lineSource({ data: { rows } }))
    obsolete.kind = 'chart-document'
    expect(issueFrom(JSON.stringify(obsolete)).issues[0]).toMatchObject({
      code: 'invalid-envelope',
      path: '/kind',
    })

    const argsWrapper = JSON.parse(lineSource({ data: { rows } }))
    argsWrapper.spec.marks[0] = {
      $call: 'tanstack.mark.line-y',
      args: { data: { $data: 'rows' }, x: 'category', y: 'value' },
    }
    expect(issueFrom(JSON.stringify(argsWrapper)).issues[0]).toMatchObject({
      code: 'invalid-arguments',
      path: '/spec/marks/0/args',
      callId: 'tanstack.mark.line-y',
    })

    const dataInConfig = JSON.parse(lineSource({ data: { rows } }))
    dataInConfig.spec.marks[0].x = { $data: 'rows' }
    expect(issueFrom(JSON.stringify(dataInConfig)).issues[0]).toMatchObject({
      code: 'invalid-node',
      path: '/spec/marks/0/x',
    })

    const inlineRows = JSON.parse(lineSource())
    inlineRows.spec.marks[0].data = rows
    expect(issueFrom(JSON.stringify(inlineRows)).issues[0]).toMatchObject({
      code: 'invalid-node',
      path: '/spec/marks/0/data',
    })
  })

  it('reports closed envelope, spec, placement, data, and call errors', () => {
    expect(issueFrom('{').issues[0]).toMatchObject({ code: 'invalid-json' })
    expect(
      issueFrom(`{"chartsVersion":"${chartJsonVersion}","spec":1e400}`)
        .issues[0],
    ).toMatchObject({ code: 'invalid-json', path: '/spec' })
    expect(
      issueFrom(JSON.stringify({ chartsVersion: chartJsonVersion })).issues,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'invalid-envelope', path: '/spec' }),
      ]),
    )

    const empty = JSON.parse(lineSource())
    empty.spec.marks = []
    expect(issueFrom(JSON.stringify(empty)).issues[0]).toMatchObject({
      code: 'invalid-arguments',
      path: '/spec/marks',
    })

    const noAxis = JSON.parse(lineSource())
    delete noAxis.spec.y
    expect(issueFrom(JSON.stringify(noAxis)).issues[0]).toMatchObject({
      code: 'invalid-arguments',
      path: '/spec/y',
    })

    const badPlacement = JSON.parse(lineSource({ data: { rows } }))
    badPlacement.spec.x.scale = { $call: 'tanstack.legend.color' }
    expect(issueFrom(JSON.stringify(badPlacement)).issues[0]).toMatchObject({
      code: 'invalid-result',
      path: '/spec/x/scale',
      callId: 'tanstack.legend.color',
    })

    const unknown = JSON.parse(lineSource({ data: { rows } }))
    unknown.spec.marks[0].$call = 'missing.mark'
    expect(issueFrom(JSON.stringify(unknown)).issues[0]).toMatchObject({
      code: 'unknown-call',
      callId: 'missing.mark',
    })

    const malformed = JSON.parse(lineSource({ data: { rows } }))
    malformed.spec.marks[0].$call = 42
    expect(issueFrom(JSON.stringify(malformed)).issues[0]).toMatchObject({
      code: 'invalid-node',
      path: '/spec/marks/0/$call',
    })

    const nonMark = JSON.parse(lineSource({ data: { rows } }))
    nonMark.spec.marks[0] = { $call: 'tanstack.scale.linear' }
    expect(issueFrom(JSON.stringify(nonMark)).issues[0]).toMatchObject({
      code: 'invalid-result',
      path: '/spec/marks/0',
      callId: 'tanstack.scale.linear',
    })

    expect(
      issueFrom(lineSource({ data: { rows: { category: 'A' } } })).issues[0],
    ).toMatchObject({ code: 'invalid-data', path: '/data/rows' })
    expect(issueFrom(lineSource()).issues[0]).toMatchObject({
      code: 'missing-data',
      path: '/spec/marks/0/data',
    })
  })

  it('supports backward compatibility by default and exact matching on demand', () => {
    const withBuild = JSON.parse(lineSource({ data: { rows } }))
    withBuild.chartsVersion = `${chartJsonVersion}+producer`
    expect(() => chartFromJson(JSON.stringify(withBuild))).not.toThrow()
    expect(() =>
      chartFromJson(JSON.stringify(withBuild), { exactVersion: true }),
    ).toThrowError(ChartJsonError)

    const future = JSON.parse(lineSource({ data: { rows } }))
    future.chartsVersion = '999.0.0'
    expect(issueFrom(JSON.stringify(future)).issues[0]).toMatchObject({
      code: 'incompatible-version',
      path: '/chartsVersion',
    })
  })

  it('applies the supported SemVer range across reader releases', () => {
    const validate = (author: string, reader: string) =>
      validateChartJsonVersion(author, false, reader)

    expect(validate('0.16.0', '0.17.3')).toEqual([])
    expect(validate('0.17.2', '0.17.3')).toEqual([])
    expect(validate('0.17.3-beta.1', '0.17.3')).toEqual([])
    expect(validate('0.14.9', '0.17.3')[0]).toMatchObject({
      code: 'incompatible-version',
      path: '/chartsVersion',
    })
    expect(validate('0.17.4', '0.17.3')[0]).toMatchObject({
      code: 'incompatible-version',
      path: '/chartsVersion',
    })
    expect(validate('0.17.0', '1.2.0')[0]).toMatchObject({
      code: 'incompatible-version',
      path: '/chartsVersion',
    })
  })
})

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
