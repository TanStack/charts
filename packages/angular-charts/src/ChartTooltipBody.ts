import { Directive, Input, TemplateRef, inject } from '@angular/core'
import type { ChartDefinition, ChartValue } from '@tanstack/charts'
import type { ChartTooltipBodyTemplateContext } from './types'

@Directive({
  selector: 'ng-template[tanstackChartTooltipBody]',
  standalone: true,
})
export class ChartTooltipBodyDirective<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  @Input({ required: true, alias: 'tanstackChartTooltipBody' })
  declare definition: ChartDefinition<TDatum, TXValue, TYValue>

  readonly templateRef =
    inject<
      TemplateRef<ChartTooltipBodyTemplateContext<TDatum, TXValue, TYValue>>
    >(TemplateRef)

  static ngTemplateContextGuard<
    TDatum,
    TXValue extends ChartValue,
    TYValue extends ChartValue,
  >(
    _directive: ChartTooltipBodyDirective<TDatum, TXValue, TYValue>,
    context: unknown,
  ): context is ChartTooltipBodyTemplateContext<TDatum, TXValue, TYValue> {
    return true
  }
}
