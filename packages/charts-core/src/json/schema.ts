import {
  chartJsonOperations,
  type ChartJsonArgumentRule,
  type ChartJsonOperationResult,
} from './operation-contracts'
import type { ChartJsonSchema } from './types'
import { chartJsonSchemaUrl, chartJsonVersion } from './version'

type Schema = Record<string, unknown> | boolean

const operationDefinition = (id: string) => `operation:${id}`
const resultDefinition = (result: ChartJsonOperationResult) =>
  `result:${result}`
const coordinateMarkDefinition = (coordinate: 'cartesian' | 'circular') =>
  `result:mark:${coordinate}`
const argumentDefinition = (rule: ChartJsonArgumentRule) => `argument:${rule}`
const dataReference: Schema = { $ref: '#/$defs/data' }

const definitions: Record<string, Schema> = {
  json: {
    anyOf: [
      { type: 'null' },
      { type: 'boolean' },
      { type: 'number' },
      { type: 'string' },
      { type: 'array', items: { $ref: '#/$defs/json' } },
      { type: 'object', additionalProperties: { $ref: '#/$defs/json' } },
    ],
  },
  data: closedObject({ $data: { type: 'string', minLength: 1 } }),
}

for (const rule of new Set(
  chartJsonOperations.flatMap((operation) => Object.values(operation.fields)),
))
  definitions[argumentDefinition(rule)] = argumentSchema(rule)

for (const operation of chartJsonOperations) {
  const properties: Record<string, Schema> = {
    $call: { const: operation.id },
  }
  for (const [name, rule] of Object.entries(operation.fields))
    properties[name] = { $ref: `#/$defs/${argumentDefinition(rule)}` }
  const required = new Set(operation.required ?? [])
  const schema = closedObject(
    properties,
    Object.keys(properties).filter(
      (name) => name !== '$call' && !required.has(name),
    ),
  )
  schema.description = operation.summary
  if (operation.mutuallyExclusive?.length)
    Object.assign(schema, {
      allOf: operation.mutuallyExclusive.map((group) => ({
        not: { required: [...group] },
      })),
    })
  definitions[operationDefinition(operation.id)] = schema
}

for (const result of ['accessor', 'layout', 'legend', 'scale'] as const) {
  const operations = chartJsonOperations.filter(
    (operation) => operation.result === result,
  )
  definitions[resultDefinition(result)] = {
    oneOf: operations.map((operation) => ({
      $ref: `#/$defs/${operationDefinition(operation.id)}`,
    })),
  }
}

for (const coordinate of ['cartesian', 'circular'] as const) {
  const operations = chartJsonOperations.filter(
    (operation) =>
      operation.result === 'mark' && operation.coordinate === coordinate,
  )
  definitions[coordinateMarkDefinition(coordinate)] = {
    oneOf: operations.map((operation) => ({
      $ref: `#/$defs/${operationDefinition(operation.id)}`,
    })),
  }
}

const booleanOrNumber: Schema = anyOf({ type: 'boolean' }, { type: 'number' })
const scaleCall: Schema = {
  $ref: `#/$defs/${resultDefinition('scale')}`,
}

const axis: Schema = closedObject(
  {
    scale: scaleCall,
    nice: booleanOrNumber,
    reverse: { type: 'boolean' },
    grid: { type: 'boolean' },
    axis: { const: false },
  },
  ['nice', 'reverse', 'grid', 'axis'],
)

const margin: Schema = anyOf(
  { type: 'number' },
  closedObject(
    {
      top: { type: 'number' },
      right: { type: 'number' },
      bottom: { type: 'number' },
      left: { type: 'number' },
    },
    ['top', 'right', 'bottom', 'left'],
  ),
)

const color = closedObject(
  {
    domain: {
      type: 'array',
      items: anyOf({ type: 'string' }, { type: 'number' }),
    },
    range: { type: 'array', items: { type: 'string' } },
    legend: {
      $ref: `#/$defs/${resultDefinition('legend')}`,
    },
  },
  ['domain', 'range', 'legend'],
)

