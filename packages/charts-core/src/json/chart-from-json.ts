import { ChartJsonError } from './error'
import {
  chartJsonOperationsById,
  type ChartJsonArgumentRule,
  type ChartJsonOperation,
  type ChartJsonOperationResult,
} from './operation-contracts'
import type {
  ChartFromJsonOptions,
  ChartJson,
  ChartJsonDefinition,
  ChartJsonIssue,
  ChartJsonMetadata,
} from './types'
import { validateChartJsonVersion } from './version-compatibility'
import { chartJsonSchemaUrl } from './version'

const envelopeFields = new Set([
  '$schema',
  'chartsVersion',
  'spec',
  'data',
  'metadata',
])
const specFields = new Set([
  'marks',
  'x',
  'y',
  'guides',
  'color',
  'clip',
  'margin',
])

export function chartFromJson(
  source: string,
  options: ChartFromJsonOptions = {},
): ChartJsonDefinition {
  const normalizedOptions = readOptions(options)
  const envelope = readEnvelope(source, normalizedOptions.exactVersion)
  const data = mergeData(envelope.data, normalizedOptions.data)
  const spec = resolveSpec(envelope.spec, data)
  const metadata = envelope.metadata
    ? Object.freeze({ ...envelope.metadata })
    : undefined
  return {
    ...spec,
    ...(metadata ? { metadata } : {}),
  }
}

function readOptions(options: ChartFromJsonOptions): ChartFromJsonOptions {
  if (!isPlainObject(options))
    fail('invalid-envelope', '/options', 'options must be a plain object')
  exactProperties(
    options as Readonly<Record<string, unknown>>,
    ['data', 'exactVersion'],
    '/options',
    'invalid-envelope',
  )
  if (options.data !== undefined && !isPlainObject(options.data))
    fail('invalid-data', '/options/data', 'data must be a plain object')
  if (
    options.exactVersion !== undefined &&
    typeof options.exactVersion !== 'boolean'
  )
    fail(
      'invalid-envelope',
      '/options/exactVersion',
      'exactVersion must be a boolean',
    )
  return options
}

function readEnvelope(source: string, exactVersion = false): ChartJson {
  if (typeof source !== 'string')
    fail('invalid-json', '/', 'source must be JSON text')
  let value: unknown
  try {
    value = JSON.parse(source)
  } catch (error) {
    fail(
      'invalid-json',
      '/',
      `invalid JSON${error instanceof Error ? `: ${error.message}` : ''}`,
    )
  }
  requireFiniteJsonNumbers(value)
  if (!isPlainObject(value))
    fail('invalid-envelope', '/', 'expected a Chart JSON object')
  const issues: ChartJsonIssue[] = []
  for (const key of Object.keys(value)) {
    if (!envelopeFields.has(key))
      issues.push(
        issue(
          'invalid-envelope',
          pointer('', key),
          `unknown property ${JSON.stringify(key)}`,
        ),
      )
  }
  issues.push(...validateChartJsonVersion(value.chartsVersion, exactVersion))
  if (!isPlainObject(value.spec))
    issues.push(
      issue('invalid-envelope', '/spec', 'spec must be a plain object'),
    )
  if (value.data !== undefined && !isPlainObject(value.data))
    issues.push(
      issue('invalid-envelope', '/data', 'data must be a plain object'),
    )
  if (isPlainObject(value.data)) {
    for (const [key, rows] of Object.entries(value.data)) {
      if (!key || key.startsWith('$'))
        issues.push(
          issue('invalid-data', pointer('/data', key), 'invalid data name'),
        )
      if (!Array.isArray(rows))
        issues.push(
          issue(
            'invalid-data',
            pointer('/data', key),
            'bundled data must be an array of JSON rows',
          ),
        )
    }
  }
  const metadata = readMetadata(value.metadata, issues)
  if (value.$schema !== undefined) {
    if (typeof value.$schema !== 'string')
      issues.push(
        issue('invalid-envelope', '/$schema', '$schema must be a string'),
      )
    else if (typeof value.chartsVersion === 'string') {
      const expected = chartJsonSchemaUrl(value.chartsVersion)
      if (value.$schema !== expected)
        issues.push(
          issue(
            'invalid-envelope',
            '/$schema',
            `expected ${JSON.stringify(expected)}`,
          ),
        )
    }
  }
  if (issues.length) throw new ChartJsonError(issues)
  return {
    ...(typeof value.$schema === 'string' ? { $schema: value.$schema } : {}),
    chartsVersion: value.chartsVersion as string,
    spec: value.spec as Record<string, unknown>,
    ...(isPlainObject(value.data)
      ? { data: value.data as NonNullable<ChartJson['data']> }
      : {}),
    ...(metadata ? { metadata } : {}),
  }
}

