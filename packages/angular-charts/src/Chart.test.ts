import '@angular/compiler'
import {
  Component,
  Directive,
  Input,
  ViewContainerRef,
  inject,
} from '@angular/core'
import type { TemplateRef } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { defineChart, lineY } from '@tanstack/charts'
import type { ChartTooltipContent } from '@tanstack/charts'
import { scaleLinear } from 'd3-scale'
import { Chart, ChartTooltipBodyDirective } from './index'
import type {
  ChartOptions,
  ChartTooltipBodyRenderContext,
  ChartTooltipBodyTemplateContext,
} from './index'

const rows = [
  { id: 'a', x: 0, y: 2 },
  { id: 'b', x: 1, y: 4 },
]
const definition = defineChart({
  marks: [lineY(rows, { x: 'x', y: 'y', key: 'id' })],
  x: { scale: scaleLinear().domain([0, 1]) },
  y: { scale: scaleLinear().domain([0, 4]) },
})

const tooltipDefinition = defineChart(definition, {
  maxFocusDistance: 1_000,
  tooltip: {
    portal: true,
    content: () => ({
      title: 'First',
      color: '#2563eb',
      rows: [
        {
          label: 'Value',
          value: '2',
          color: '#2563eb',
        },
      ],
    }),
  },
})

if (false) {
  const context = {} as ChartTooltipBodyRenderContext<
    (typeof rows)[number],
    number,
    number
  >
  expectTypeOf(context.points).items.toMatchTypeOf<{
    datum: (typeof rows)[number]
    xValue: number
    yValue: number
  }>()
  expectTypeOf(context.content).toEqualTypeOf<ChartTooltipContent | string>()
  expectTypeOf(context.defaultBody).toEqualTypeOf<TemplateRef<unknown>>()
  expectTypeOf(context.pinned).toEqualTypeOf<boolean>()
  expectTypeOf(context.dismiss).toEqualTypeOf<() => void>()

  const templateContext = {} as ChartTooltipBodyTemplateContext<
    (typeof rows)[number],
    number,
    number
  >
  expectTypeOf(templateContext.$implicit).toEqualTypeOf<
    ChartTooltipBodyRenderContext<(typeof rows)[number], number, number>
  >()
}

@Directive({
  selector: '[testTemplateOutlet]',
  standalone: true,
})
class TestTemplateOutlet {
  private readonly viewContainer = inject(ViewContainerRef)

  @Input()
  set testTemplateOutlet(template: TemplateRef<unknown> | undefined) {
    this.viewContainer.clear()
    if (template) this.viewContainer.createEmbeddedView(template, {})
  }
}

let nestedTooltipDestroys = 0

@Component({
  selector: 'test-nested-tooltip-lifecycle',
  standalone: true,
  template: '',
})
class TestNestedTooltipLifecycle {
  ngOnDestroy() {
    nestedTooltipDestroys += 1
  }
}

@Component({
  standalone: true,
  imports: [
    Chart,
    ChartTooltipBodyDirective,
    TestNestedTooltipLifecycle,
    TestTemplateOutlet,
  ],
  template: `
    <tanstack-chart [options]="options">
      <ng-template [tanstackChartTooltipBody]="options.definition" let-tooltip>
        <div data-testid="rich-tooltip">
          <ng-container
            [testTemplateOutlet]="tooltip.defaultBody"
          ></ng-container>
          <span data-testid="tooltip-point">{{
            tooltip.points[0]?.datum.id
          }}</span>
          <span data-testid="tooltip-pinned">{{ tooltip.pinned }}</span>
          <tanstack-chart [options]="nestedOptions" />
          <test-nested-tooltip-lifecycle />
          <button type="button" (click)="tooltip.dismiss()">Close</button>
        </div>
      </ng-template>
    </tanstack-chart>
  `,
})
class TooltipHost {
  options: ChartOptions<(typeof rows)[number]> = {
    definition: tooltipDefinition,
    width: 480,
    height: 260,
    ariaLabel: 'Revenue',
  }
  nestedOptions: ChartOptions<(typeof rows)[number]> = {
    definition,
    width: 120,
    height: 80,
    ariaLabel: 'Nested trend',
  }
}

beforeAll(() => {
  TestBed.initTestEnvironment(
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting(),
  )
})

afterEach(() => TestBed.resetTestingModule())