const cartesianSpec = closedObject(
  {
    marks: {
      type: 'array',
      minItems: 1,
      items: { $ref: `#/$defs/${coordinateMarkDefinition('cartesian')}` },
    },
    x: axis,
    y: axis,
    guides: { type: 'boolean' },
    color,
    clip: { type: 'boolean' },
    margin,
  },
  ['guides', 'color', 'clip', 'margin'],
)

const circularSpec = closedObject(
  {
    marks: {
      type: 'array',
      minItems: 1,
      maxItems: 1,
      items: { $ref: `#/$defs/${coordinateMarkDefinition('circular')}` },
    },
    color,
    clip: { type: 'boolean' },
    margin,
  },
  ['color', 'clip', 'margin'],
)

const spec: Schema = {
  oneOf: [
    {
      title: 'Cartesian chart',
      ...cartesianSpec,
    },
    {
      title: 'Circular chart',
      ...circularSpec,
    },
  ],
}

export const chartJsonSchema: ChartJsonSchema = Object.freeze({
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: chartJsonSchemaUrl(),
  title: 'TanStack Charts JSON',
  type: 'object',
  properties: {
    $schema: { const: chartJsonSchemaUrl() },
    chartsVersion: { const: chartJsonVersion },
    spec,
    data: {
      type: 'object',
      propertyNames: { minLength: 1, not: { pattern: '^\\$' } },
      additionalProperties: {
        type: 'array',
        items: { $ref: '#/$defs/json' },
      },
    },
    metadata: closedObject(
      { title: { type: 'string' }, description: { type: 'string' } },
      ['title', 'description'],
    ),
  },
  required: ['chartsVersion', 'spec'],
  additionalProperties: false,
  $defs: definitions,
})

function argumentSchema(rule: ChartJsonArgumentRule): Schema {
  switch (rule) {
    case 'boolean':
      return { type: 'boolean' }
    case 'channel':
      return anyOf(
        { type: 'string', minLength: 1 },
        { $ref: `#/$defs/${resultDefinition('accessor')}` },
      )
    case 'data':
      return dataReference
    case 'finite-number':
      return { type: 'number' }
    case 'layout':
      return { $ref: `#/$defs/${resultDefinition('layout')}` }
    case 'nonempty-string':
      return { type: 'string', minLength: 1 }
    case 'nonnegative-number':
      return { type: 'number', minimum: 0 }
    case 'numeric-channel':
      return anyOf(
        { type: 'number' },
        { type: 'string', minLength: 1 },
        { $ref: `#/$defs/${resultDefinition('accessor')}` },
      )
    case 'opacity':
      return { type: 'number', minimum: 0, maximum: 1 }
    case 'path':
      return anyOf(
        { type: 'string', minLength: 1, pattern: '^[^.]+(?:\\.[^.]+)*$' },
        {
          type: 'array',
          minItems: 1,
          items: { type: 'string', minLength: 1 },
        },
      )
    case 'placement':
      return { enum: ['top', 'bottom'] }
    case 'ratio':
      return { type: 'number', minimum: 0, exclusiveMaximum: 1 }
    case 'scale-band':
      return {
        $ref: `#/$defs/${operationDefinition('tanstack.scale.band')}`,
      }
    case 'string':
      return { type: 'string' }
    case 'text-anchor':
      return { enum: ['start', 'middle', 'end'] }
  }
}

function anyOf(...values: readonly Schema[]): Schema {
  const variants = values.flatMap((value) => {
    if (
      typeof value === 'object' &&
      value !== null &&
      Array.isArray((value as { anyOf?: unknown }).anyOf)
    )
      return (value as { anyOf: Schema[] }).anyOf
    return [value]
  })
  return { anyOf: variants }
}

function closedObject(
  properties: Readonly<Record<string, Schema>>,
  optional: readonly string[] = [],
): Record<string, unknown> {
  return {
    type: 'object',
    properties,
    required: Object.keys(properties).filter(
      (property) => !optional.includes(property),
    ),
    additionalProperties: false,
  }
}
