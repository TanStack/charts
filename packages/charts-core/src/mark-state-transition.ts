import type { ChartAnimationOptions, ChartMarkStateTransition } from './types'

export function resolveMarkStateTransition(
  transition: ChartMarkStateTransition | undefined,
  element: Element,
): ChartAnimationOptions | undefined {
  if (!transition || transition.type !== 'tween') return undefined
  if (
    (transition.respectReducedMotion ?? true) &&
    element.ownerDocument.defaultView?.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches
  ) {
    return undefined
  }
  const { type: _type, ...resolved } = transition
  return resolved
}