function readMetadata(
  value: unknown,
  issues: ChartJsonIssue[],
): ChartJsonMetadata | undefined {
  if (value === undefined) return undefined
  if (!isPlainObject(value)) {
    issues.push(
      issue('invalid-envelope', '/metadata', 'metadata must be a plain object'),
    )
    return undefined
  }
  for (const key of Object.keys(value)) {
    if (key !== 'title' && key !== 'description')
      issues.push(
        issue(
          'invalid-envelope',
          pointer('/metadata', key),
          `unknown property ${JSON.stringify(key)}`,
        ),
      )
  }
  for (const key of ['title', 'description'] as const) {
    if (value[key] !== undefined && typeof value[key] !== 'string')
      issues.push(
        issue(
          'invalid-envelope',
          pointer('/metadata', key),
          `${key} must be a string`,
        ),
      )
  }
  return {
    ...(typeof value.title === 'string' ? { title: value.title } : {}),
    ...(typeof value.description === 'string'
      ? { description: value.description }
      : {}),
  }
}

function mergeData(
  bundled: Readonly<Record<string, readonly unknown[]>> | undefined,
  supplied: Readonly<Record<string, Iterable<unknown>>> | undefined,
): Readonly<Record<string, unknown>> {
  const output: Record<string, unknown> = Object.create(null)
  for (const [key, value] of Object.entries(bundled ?? {})) {
    if (!key || key.startsWith('$'))
      fail('invalid-data', pointer('/data', key), 'invalid data name')
    output[key] = value
  }
  for (const [key, value] of Object.entries(supplied ?? {})) {
    const path = pointer('/options/data', key)
    if (!key || key.startsWith('$'))
      fail('invalid-data', path, 'invalid data name')
    if (!matchesArgument(value, 'data'))
      fail('invalid-data', path, 'data must be iterable')
    try {
      output[key] = Array.isArray(value) ? value : Array.from(value)
    } catch (error) {
      throw new ChartJsonError(
        [issue('invalid-data', path, 'data iterable could not be read')],
        { cause: error },
      )
    }
  }
  return Object.freeze(output)
}

function resolveSpec(
  source: Readonly<Record<string, unknown>>,
  data: Readonly<Record<string, unknown>>,
): ChartJsonDefinition {
  for (const key of Object.keys(source)) {
    if (!specFields.has(key))
      fail(
        'invalid-arguments',
        pointer('/spec', key),
        `unknown property ${JSON.stringify(key)}`,
      )
  }
  if (!Array.isArray(source.marks))
    fail('invalid-arguments', '/spec/marks', 'marks must be an array')
  if (source.marks.length === 0)
    fail('invalid-arguments', '/spec/marks', 'marks must not be empty')
  const markCalls = source.marks.map((mark, index) =>
    readCallOperation(mark, pointer('/spec/marks', index), 'mark', undefined),
  )
  const coordinates = new Set(
    markCalls.map(({ id, operation }, index) => {
      if (!operation.coordinate)
        fail(
          'invalid-result',
          pointer('/spec/marks', index),
          'mark has no coordinate kind',
          id,
        )
      return operation.coordinate
    }),
  )
  if (coordinates.size !== 1)
    fail(
      'invalid-arguments',
      '/spec/marks',
      'Cartesian and circular marks cannot be mixed',
    )
  const circular = coordinates.has('circular')
  if (circular && source.marks.length !== 1)
    fail(
      'invalid-arguments',
      '/spec/marks',
      'a circular chart must contain exactly one mark',
    )
  if (circular) {
    for (const key of ['x', 'y', 'guides'] as const) {
      if (source[key] !== undefined)
        fail(
          'invalid-arguments',
          pointer('/spec', key),
          `${key} is not allowed in a circular chart`,
        )
    }
  } else {
    if (source.x === undefined)
      fail('invalid-arguments', '/spec/x', 'x axis is required')
    if (source.y === undefined)
      fail('invalid-arguments', '/spec/y', 'y axis is required')
  }
  const marks = source.marks.map((mark, index) =>
    resolveCall(mark, pointer('/spec/marks', index), data, 'mark', undefined),
  ) as ChartJsonDefinition['marks']
  const output: Record<string, unknown> & Pick<ChartJsonDefinition, 'marks'> = {
    marks,
  }
  if (!circular) {
    output.x = resolveAxis(source.x, '/spec/x', data)
    output.y = resolveAxis(source.y, '/spec/y', data)
  }
  if (source.guides !== undefined)
    output.guides = requireBoolean(source.guides, '/spec/guides')
  if (source.color !== undefined)
    output.color = resolveColor(source.color, '/spec/color', data)
  if (source.clip !== undefined)
    output.clip = requireBoolean(source.clip, '/spec/clip')
  if (source.margin !== undefined)
    output.margin = resolveMargin(source.margin, '/spec/margin')
  return output as ChartJsonDefinition
}

