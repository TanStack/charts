import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createChartScene } from '../scene'
import { chartFromJson } from './chart-from-json'
import { chartJsonSchema } from './schema'
import { chartJsonVersion } from './version'

const packageRoot = resolve(import.meta.dirname, '../..')
const operationIds = [
  'tanstack.accessor.iso-date',
  'tanstack.layout.group',
  'tanstack.legend.color',
  'tanstack.mark.area-y',
  'tanstack.mark.bar-x',
  'tanstack.mark.bar-y',
  'tanstack.mark.dot',
  'tanstack.mark.line-y',
  'tanstack.mark.pie',
  'tanstack.mark.rule-x',
  'tanstack.mark.rule-y',
  'tanstack.mark.text',
  'tanstack.scale.band',
  'tanstack.scale.linear',
  'tanstack.scale.point',
  'tanstack.scale.utc',
]

async function readJson(path: string) {
  return JSON.parse(await readFile(resolve(packageRoot, path), 'utf8'))
}

function declaredProperties(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(declaredProperties)
  if (!value || typeof value !== 'object') return []
  const record = value as Record<string, unknown>
  const properties =
    record.properties && typeof record.properties === 'object'
      ? Object.keys(record.properties)
      : []
  return [properties, ...Object.values(record).map(declaredProperties)].flat()
}

describe('published Chart JSON assets', () => {
  it('publishes one schema and one fixture from the runtime schema', async () => {
    const files = (
      await readdir(resolve(packageRoot, 'schemas'), { recursive: true })
    )
      .filter((path) => path.endsWith('.json'))
      .sort()
    const schema = await readJson('schemas/chart.json')

    expect(files).toEqual(['chart.json', 'example.json'])
    expect(schema).toEqual(chartJsonSchema)
    expect(schema.$id).toBe(
      `https://unpkg.com/@tanstack/charts@${chartJsonVersion}/schemas/chart.json`,
    )
    expect(schema.properties.$schema.const).toBe(schema.$id)
    expect(schema.properties.chartsVersion.const).toBe(chartJsonVersion)
    expect(schema.required).toEqual(['chartsVersion', 'spec'])
    expect(Object.keys(schema.properties).sort()).toEqual([
      '$schema',
      'chartsVersion',
      'data',
      'metadata',
      'spec',
    ])
  })

  it('is the complete operation reference', async () => {
    const schema = await readJson('schemas/chart.json')
    const operations = Object.entries(schema.$defs)
      .filter(([name]) => name.startsWith('operation:'))
      .map(([name, operation]) => ({
        id: name.slice('operation:'.length),
        operation: operation as any,
      }))
      .sort((left, right) => left.id.localeCompare(right.id))

    expect(operations.map(({ id }) => id)).toEqual(operationIds)
    for (const { id, operation } of operations) {
      expect(operation.description).toEqual(expect.any(String))
      expect(operation.description.length).toBeGreaterThan(0)
      expect(operation.properties.$call).toEqual({ const: id })
      expect(operation.required).toEqual(
        id === 'tanstack.mark.pie'
          ? ['$call', 'data', 'value', 'category']
          : id.startsWith('tanstack.mark.')
            ? ['$call', 'data']
            : ['$call'],
      )
      expect(operation.additionalProperties).toBe(false)
      if (id.startsWith('tanstack.mark.'))
        expect(operation.properties.data).toEqual({
          $ref: '#/$defs/argument:data',
        })
      for (const [name, contract] of Object.entries(operation.properties)) {
        const usesData = JSON.stringify(contract).includes(
          '#/$defs/argument:data',
        )
        expect(usesData).toBe(
          id.startsWith('tanstack.mark.') && name === 'data',
        )
      }
    }
    expect(schema.$defs['argument:data']).toEqual({ $ref: '#/$defs/data' })
    expect(schema.$defs['argument:ratio']).toEqual({
      type: 'number',
      minimum: 0,
      exclusiveMaximum: 1,
    })
    expect(schema.$defs['argument:text-anchor']).toEqual({
      enum: ['start', 'middle', 'end'],
    })
    expect(schema.$defs).not.toHaveProperty('result:mark')
    expect(
      Object.keys(
        schema.$defs['operation:tanstack.mark.pie'].properties,
      ).sort(),
    ).toEqual(['$call', 'category', 'data', 'id', 'innerRadiusRatio', 'value'])
    expect(
      Object.keys(
        schema.$defs['operation:tanstack.mark.text'].properties,
      ).sort(),
    ).toEqual([
      '$call',
      'anchor',
      'color',
      'data',
      'dx',
      'dy',
      'fill',
      'fontSize',
      'fontWeight',
      'id',
      'key',
      'rotate',
      'text',
      'x',
      'y',
      'z',
    ])
    const properties = declaredProperties(schema)
    expect(properties).not.toContain('$context')
    expect(properties).not.toContain('$ref')
    expect(properties).not.toContain('args')
  })

  it('keeps the fixed chart spec closed', async () => {
    const schema = await readJson('schemas/chart.json')
    const spec = schema.properties.spec
    const [cartesian, circular] = spec.oneOf
    const axis = cartesian.properties.x

    expect(spec.oneOf).toHaveLength(2)
    expect(cartesian.title).toBe('Cartesian chart')
    expect(cartesian.additionalProperties).toBe(false)
    expect(cartesian.properties.marks.minItems).toBe(1)
    expect(cartesian.properties.marks.items).toEqual({
      $ref: '#/$defs/result:mark:cartesian',
    })
    expect(cartesian.required).toEqual(['marks', 'x', 'y'])
    expect(Object.keys(cartesian.properties).sort()).toEqual([
      'clip',
      'color',
      'guides',
      'margin',
      'marks',
      'x',
      'y',
    ])
    expect(circular.title).toBe('Circular chart')
    expect(circular.additionalProperties).toBe(false)
    expect(circular.properties.marks).toMatchObject({
      minItems: 1,
      maxItems: 1,
      items: { $ref: '#/$defs/result:mark:circular' },
    })
    expect(circular.required).toEqual(['marks'])
    expect(Object.keys(circular.properties).sort()).toEqual([
      'clip',
      'color',
      'margin',
      'marks',
    ])
    expect(Object.keys(axis.properties).sort()).toEqual([
      'axis',
      'grid',
      'nice',
      'reverse',
      'scale',
    ])
    expect(Object.keys(cartesian.properties.color.properties).sort()).toEqual([
      'domain',
      'legend',
      'range',
    ])
    expect(circular.properties.color).toEqual(cartesian.properties.color)
    expect(schema.properties.data.additionalProperties.type).toBe('array')
  })

  it('keeps the bundled fixture executable', async () => {
    const source = await readFile(
      resolve(packageRoot, 'schemas/example.json'),
      'utf8',
    )
    const authored = JSON.parse(source)
    const definition = chartFromJson(source)

    expect(authored.$schema).toBe((chartJsonSchema as any).$id)
    expect(authored.chartsVersion).toBe(chartJsonVersion)
    expect(
      createChartScene(definition, { width: 400, height: 200 }).nodes.length,
    ).toBeGreaterThan(0)
  })
})
