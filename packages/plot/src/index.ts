import { plot, type PlotOptions } from '@observablehq/plot'
import type {
  ChartRenderContext,
  ChartRenderer,
  ChartRenderReason,
} from '@plot-poc/host-core'

export type PlotOptionsDefinition<TInput, TValue = unknown> = (
  context: ChartRenderContext<TInput>,
) => PlotOptions

export interface PlotDefinitionContext<
  TInput,
  TPrepared,
> extends ChartRenderContext<TInput> {
  input: TInput
  prepared: TPrepared
}

export interface PlotTransitionContext<TInput, TPrepared> {
  previous: Element
  next: Element
  previousContext: PlotDefinitionContext<TInput, TPrepared>
  nextContext: PlotDefinitionContext<TInput, TPrepared>
  reason: ChartRenderReason
  signal: AbortSignal
}

export type PlotTransition<TInput, TPrepared> = (
  context: PlotTransitionContext<TInput, TPrepared>,
) => void | (() => void)

export interface PlotDefinition<TInput, TValue = unknown, TPrepared = TInput> {
  inputEqual?: (previous: TInput, next: TInput) => boolean
  prepare?: (input: TInput) => TPrepared
  prepareEqual?: (previous: TInput, next: TInput) => boolean
  plot: (context: PlotDefinitionContext<TInput, TPrepared>) => PlotOptions
  transition?: PlotTransition<TInput, TPrepared>
}

export function definePlot<TInput, TValue = unknown>(
  definition: PlotOptionsDefinition<TInput, TValue>,
): PlotOptionsDefinition<TInput, TValue>
export function definePlot<TInput, TValue = unknown, TPrepared = TInput>(
  definition: PlotDefinition<TInput, TValue, TPrepared>,
): PlotDefinition<TInput, TValue, TPrepared>
export function definePlot<TInput, TValue = unknown, TPrepared = TInput>(
  definition:
    | PlotOptionsDefinition<TInput, TValue>
    | PlotDefinition<TInput, TValue, TPrepared>,
):
  | PlotOptionsDefinition<TInput, TValue>
  | PlotDefinition<TInput, TValue, TPrepared> {
  return definition
}

export function createPlotRenderer<TInput, TValue = unknown>(
  definition: PlotOptionsDefinition<TInput, TValue>,
): ChartRenderer<TInput, TValue>
export function createPlotRenderer<
  TInput,
  TValue = unknown,
  TPrepared = TInput,
>(
  definition: PlotDefinition<TInput, TValue, TPrepared>,
): ChartRenderer<TInput, TValue>
export function createPlotRenderer<
  TInput,
  TValue = unknown,
  TPrepared = TInput,
>(
  definition:
    | PlotOptionsDefinition<TInput, TValue>
    | PlotDefinition<TInput, TValue, TPrepared>,
): ChartRenderer<TInput, TValue> {
  if (typeof definition !== 'function') {
    return createStatefulPlotRenderer(definition)
  }

  return (context) => {
    const options = definition(context)
    const element = renderPlot(options, context)

    return {
      element,
      getValue: () => element.value as TValue | undefined,
      subscribeValue(listener) {
        const handleInput = () => listener(element.value as TValue | undefined)
        element.addEventListener('input', handleInput)
        return () => element.removeEventListener('input', handleInput)
      },
    }
  }
}

export function shallowInputEqual<TInput>(
  previous: TInput,
  next: TInput,
): boolean {
  if (Object.is(previous, next)) return true
  if (!isPlainRecord(previous) || !isPlainRecord(next)) return false

  const previousKeys = Object.keys(previous)
  const nextKeys = Object.keys(next)
  if (previousKeys.length !== nextKeys.length) return false

  return previousKeys.every(
    (key) =>
      Object.prototype.hasOwnProperty.call(next, key) &&
      Object.is(previous[key], next[key]),
  )
}

