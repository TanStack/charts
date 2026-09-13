import {
  reconcileSvgMarkup,
  reconcileSvgFragment,
  type SvgReconcileHooks,
} from './reconcile-internal'
import type { ChartAnimationOptions } from './types'

interface AttributeTween {
  element: Element
  name: string
  interpolate: (progress: number) => string
  target: string | null
  removeOnFinish?: boolean
}

const interpolatedAttributes = new Set([
  'cx',
  'cy',
  'd',
  'fill-opacity',
  'font-size',
  'font-weight',
  'fx',
  'fy',
  'height',
  'opacity',
  'r',
  'rx',
  'stroke-opacity',
  'stroke-width',
  'transform',
  'width',
  'x',
  'x1',
  'x2',
  'y',
  'y1',
  'y2',
])

export function reconcileChartSvg(
  container: HTMLElement,
  markup: string,
  animation?: ChartAnimationOptions,
): () => void {
  const tweens: AttributeTween[] = []
  reconcileSvgMarkup(
    container,
    markup,
    animation ? tweenHooks(tweens) : undefined,
  )

  return animation ? runTweens(container, tweens, animation) : () => {}
}

/** Reconciles one keyed SVG subtree without reparsing or walking the chart. */
export function reconcileChartSvgFragment(
  currentRoot: SVGElement,
  markup: string,
  animation?: ChartAnimationOptions,
): () => void {
  const tweens: AttributeTween[] = []
  reconcileSvgFragment(
    currentRoot,
    markup,
    animation ? tweenHooks(tweens) : undefined,
  )

  return animation ? runTweens(currentRoot, tweens, animation) : () => {}
}

function tweenHooks(tweens: AttributeTween[]): SvgReconcileHooks {
  return {
    update: (current, next) => syncAttributes(current, next, tweens),
    enter: (current, next) => addEnterTween(current, next, tweens),
    exit: (current) => addExitTween(current, tweens),
  }
}

function syncAttributes(
  current: Element,
  next: Element,
  tweens: AttributeTween[] | undefined,
) {
  const nextNames = new Set(next.getAttributeNames())
  for (const name of current.getAttributeNames()) {
    if (!nextNames.has(name)) current.removeAttribute(name)
  }

  for (const name of nextNames) {
    const target = next.getAttribute(name)
    const previous = current.getAttribute(name)
    if (target === previous) continue
    const interpolate =
      tweens &&
      previous !== null &&
      target !== null &&
      interpolatedAttributes.has(name)
        ? interpolateAttribute(name, previous, target)
        : undefined
    if (interpolate && tweens) {
      tweens.push({ element: current, name, interpolate, target })
    } else if (target !== null) {
      current.setAttribute(name, target)
    }
  }
}

function addEnterTween(
  current: Element,
  next: Element,
  tweens: AttributeTween[] | undefined,
) {
  if (!tweens) return
  const target = next.getAttribute('opacity')
  const targetValue = target ?? '1'
  current.setAttribute('opacity', '0')
  tweens.push({
    element: current,
    name: 'opacity',
    interpolate: (progress) =>
      String(Number(targetValue) * Math.max(0, Math.min(1, progress))),
    target,
  })
}

function addExitTween(current: Element, tweens: AttributeTween[]) {
  const opacity = Number(current.getAttribute('opacity') ?? 1)
  const start = Number.isFinite(opacity) ? opacity : 1
  tweens.push({
    element: current,
    name: 'opacity',
    interpolate: (progress) => String(start * (1 - progress)),
    target: '0',
    removeOnFinish: true,
  })
}

function runTweens(
  container: Element,
  tweens: readonly AttributeTween[],
  options: ChartAnimationOptions,
): () => void {
  if (!tweens.length) return () => {}
  const view = container.ownerDocument.defaultView
  const requestFrame = view?.requestAnimationFrame?.bind(view)
  const cancelFrame = view?.cancelAnimationFrame?.bind(view)
  const duration = Math.max(0, options.duration ?? 240)
  if (!requestFrame || !cancelFrame || duration === 0) {
    finishTweens(tweens)
    return () => {}
  }

  let frame = 0
  let cancelled = false
  let start: number | undefined
  const ease = easing(options.easing ?? 'ease-out')
  const tick = (time: number) => {
    if (cancelled) return
    start ??= time
    const progress = Math.min(1, (time - start) / duration)
    const eased = ease(progress)
    for (const tween of tweens) {
      tween.element.setAttribute(tween.name, tween.interpolate(eased))
    }
    if (progress < 1) frame = requestFrame(tick)
    else finishTweens(tweens)
  }
  frame = requestFrame(tick)

  return () => {
    cancelled = true
    cancelFrame(frame)
  }
}

function finishTweens(tweens: readonly AttributeTween[]) {
  for (const tween of tweens) {
    if (tween.removeOnFinish) {
      tween.element.remove()
      continue
    }
    if (tween.target === null) tween.element.removeAttribute(tween.name)
    else tween.element.setAttribute(tween.name, tween.target)
  }
}

function interpolateAttribute(
  name: string,
  previous: string,
  next: string,
): ((progress: number) => string) | undefined {
  const path = name === 'd'
  const previousNumbers = extractNumbers(previous, path)
  const nextNumbers = extractNumbers(next, path)
  if (
    previousNumbers.skeleton !== nextNumbers.skeleton ||
    previousNumbers.values.length !== nextNumbers.values.length ||
    !previousNumbers.values.length
  ) {
    return undefined
  }

  const template = nextNumbers.skeleton
  return (progress) => {
    let index = 0
    return template.replaceAll(/[#!]/g, (placeholder) => {
      const start = previousNumbers.values[index]
      const end = nextNumbers.values[index]
      index += 1
      return formatNumber(
        placeholder === '!' ? end : start + (end - start) * progress,
      )
    })
  }
}

function extractNumbers(value: string, path = false) {
  const values: number[] = []
  let skeleton = ''
  let command = ''
  let argument = 0
  let index = 0

  while (index < value.length) {
    const rest = value.slice(index)
    const arcPosition = argument % 7
    const arcFlag =
      path && /a/i.test(command) && arcPosition > 2 && arcPosition < 5
    const match = arcFlag
      ? /^[01]/u.exec(rest)
      : /^-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/iu.exec(rest)

    if (match) {
      values.push(Number(match[0]))
      skeleton += arcFlag ? '!' : '#'
      argument += 1
      index += match[0].length
      continue
    }

    const character = value[index]!
    skeleton += character
    if (path && /[a-z]/i.test(character)) {
      command = character
      argument = 0
    }
    index += 1
  }

  return { skeleton, values }
}

function easing(name: NonNullable<ChartAnimationOptions['easing']>) {
  if (typeof name === 'function') return name
  switch (name) {
    case 'linear':
      return (value: number) => value
    case 'ease-in':
      return (value: number) => value * value
    case 'ease-in-out':
      return (value: number) =>
        value < 0.5 ? 2 * value * value : 1 - Math.pow(-2 * value + 2, 2) / 2
    case 'ease':
    case 'ease-out':
      return (value: number) => 1 - Math.pow(1 - value, 3)
  }
}

function formatNumber(value: number) {
  return String(Math.round(value * 1_000) / 1_000)
}
