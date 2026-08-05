import * as React from 'react'
import {
  isDynamicChartDefinition,
  resolveChartAdapterLayout,
} from '@tanstack/charts'
import { Chart } from '@tanstack/react-charts'
import { withConformanceBehavior } from '../../../benchmarks/conformance/shared/mount'
import type {
  ChartDefinition,
  ChartDefinitionOptions,
  ChartValue,
  DynamicChartDefinition,
} from '@tanstack/charts'
import type { TanStackConformanceCase } from '../../../benchmarks/conformance/shared/mount'
import type { CatalogChartProps } from './index'

export function createCatalogChart<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  catalogCase: TanStackConformanceCase<TDatum, TXValue, TYValue>,
): React.ComponentType<CatalogChartProps> {
  function CatalogChart({
    initialWidth = 640,
    width,
    height,
    aspectRatio,
    revision = 0,
    interactive = false,
    preview = false,
    idPrefix,
  }: CatalogChartProps) {
    const definition = React.useMemo(() => {
      const layout = resolveChartAdapterLayout({
        aspectRatio,
        height,
        initialWidth,
        width,
      })
      const initialInput = {
        width: layout.initialWidth,
        height: layout.initialHeight,
        revision,
        interactive,
        preview,
      }
      const initialDefinition = withConformanceBehavior(
        catalogCase.createDefinition(initialInput),
        initialInput,
        catalogCase.interactiveTooltip,
      )
      const responsiveDefinition: DynamicChartDefinition<
        TDatum,
        TXValue,
        TYValue
      > = {
        ...definitionOptions(initialDefinition),
        chart(context) {
          const nextInput = {
            ...initialInput,
            width: context.width,
            height: context.height,
          }
          const nextDefinition =
            context.width === initialInput.width &&
            context.height === initialInput.height
              ? initialDefinition
              : withConformanceBehavior(
                  catalogCase.createDefinition(nextInput),
                  nextInput,
                  catalogCase.interactiveTooltip,
                )

          return isDynamicChartDefinition(nextDefinition)
            ? nextDefinition.chart(context)
            : nextDefinition
        },
      }

      return responsiveDefinition
    }, [
      aspectRatio,
      height,
      initialWidth,
      interactive,
      preview,
      revision,
      width,
    ])

    return (
      <Chart
        definition={definition}
        width={width}
        initialWidth={initialWidth}
        height={height}
        aspectRatio={aspectRatio}
        ariaLabel={catalogCase.ariaLabel}
        idPrefix={idPrefix}
      />
    )
  }

  return CatalogChart
}

function definitionOptions<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  definition: ChartDefinition<TDatum, TXValue, TYValue>,
): ChartDefinitionOptions<TDatum, TXValue, TYValue> {
  return {
    ...(definition.maxFocusDistance === undefined
      ? {}
      : { maxFocusDistance: definition.maxFocusDistance }),
    ...(definition.focus === undefined ? {} : { focus: definition.focus }),
    ...(definition.focusRing === undefined
      ? {}
      : { focusRing: definition.focusRing }),
    ...(definition.spatialIndex === undefined
      ? {}
      : { spatialIndex: definition.spatialIndex }),
    ...(definition.animate === undefined
      ? {}
      : { animate: definition.animate }),
    ...(definition.motion === undefined ? {} : { motion: definition.motion }),
    ...(definition.keyboard === undefined
      ? {}
      : { keyboard: definition.keyboard }),
    ...(definition.tooltip === undefined
      ? {}
      : { tooltip: definition.tooltip }),
  }
}