function createStatefulPlotRenderer<TInput, TValue, TPrepared>(
  definition: PlotDefinition<TInput, TValue, TPrepared>,
): ChartRenderer<TInput, TValue> {
  const inputEqual = definition.inputEqual ?? shallowInputEqual

  const renderer: ChartRenderer<TInput, TValue> = (initialContext) => {
    const surface = initialContext.document.createElement('div')
    surface.className = 'ts-plot__surface'

    let currentContext = createDefinitionContext(
      definition,
      initialContext,
      undefined,
    )
    let currentPlot = renderPlot(
      definition.plot(currentContext),
      initialContext,
    )
    let transitionCleanup: (() => void) | undefined
    const listeners = new Set<(value: TValue | undefined) => void>()
    const handleInput = () => {
      const value = currentPlot.value as TValue | undefined
      for (const listener of listeners) listener(value)
    }

    currentPlot.addEventListener('input', handleInput)
    surface.append(currentPlot)

    const stopTransition = () => {
      transitionCleanup?.()
      transitionCleanup = undefined
    }

    return {
      element: surface,
      getValue: () => currentPlot.value as TValue | undefined,
      subscribeValue(listener) {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
      update(nextContext, update) {
        const nextDefinitionContext = createDefinitionContext(
          definition,
          nextContext,
          currentContext,
        )
        const nextPlot = renderPlot(
          definition.plot(nextDefinitionContext),
          nextContext,
        )
        const previousPlot = currentPlot
        const previousContext = currentContext

        stopTransition()
        previousPlot.removeEventListener('input', handleInput)
        surface.replaceChildren(nextPlot)
        currentPlot = nextPlot
        currentContext = nextDefinitionContext
        currentPlot.addEventListener('input', handleInput)

        if (!definition.transition) return

        const cleanup = definition.transition({
          previous: previousPlot,
          next: nextPlot,
          previousContext,
          nextContext: nextDefinitionContext,
          reason: update.reason,
          signal: nextContext.signal,
        })

        if (!cleanup) return

        let active = true
        const finish = () => {
          if (!active) return
          active = false
          nextContext.signal.removeEventListener('abort', finish)
          cleanup()
          if (transitionCleanup === finish) transitionCleanup = undefined
        }

        transitionCleanup = finish
        nextContext.signal.addEventListener('abort', finish, { once: true })
      },
      destroy() {
        stopTransition()
        currentPlot.removeEventListener('input', handleInput)
        listeners.clear()
      },
    }
  }

  Object.defineProperty(renderer, 'inputEqual', {
    configurable: false,
    enumerable: false,
    value: inputEqual,
    writable: false,
  })

  return renderer
}

function createDefinitionContext<TInput, TValue, TPrepared>(
  definition: PlotDefinition<TInput, TValue, TPrepared>,
  context: ChartRenderContext<TInput>,
  previous: PlotDefinitionContext<TInput, TPrepared> | undefined,
): PlotDefinitionContext<TInput, TPrepared> {
  const inputEqual = definition.inputEqual ?? shallowInputEqual
  const prepareEqual = definition.prepareEqual ?? inputEqual
  const prepared =
    previous && prepareEqual(previous.input, context.data)
      ? previous.prepared
      : definition.prepare
        ? definition.prepare(context.data)
        : (context.data as unknown as TPrepared)

  return {
    ...context,
    input: context.data,
    prepared,
  }
}

function renderPlot<TInput>(
  options: PlotOptions,
  context: ChartRenderContext<TInput>,
) {
  const style = resolvePlotStyle(options.style, context.theme.foreground)
  const element = plot({
    ...options,
    width: context.width,
    height: context.height,
    document: context.document,
    style,
  })

  element.classList.add('ts-plot__plot')
  element.style.overflow = 'visible'
  element.style.setProperty(
    '--plot-background',
    context.theme.tooltipBackground,
  )

  return element
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function resolvePlotStyle(
  style: PlotOptions['style'],
  foreground: string,
): PlotOptions['style'] {
  const defaults = {
    background: 'transparent',
    color: foreground,
    fontFamily: 'inherit',
    fontSize: 'inherit',
  }

  if (typeof style === 'string') {
    return `${Object.entries(defaults)
      .map(([property, value]) => `${toKebabCase(property)}:${value}`)
      .join(';')};${style}`
  }

  return {
    ...defaults,
    ...style,
  }
}

function toKebabCase(value: string): string {
  return value.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`)
}
