import { createChartScene, defaultChartTheme } from './scene'
import type {
  DynamicChartDefinition,
  ChartDefinition,
  ChartRuntime,
  ChartScene,
  ChartSize,
} from './types'

export function createChartRuntime<
  TDatum = unknown,
  TInput = undefined,
>(): ChartRuntime<TDatum, TInput> {
  let currentDefinition: ChartDefinition<TDatum, TInput, any> | undefined
  let previousInput: TInput | undefined
  let hasPreviousInput = false
  let prepared: unknown
  let hasPrepared = false
  let prepareController: AbortController | undefined

  return {
    render(definition, input, size, layout) {
      if (definition !== currentDefinition) {
        prepareController?.abort()
        currentDefinition = definition
        previousInput = undefined
        hasPreviousInput = false
        prepared = undefined
        hasPrepared = false
      }

      if (!isDynamicChartDefinition(definition)) {
        return createChartScene(definition, size, layout)
      }

      const inputEqual = definition.inputEqual ?? shallowInputEqual
      const prepareEqual = definition.prepareEqual ?? inputEqual
      if (
        !hasPrepared ||
        !hasPreviousInput ||
        !prepareEqual(previousInput as TInput, input)
      ) {
        prepareController?.abort()
        prepareController = new AbortController()
        prepared = definition.prepare
          ? definition.prepare(input, {
              signal: prepareController.signal,
            })
          : input
        hasPrepared = true
      }

      previousInput = input
      hasPreviousInput = true
      const spec = definition.chart({
        input,
        prepared,
        width: size.width,
        height: size.height,
        theme: defaultChartTheme,
      })

      return createChartScene(spec, size, layout) as ChartScene<TDatum>
    },
    destroy() {
      prepareController?.abort()
      currentDefinition = undefined
      previousInput = undefined
      hasPreviousInput = false
      prepared = undefined
      hasPrepared = false
    },
  }
}

export function chartInputsEqual<TDatum, TInput>(
  definition: ChartDefinition<TDatum, TInput, any>,
  previous: TInput,
  next: TInput,
): boolean {
  return isDynamicChartDefinition(definition)
    ? (definition.inputEqual ?? shallowInputEqual)(previous, next)
    : true
}

export function shallowInputEqual(previous: unknown, next: unknown): boolean {
  if (Object.is(previous, next)) return true
  if (!isPlainObject(previous) || !isPlainObject(next)) return false
  const previousKeys = Object.keys(previous)
  const nextKeys = Object.keys(next)
  if (previousKeys.length !== nextKeys.length) return false
  return previousKeys.every(
    (key) => Object.hasOwn(next, key) && Object.is(previous[key], next[key]),
  )
}

export function isDynamicChartDefinition<TInput, TPrepared, TDatum>(
  definition: ChartDefinition<TDatum, TInput, TPrepared>,
): definition is DynamicChartDefinition<TInput, TPrepared, TDatum> {
  return 'chart' in definition && typeof definition.chart === 'function'
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}