function resolveAxis(
  source: unknown,
  path: string,
  data: Readonly<Record<string, unknown>>,
): unknown {
  if (!isPlainObject(source))
    fail('invalid-arguments', path, 'axis must be a plain object')
  exactProperties(
    source,
    ['scale', 'nice', 'reverse', 'grid', 'axis'],
    path,
    'invalid-arguments',
  )
  if (!Object.hasOwn(source, 'scale'))
    fail('invalid-arguments', `${path}/scale`, 'scale is required')
  const output: Record<string, unknown> = {
    scale: resolveCall(source.scale, `${path}/scale`, data, 'scale', undefined),
  }
  if (source.nice !== undefined)
    output.nice = requireBooleanOrNumber(source.nice, `${path}/nice`)
  if (source.reverse !== undefined)
    output.reverse = requireBoolean(source.reverse, `${path}/reverse`)
  if (source.grid !== undefined)
    output.grid = requireBoolean(source.grid, `${path}/grid`)
  if (source.axis !== undefined) {
    if (source.axis !== false)
      fail('invalid-arguments', `${path}/axis`, 'axis must be false')
    output.axis = source.axis
  }
  return output
}

function resolveColor(
  source: unknown,
  path: string,
  data: Readonly<Record<string, unknown>>,
): unknown {
  if (!isPlainObject(source))
    fail('invalid-arguments', path, 'color must be a plain object')
  exactProperties(
    source,
    ['domain', 'range', 'legend'],
    path,
    'invalid-arguments',
  )
  const output: Record<string, unknown> = {}
  if (source.domain !== undefined) {
    const value = source.domain
    if (
      !Array.isArray(value) ||
      value.some(
        (entry) =>
          typeof entry !== 'string' &&
          !(typeof entry === 'number' && Number.isFinite(entry)),
      )
    )
      fail(
        'invalid-arguments',
        `${path}/domain`,
        'domain must contain only strings or finite numbers',
      )
    output.domain = value
  }
  if (source.range !== undefined) {
    const value = source.range
    if (
      !Array.isArray(value) ||
      value.some((entry) => typeof entry !== 'string')
    )
      fail(
        'invalid-arguments',
        `${path}/range`,
        'range must be an array of strings',
      )
    output.range = value
  }
  if (source.legend !== undefined)
    output.legend = resolveCall(
      source.legend,
      `${path}/legend`,
      data,
      'legend',
      undefined,
    )
  return output
}

function resolveMargin(source: unknown, path: string): unknown {
  const resolved = source
  if (typeof resolved === 'number') {
    if (Number.isFinite(resolved)) return resolved
    fail('invalid-arguments', path, 'margin must be finite')
  }
  if (!isPlainObject(resolved))
    fail('invalid-arguments', path, 'margin must be a number or object')
  exactProperties(
    resolved,
    ['top', 'right', 'bottom', 'left'],
    path,
    'invalid-arguments',
  )
  const output: Record<string, unknown> = {}
  for (const key of ['top', 'right', 'bottom', 'left'] as const) {
    if (resolved[key] !== undefined)
      output[key] = resolveScalar(
        resolved[key],
        pointer(path, key),
        'finite-number',
      )
  }
  return output
}

