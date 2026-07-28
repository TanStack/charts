import * as React from 'react'
import { createPlotRenderer, type PlotDefinition } from '@plot-poc/observable'
import { Chart, type ChartProps } from './Chart'

export interface PlotProps<
  TInput,
  TValue = unknown,
  TPrepared = TInput,
> extends Omit<ChartProps<TInput, TValue>, 'data' | 'renderer'> {
  definition: PlotDefinition<TInput, TValue, TPrepared>
  input: TInput
}

export function Plot<TInput, TValue = unknown, TPrepared = TInput>({
  definition,
  input,
  ...props
}: PlotProps<TInput, TValue, TPrepared>) {
  const renderer = React.useMemo(
    () => createPlotRenderer(definition),
    [definition],
  )

  return <Chart {...props} data={input} renderer={renderer} />
}
