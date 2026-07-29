import '@angular/compiler'
import { TestBed } from '@angular/core/testing'
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { defineChart, lineY } from '@tanstack/charts'
import { scaleLinear } from 'd3-scale'
import { Chart } from './Chart'

const rows = [
  { id: 'a', x: 0, y: 2 },
  { id: 'b', x: 1, y: 4 },
]
const definition = defineChart({
  marks: [lineY(rows, { x: 'x', y: 'y', key: 'id' })],
  x: { scale: scaleLinear().domain([0, 1]) },
  y: { scale: scaleLinear().domain([0, 4]) },
})

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
})
