import type {
  ChartMark,
  ChartValue,
  InitializedMark,
  MarkScene,
  ResolvedMarkLayout,
} from './types'

interface DecorativeMarkLifecycleOptions {
  conditional: 'remove' | 'reject'
  layoutLabels: 'preserve' | 'remove'
}

/** Reuses one post-domain lifecycle for always-decorative and filtered marks. */
export function createDecorativeMark<
  TDatum,
  TXPointValue extends ChartValue,
  TYPointValue extends ChartValue,
  TXScaleValue extends ChartValue,
  TYScaleValue extends ChartValue,
  TXScaleId extends string,
  TYScaleId extends string,
>(
  mark: ChartMark<
    TDatum,
    TXPointValue,
    TYPointValue,
    TXScaleValue,
    TYScaleValue,
    TXScaleId,
    TYScaleId
  >,
  transform: (
    scene: MarkScene<TDatum, TXPointValue, TYPointValue>,
  ) => MarkScene<TDatum, TXPointValue, TYPointValue>,
  options: DecorativeMarkLifecycleOptions,
): ChartMark<
  TDatum,
  never,
  never,
  TXScaleValue,
  TYScaleValue,
  TXScaleId,
  TYScaleId
> {
  return {
    motion: mark.motion,
    renderer: mark.renderer,
    initialize(context) {
      const initialized = mark.initialize(context)
      assertConditionalMetadata(initialized, initialized.id, options)
      const {
        focus: _focus,
        states: _states,
        resolveLayout,
        ...initializedBase
      } = initialized
      const base = withoutLayoutLabels(initializedBase, options.layoutLabels)

      return {
        ...base,
        render: initialized.render as unknown as InitializedMark<
          TDatum,
          never,
          never
        >['render'],
        postDomain: composePostDomain(initialized.postDomain, transform),
        ...(resolveLayout
          ? {
              resolveLayout(layoutContext) {
                const resolved = resolveLayout(layoutContext)
                assertConditionalMetadata(resolved, initialized.id, options)
                const { states: _resolvedStates, ...resolvedBase } = resolved
                const resolvedWithoutLabels = withoutLayoutLabels(
                  resolvedBase,
                  options.layoutLabels,
                )
                return {
                  ...resolvedWithoutLabels,
                  render: resolved.render as unknown as ResolvedMarkLayout<
                    TDatum,
                    never,
                    never
                  >['render'],
                  postDomain: composePostDomain(
                    resolved.postDomain ?? initialized.postDomain,
                    transform,
                  ),
                } satisfies ResolvedMarkLayout<TDatum, never, never>
              },
            }
          : {}),
      } satisfies InitializedMark<TDatum, never, never>
    },
  }
}

function assertConditionalMetadata(
  mark: {
    focus?: unknown
    states?: unknown
  },
  id: string,
  options: DecorativeMarkLifecycleOptions,
) {
  if (
    options.conditional === 'reject' &&
    (mark.focus !== undefined || mark.states !== undefined)
  ) {
    throw new TypeError(
      `decorative() cannot wrap mark "${id}" with focus or state behavior`,
    )
  }
}

function withoutLayoutLabels<T extends { layoutLabels?: unknown }>(
  value: T,
  policy: DecorativeMarkLifecycleOptions['layoutLabels'],
): T | Omit<T, 'layoutLabels'> {
  if (policy === 'preserve') return value
  const { layoutLabels: _layoutLabels, ...rest } = value
  return rest
}

function composePostDomain<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  existing:
    | ((
        scene: MarkScene<TDatum, TXValue, TYValue>,
      ) => MarkScene<TDatum, TXValue, TYValue>)
    | undefined,
  transform: (
    scene: MarkScene<TDatum, TXValue, TYValue>,
  ) => MarkScene<TDatum, TXValue, TYValue>,
) {
  return (scene: MarkScene<TDatum, TXValue, TYValue>) =>
    transform(existing ? existing(scene) : scene)
}