function resolveCall(
  source: unknown,
  path: string,
  data: Readonly<Record<string, unknown>>,
  expected: ChartJsonOperationResult,
  allowedIds: readonly string[] | undefined,
): unknown {
  const { call, id, operation } = readCallOperation(
    source,
    path,
    expected,
    allowedIds,
  )
  const allowed = new Set(['$call', ...Object.keys(operation.fields)])
  for (const key of Object.keys(call)) {
    if (!allowed.has(key))
      fail(
        'invalid-arguments',
        pointer(path, key),
        `unknown argument ${JSON.stringify(key)}`,
        id,
      )
  }
  for (const field of operation.required ?? []) {
    if (!Object.hasOwn(call, field))
      fail(
        'invalid-arguments',
        pointer(path, field),
        'missing required argument',
        id,
      )
  }
  for (const group of operation.mutuallyExclusive ?? []) {
    if (group.every((field) => Object.hasOwn(call, field)))
      fail(
        'invalid-arguments',
        path,
        `${group.join(' and ')} are mutually exclusive`,
        id,
      )
  }
  const arguments_: Record<string, unknown> = {}
  for (const [name, rule] of Object.entries(operation.fields)) {
    if (Object.hasOwn(call, name))
      arguments_[name] = resolveArgument(
        call[name],
        pointer(path, name),
        data,
        rule,
      )
  }
  let result: unknown
  try {
    result = operation.create(arguments_)
  } catch (error) {
    if (error instanceof ChartJsonError) throw error
    throw new ChartJsonError(
      [
        issue(
          'call-error',
          path,
          `call ${JSON.stringify(id)} failed${error instanceof Error ? `: ${error.message}` : ''}`,
          id,
        ),
      ],
      { cause: error },
    )
  }
  if (!matchesResult(result, operation))
    fail(
      'invalid-result',
      path,
      `call ${JSON.stringify(id)} did not return ${operation.result}`,
      id,
    )
  return result
}

function readCallOperation(
  source: unknown,
  path: string,
  expected: ChartJsonOperationResult,
  allowedIds: readonly string[] | undefined,
): {
  call: Record<string, unknown>
  id: string
  operation: ChartJsonOperation
} {
  if (!isPlainObject(source) || !Object.hasOwn(source, '$call'))
    fail('invalid-node', path, 'expected a $call object')
  const id = source.$call
  if (typeof id !== 'string' || !id)
    fail('invalid-node', `${path}/$call`, '$call must be a nonempty string')
  const operation = chartJsonOperationsById.get(id)
  if (!operation)
    fail('unknown-call', path, `unknown call ${JSON.stringify(id)}`, id)
  if (operation.result !== expected || (allowedIds && !allowedIds.includes(id)))
    fail(
      'invalid-result',
      path,
      `call ${JSON.stringify(id)} cannot be used as ${expected}`,
      id,
    )
  return { call: source, id, operation }
}

function resolveArgument(
  source: unknown,
  path: string,
  data: Readonly<Record<string, unknown>>,
  rule: ChartJsonArgumentRule,
): unknown {
  let value: unknown
  if (rule === 'layout')
    value = resolveCall(source, path, data, 'layout', undefined)
  else if (rule === 'scale-band')
    value = resolveCall(source, path, data, 'scale', ['tanstack.scale.band'])
  else if (
    (rule === 'channel' || rule === 'numeric-channel') &&
    isPlainObject(source) &&
    Object.hasOwn(source, '$call')
  )
    value = resolveCall(source, path, data, 'accessor', undefined)
  else if (rule === 'data') value = resolveData(source, path, data)
  else {
    rejectReservedNode(source, path)
    value = source
  }
  if (!matchesArgument(value, rule))
    fail('invalid-arguments', path, `value does not satisfy ${rule}`)
  return value
}

function resolveData(
  source: unknown,
  path: string,
  data: Readonly<Record<string, unknown>>,
): unknown {
  if (!isPlainObject(source) || !Object.hasOwn(source, '$data'))
    fail('invalid-node', path, 'expected an exact $data object')
  exactProperties(source, ['$data'], path, 'invalid-node')
  if (typeof source.$data !== 'string' || !source.$data)
    fail('invalid-node', `${path}/$data`, '$data must be a nonempty string')
  if (!Object.hasOwn(data, source.$data))
    fail(
      'missing-data',
      path,
      `data ${JSON.stringify(source.$data)} is missing`,
    )
  return data[source.$data]
}

function resolveScalar(
  source: unknown,
  path: string,
  rule: 'boolean' | 'finite-number',
): unknown {
  if (!matchesArgument(source, rule))
    fail('invalid-arguments', path, `value does not satisfy ${rule}`)
  return source
}

function requireBooleanOrNumber(value: unknown, path: string): unknown {
  if (
    typeof value !== 'boolean' &&
    !(typeof value === 'number' && Number.isFinite(value))
  )
    fail('invalid-arguments', path, 'expected a boolean or finite number')
  return value
}