describe('Angular adapter', () => {
  it('mounts and updates the shared host', () => {
    TestBed.configureTestingModule({ imports: [Chart] })
    const fixture = TestBed.createComponent(Chart)
    fixture.componentRef.setInput('options', {
      definition,
      width: 480,
      height: 260,
      ariaLabel: 'Revenue',
    })
    fixture.detectChanges()

    expect(
      fixture.nativeElement.querySelector('svg')?.getAttribute('aria-label'),
    ).toBe('Revenue')

    fixture.componentRef.setInput('options', {
      definition,
      width: 480,
      height: 260,
      ariaLabel: 'Updated revenue',
    })
    fixture.detectChanges()
    expect(
      fixture.nativeElement.querySelector('svg')?.getAttribute('aria-label'),
    ).toBe('Updated revenue')
    fixture.destroy()
  })

  it('composes and cleans up a pinned tooltip body', () => {
    nestedTooltipDestroys = 0
    TestBed.configureTestingModule({ imports: [TooltipHost] })
    const fixture = TestBed.createComponent(TooltipHost)
    fixture.detectChanges()

    const svg = fixture.nativeElement.querySelector(
      'svg[aria-label="Revenue"]',
    ) as SVGSVGElement | null
    if (!svg) throw new Error('Expected an SVG chart')
    vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      right: 480,
      bottom: 260,
      left: 0,
      width: 480,
      height: 260,
      toJSON: () => ({}),
    })

    svg.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 52,
        clientY: 200,
      }),
    )
    fixture.detectChanges()

    const portal = document.querySelector<HTMLElement>(
      '[data-ts-chart-tooltip-portal]',
    )
    const body = portal?.querySelector<HTMLElement>('.ts-chart-tooltip__body')
    expect(portal).not.toBeNull()
    expect(
      fixture.nativeElement.querySelector('[data-testid="rich-tooltip"]'),
    ).toBeNull()
    expect(
      body?.querySelector('.ts-chart-tooltip__title')?.textContent?.trim(),
    ).toBe('First')
    expect(
      body
        ?.querySelector('.ts-chart-tooltip__row')
        ?.textContent?.replaceAll(/\s/g, ''),
    ).toBe('Value2')
    expect(
      body?.querySelector<HTMLElement>('.ts-chart-tooltip__swatch')?.style
        .background,
    ).toBe('rgb(37, 99, 235)')
    expect(
      body?.querySelector('[data-testid="tooltip-point"]')?.textContent,
    ).toBe('a')
    expect(
      body?.querySelector('[data-testid="tooltip-pinned"]')?.textContent,
    ).toBe('false')
    expect(body?.querySelector('svg[aria-label="Nested trend"]')).not.toBeNull()
    expect(body?.hasAttribute('inert')).toBe(true)
    expect(portal?.getAttribute('role')).toBe('status')

    const customBody = body?.querySelector('[data-testid="rich-tooltip"]')
    const nestedChart = body?.querySelector('tanstack-chart')
    fixture.componentInstance.options = {
      ...fixture.componentInstance.options,
      ariaLabel: 'Updated revenue',
    }
    fixture.detectChanges()
    expect(body?.querySelector('[data-testid="rich-tooltip"]')).toBe(customBody)
    expect(body?.querySelector('tanstack-chart')).toBe(nestedChart)

    svg.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        clientX: 52,
        clientY: 200,
      }),
    )
    fixture.detectChanges()

    expect(
      body?.querySelector('[data-testid="tooltip-pinned"]')?.textContent,
    ).toBe('true')
    expect(portal?.dataset.sticky).toBe('true')
    expect(body?.hasAttribute('inert')).toBe(false)
    expect(portal?.getAttribute('role')).toBe('dialog')
    expect(portal?.querySelector('.ts-chart-tooltip__body')).toBe(body)

    body
      ?.querySelector<HTMLButtonElement>('button')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    fixture.detectChanges()

    expect(portal?.hidden).toBe(true)
    expect(body?.querySelector('[data-testid="rich-tooltip"]')).toBeNull()
    expect(body?.querySelector('svg[aria-label="Nested trend"]')).toBeNull()
    expect(nestedTooltipDestroys).toBe(1)

    svg.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 52,
        clientY: 200,
      }),
    )
    fixture.detectChanges()
    expect(body?.querySelector('svg[aria-label="Nested trend"]')).not.toBeNull()

    fixture.destroy()
    expect(document.querySelector('[data-ts-chart-tooltip-portal]')).toBeNull()
    expect(document.querySelector('svg[aria-label="Nested trend"]')).toBeNull()
    expect(nestedTooltipDestroys).toBe(2)
  })
})
