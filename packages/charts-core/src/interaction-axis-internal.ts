import { valueKey } from './scales'
import type { ChartValue, ResolvedScale } from './types'

export interface InteractionAxis<TValue extends ChartValue> {
  readonly scale: ResolvedScale
  readonly extent: readonly [number, number]
  readonly values?: readonly TValue[]
  readonly positions?: readonly number[]
  position: (value: TValue) => number
  /** Inverts a continuous scale without clamping to the interaction extent. */
  invert: (position: number) => TValue
  valueAt: (position: number) => TValue
  order: (first: TValue, second: TValue) => readonly [TValue, TValue]
  indexOf: (value: TValue) => number
  at: (index: number) => TValue
  step: (value: TValue, amount: number) => TValue
  clampPosition: (position: number) => number
  layoutKey: (value: TValue) => string
}

export interface InteractionAxisOptions<TValue extends ChartValue> {
  axis: 'x' | 'y'
  scale: ResolvedScale | undefined
  extent: readonly [number, number]
  sample: TValue
  values?: readonly TValue[]
}

/** Shared semantic-value/pixel conversion for scale-bound interactions. */
export function createInteractionAxis<TValue extends ChartValue>(
  options: InteractionAxisOptions<TValue>,
): InteractionAxis<TValue> {
  const { axis, scale, sample } = options
  if (!scale) throw new TypeError(`A ${axis}-axis interaction requires a scale`)
  assertValue(sample, `The ${axis}-axis interaction value`)

  const minimum = Math.min(...options.extent)
  const maximum = Math.max(...options.extent)
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum)) {
    throw new TypeError(`The ${axis}-axis interaction extent must be finite`)
  }
  const extent = [minimum, maximum] as const
  const values = options.values?.map(cloneValue)
  const keys = values?.map(valueKey)
  let positions: readonly number[] | undefined

  if (values) {
    if (!values.length) {
      throw new TypeError(
        `The ${axis}-axis interaction values must not be empty`,
      )
    }
    const expectedKind = valueKind(sample)
    const unique = new Set<string>()
    positions = values.map((value, index) => {
      assertValue(value, `The ${axis}-axis interaction value at index ${index}`)
      if (valueKind(value) !== expectedKind) {
        throw new TypeError(
          `The ${axis}-axis interaction values must use one value type`,
        )
      }
      const key = keys![index]!
      if (unique.has(key)) {
        throw new TypeError(
          `The ${axis}-axis interaction values must be unique`,
        )
      }
      unique.add(key)
      return mappedPosition(scale, value, axis)
    })
    assertMonotonePositions(positions, axis)
  } else {
    const kind = valueKind(sample)
    if (kind === 'string') {
      throw new TypeError(
        `A string ${axis}-axis interaction requires explicit values`,
      )
    }
    if (!scale.invert) {
      throw new TypeError(
        `A continuous ${axis}-axis interaction requires an invertible scale or explicit values`,
      )
    }
  }

  const clampPosition = (position: number) =>
    Math.max(minimum, Math.min(maximum, position))
  const indexOf = (value: TValue) => keys?.indexOf(valueKey(value)) ?? -1
  const at = (index: number) => {
    if (!values?.length) {
      throw new TypeError(
        `The ${axis}-axis interaction requires explicit values for indexed movement`,
      )
    }
    const bounded = Math.max(0, Math.min(values.length - 1, index))
    return cloneValue(values[bounded]!)
  }
  const invert = (position: number) => {
    if (values || !scale.invert) {
      throw new TypeError(
        `The ${axis}-axis interaction requires a continuous scale inversion`,
      )
    }
    if (!Number.isFinite(position)) {
      throw new TypeError(
        `The ${axis}-axis interaction position must be finite`,
      )
    }
    const value = scale.invert(position)
    assertValue(value, `The ${axis}-axis scale inversion`)
    if (valueKind(value) !== valueKind(sample)) {
      throw new TypeError(
        `The ${axis}-axis scale inversion returned a different value type`,
      )
    }
    return cloneValue(value as TValue)
  }

  return {
    scale,
    extent,
    ...(values ? { values } : {}),
    ...(positions ? { positions } : {}),
    position(value) {
      return mappedPosition(scale, value, axis)
    },
    invert,
    valueAt(position) {
      const bounded = clampPosition(position)
      if (values && positions) {
        let nearestIndex = 0
        let nearestDistance = Number.POSITIVE_INFINITY
        positions.forEach((candidate, index) => {
          const distance = Math.abs(candidate - bounded)
          if (distance < nearestDistance) {
            nearestIndex = index
            nearestDistance = distance
          }
        })
        return cloneValue(values[nearestIndex]!)
      }
      return invert(bounded)
    },
    order(first, second) {
      if (values) {
        const firstIndex = indexOf(first)
        const secondIndex = indexOf(second)
        if (firstIndex < 0 || secondIndex < 0) {
          throw new TypeError(
            `The ${axis}-axis interaction range must use an explicit value`,
          )
        }
        return firstIndex <= secondIndex
          ? [cloneValue(first), cloneValue(second)]
          : [cloneValue(second), cloneValue(first)]
      }
      return numericValue(first) <= numericValue(second)
        ? [cloneValue(first), cloneValue(second)]
        : [cloneValue(second), cloneValue(first)]
    },
    indexOf,
    at,
    step(value, amount) {
      const index = indexOf(value)
      if (index < 0) {
        throw new TypeError(
          `The ${axis}-axis interaction value is not in its explicit values`,
        )
      }
      return at(index + amount)
    },
    clampPosition,
    layoutKey: valueKey,
  }
}

function assertMonotonePositions(
  positions: readonly number[],
  axis: 'x' | 'y',
) {
  if (positions.length < 2) return
  const firstDelta = positions[1]! - positions[0]!
  if (firstDelta === 0) nonmonotone(axis)
  const direction = Math.sign(firstDelta)
  for (let index = 2; index < positions.length; index += 1) {
    const delta = positions[index]! - positions[index - 1]!
    if (!delta || Math.sign(delta) !== direction) nonmonotone(axis)
  }
}

function nonmonotone(axis: 'x' | 'y'): never {
  throw new TypeError(
    `The ${axis}-axis interaction values must map to strictly monotone positions`,
  )
}

function mappedPosition(
  scale: ResolvedScale,
  value: ChartValue,
  axis: 'x' | 'y',
) {
  const position = scale.map(value)
  if (!Number.isFinite(position)) {
    throw new TypeError(
      `The ${axis}-axis interaction value must map to a finite position`,
    )
  }
  return position
}

function valueKind(value: ChartValue) {
  return value instanceof Date ? 'date' : typeof value
}

function numericValue(value: ChartValue) {
  return value instanceof Date ? value.getTime() : Number(value)
}

function assertValue(
  value: unknown,
  label: string,
): asserts value is ChartValue {
  if (value instanceof Date) {
    if (Number.isFinite(value.getTime())) return
    throw new TypeError(`${label} must be a valid Date`)
  }
  if (typeof value === 'number') {
    if (Number.isFinite(value)) return
    throw new TypeError(`${label} must be finite`)
  }
  if (typeof value === 'string') return
  throw new TypeError(`${label} must be a chart value`)
}

function cloneValue<TValue extends ChartValue>(value: TValue): TValue {
  return (value instanceof Date ? new Date(value.getTime()) : value) as TValue
}