function requireBoolean(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean')
    fail('invalid-arguments', path, 'expected a boolean')
  return value
}

function rejectReservedNode(value: unknown, path: string): void {
  if (!isPlainObject(value)) return
  const reserved = Object.keys(value).find((key) => key.startsWith('$'))
  if (reserved) fail('invalid-node', path, `reserved node is not allowed here`)
}

function matchesArgument(value: unknown, rule: ChartJsonArgumentRule): boolean {
  try {
    switch (rule) {
      case 'boolean':
        return typeof value === 'boolean'
      case 'channel':
        return (
          (typeof value === 'string' && value.length > 0) ||
          typeof value === 'function'
        )
      case 'data': {
        if (
          value == null ||
          typeof value === 'string' ||
          typeof (value as { [Symbol.iterator]?: unknown })[Symbol.iterator] !==
            'function'
        )
          return false
        return true
      }
      case 'finite-number':
        return typeof value === 'number' && Number.isFinite(value)
      case 'layout':
        return isPlainObject(value) && value.type === 'group'
      case 'nonempty-string':
        return typeof value === 'string' && value.length > 0
      case 'nonnegative-number':
        return typeof value === 'number' && Number.isFinite(value) && value >= 0
      case 'numeric-channel':
        return (
          (typeof value === 'number' && Number.isFinite(value)) ||
          (typeof value === 'string' && value.length > 0) ||
          typeof value === 'function'
        )
      case 'opacity':
        return (
          typeof value === 'number' &&
          Number.isFinite(value) &&
          value >= 0 &&
          value <= 1
        )
      case 'path':
        return (
          (typeof value === 'string' &&
            value.length > 0 &&
            value.split('.').every(Boolean)) ||
          (Array.isArray(value) &&
            value.length > 0 &&
            value.every(
              (segment) => typeof segment === 'string' && segment.length > 0,
            ))
        )
      case 'placement':
        return value === 'top' || value === 'bottom'
      case 'ratio':
        return (
          typeof value === 'number' &&
          Number.isFinite(value) &&
          value >= 0 &&
          value < 1
        )
      case 'scale-band':
        return typeof value === 'function'
      case 'string':
        return typeof value === 'string'
      case 'text-anchor':
        return value === 'start' || value === 'middle' || value === 'end'
    }
  } catch {
    return false
  }
}

function matchesResult(value: unknown, operation: ChartJsonOperation): boolean {
  try {
    switch (operation.result) {
      case 'accessor':
      case 'scale':
        return typeof value === 'function'
      case 'mark':
        return isPlainObject(value) && typeof value.initialize === 'function'
      case 'layout':
      case 'legend':
        return isPlainObject(value)
    }
  } catch {
    return false
  }
}

function exactProperties(
  value: Readonly<Record<string, unknown>>,
  allowed: readonly string[],
  path: string,
  code: ChartJsonIssue['code'],
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key))
      fail(code, pointer(path, key), `unknown property ${JSON.stringify(key)}`)
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function requireFiniteJsonNumbers(root: unknown): void {
  const pending: { value: unknown; path: string }[] = [
    { value: root, path: '' },
  ]
  while (pending.length) {
    const current = pending.pop()!
    if (typeof current.value === 'number' && !Number.isFinite(current.value))
      fail('invalid-json', current.path || '/', 'numbers must be finite')
    if (Array.isArray(current.value)) {
      current.value.forEach((value, index) =>
        pending.push({ value, path: pointer(current.path, index) }),
      )
    } else if (isPlainObject(current.value)) {
      for (const [key, value] of Object.entries(current.value))
        pending.push({ value, path: pointer(current.path, key) })
    }
  }
}

function pointer(path: string, segment: string | number): string {
  const escaped = String(segment).replaceAll('~', '~0').replaceAll('/', '~1')
  return `${path}/${escaped}`
}

function issue(
  code: ChartJsonIssue['code'],
  path: string,
  detail: string,
  callId?: string,
): ChartJsonIssue {
  return {
    code,
    path,
    message: `${path}: ${detail}`,
    ...(callId ? { callId } : {}),
  }
}

function fail(
  code: ChartJsonIssue['code'],
  path: string,
  detail: string,
  callId?: string,
): never {
  throw new ChartJsonError([issue(code, path, detail, callId)])
}
