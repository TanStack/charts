import type {
  ChartMotionContext,
  ChartMotionDefinition,
  ChartMotionTiming,
  ChartMotionTransition,
} from './types'

export function resolveCompositeMotion<TDatum>(
  definition: ChartMotionDefinition<TDatum> | undefined,
  context: ChartMotionContext<TDatum>,
): ChartMotionTiming | undefined {
  return typeof definition === 'function' ? definition(context) : definition
}

export function resolveCompositeChildMotion<TDatum>(
  parent: ChartMotionDefinition<TDatum> | undefined,
  children: ReadonlyMap<string, ChartMotionDefinition<any>>,
  context: ChartMotionContext<TDatum>,
): ChartMotionTiming | undefined {
  let childId: string | undefined
  for (const candidate of children.keys()) {
    if (
      (context.markId === candidate ||
        context.markId?.startsWith(`${candidate}:`)) &&
      (!childId || candidate.length > childId.length)
    ) {
      childId = candidate
    }
  }
  return mergeCompositeMotion(
    resolveCompositeMotion(parent, context),
    childId
      ? resolveCompositeMotion(children.get(childId), context)
      : undefined,
  )
}

export function mergeCompositeMotion(
  parent: ChartMotionTiming | undefined,
  child: ChartMotionTiming | undefined,
): ChartMotionTiming | undefined {
  if (!parent) return child
  if (!child) return parent
  const path = child.path ?? parent.path
  return {
    delay: child.delay ?? parent.delay,
    ...(path === undefined ? {} : { path }),
    transition: mergeCompositeTransition(parent.transition, child.transition),
  }
}

function mergeCompositeTransition(
  parent: ChartMotionTransition | undefined,
  child: ChartMotionTransition | undefined,
): ChartMotionTransition | undefined {
  if (!parent) return child
  if (!child) return parent
  return parent.type === child.type ? { ...parent, ...child } : child
}
