import type {
  ChartMotionContext,
  ChartMotionDefinition,
  ChartMotionTiming,
  ChartMotionTransition,
} from './types'

type ResolvedCompositeMotion<TDatum> = false | ChartMotionTiming<TDatum>

export function resolveCompositeMotion<TDatum>(
  definition: ChartMotionDefinition<TDatum> | undefined,
  context: ChartMotionContext<TDatum>,
): ResolvedCompositeMotion<TDatum> | undefined {
  return typeof definition === 'function' ? definition(context) : definition
}

export function resolveCompositeChildMotion<TDatum>(
  parent: ChartMotionDefinition<TDatum> | undefined,
  children: ReadonlyMap<string, ChartMotionDefinition<any>>,
  context: ChartMotionContext<TDatum>,
): ResolvedCompositeMotion<TDatum> | undefined {
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

export function mergeCompositeMotion<TDatum>(
  parent: ResolvedCompositeMotion<TDatum> | undefined,
  child: ResolvedCompositeMotion<TDatum> | undefined,
): ResolvedCompositeMotion<TDatum> | undefined {
  if (child === false) return false
  if (child === undefined) return parent
  if (parent === false || parent === undefined) return child
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
