import {
  APP_ID,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injectable,
  Input,
  ViewChild,
  ViewEncapsulation,
  inject,
} from '@angular/core'
import type {
  AfterViewInit,
  OnChanges,
  OnDestroy,
  SimpleChanges,
} from '@angular/core'
import { DomSanitizer } from '@angular/platform-browser'
import type { SafeHtml } from '@angular/platform-browser'
import {
  createChartAdapter,
  resolveChartAdapterLayout,
} from '@tanstack/charts/adapter'
import type {
  ChartAdapter,
  ChartHostOptions,
  ChartValue,
} from '@tanstack/charts'
import type { ChartOptions } from './types'

@Injectable({ providedIn: 'root' })
class ChartIdGenerator {
  private readonly appId = inject(APP_ID)
  private nextId = 0

  next() {
    return `ts-chart-${this.appId}-${++this.nextId}`.replaceAll(
      /[^a-zA-Z0-9_-]/g,
      '',
    )
  }
}

@Component({
  selector: 'tanstack-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div [class]="hostClass" [style]="hostStyle">
      <div
        #surface
        class="ts-chart-surface"
        style="width: 100%; height: 100%"
        [innerHTML]="initialMarkup"
      ></div>
    </div>
  `,
})
export class Chart<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>
  implements OnChanges, AfterViewInit, OnDestroy
{
  @Input({ required: true })
  declare options: ChartOptions<TDatum, TXValue, TYValue>

  @ViewChild('surface', { static: true })
  declare private surface: ElementRef<HTMLElement>

  initialMarkup: SafeHtml | string = ''
  hostClass = 'ts-chart-host'
  hostStyle = 'position:relative;width:100%;height:320px'

  private readonly sanitizer = inject(DomSanitizer)
  private readonly generatedId = inject(ChartIdGenerator).next()
  private adapter?: ChartAdapter<
    ChartHostOptions<TDatum, TXValue, TYValue>,
    TDatum,
    TXValue,
    TYValue
  >
  private viewReady = false

  ngOnChanges(_changes: SimpleChanges) {
    if (!this.options) return
    const idPrefix = this.options.idPrefix ?? this.generatedId
    const hostOptions = toHostOptions(this.options, idPrefix)
    const layout = resolveChartAdapterLayout(this.options)
    this.hostClass = this.options.class
      ? `ts-chart-host ${this.options.class}`
      : 'ts-chart-host'
    this.hostStyle = [
      'position:relative',
      `width:${this.options.width === undefined ? '100%' : `${this.options.width}px`}`,
      this.options.height !== undefined
        ? `height:${this.options.height}px`
        : layout.aspectRatio === undefined
          ? 'height:320px'
          : `aspect-ratio:${layout.aspectRatio}`,
      this.options.style,
    ]
      .filter(Boolean)
      .join(';')

    if (!this.adapter) {
      this.adapter = createChartAdapter(hostOptions)
      this.initialMarkup = this.sanitizer.bypassSecurityTrustHtml(
        this.adapter.prerender(),
      )
    } else {
      this.adapter.update(hostOptions)
    }
    if (this.viewReady) this.adapter.update(hostOptions)
  }

  ngAfterViewInit() {
    this.viewReady = true
    this.adapter?.mount(this.surface.nativeElement)
  }

  ngOnDestroy() {
    this.adapter?.destroy()
  }
}

function toHostOptions<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  options: ChartOptions<TDatum, TXValue, TYValue>,
  idPrefix: string,
): ChartHostOptions<TDatum, TXValue, TYValue> {
  const { class: _class, style: _style, ...hostOptions } = options
  return { ...hostOptions, idPrefix }
}
