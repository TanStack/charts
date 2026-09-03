import { describe, expect, it } from 'vitest'
import { clientPointBounds, scenePointToClient } from './driver-geometry'

describe('clientPointBounds', () => {
  it('returns null for an empty point cloud', () => {
    expect(
      clientPointBounds([], { left: 10, top: 20 }, { paint: '#2563eb' }),
    ).toBeNull()
  })

  it('translates local pixels into client coordinates', () => {
    expect(
      clientPointBounds(
        [
          [5, 8],
          [15, 3],
          [10, 18],
        ],
        { left: 100, top: 200 },
        { paint: '#2563eb' },
      ),
    ).toEqual({
      x: 105,
      y: 203,
      width: 10,
      height: 15,
      paint: '#2563eb',
    })
  })

  it('scales scene coordinates into client pixels', () => {
    expect(
      clientPointBounds(
        [
          [4, 6],
          [10, 8],
        ],
        { left: 10, top: 20 },
        { paint: '#2563eb', scaleX: 2, scaleY: 3 },
      ),
    ).toEqual({
      x: 18,
      y: 38,
      width: 12,
      height: 6,
      paint: '#2563eb',
    })
  })

  it('preserves a one-pixel sample for a degenerate point cloud', () => {
    expect(
      clientPointBounds(
        [[4, 6]],
        { left: 10, top: 20 },
        {
          paint: '#2563eb',
          scaleX: 2,
          scaleY: 3,
        },
      ),
    ).toEqual({
      x: 18,
      y: 38,
      width: 1,
      height: 1,
      paint: '#2563eb',
    })
  })
})

describe('scenePointToClient', () => {
  it('maps an outer-scene point through the rendered SVG bounds', () => {
    const surface = document.createElement('div')
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.classList.add('ts-chart')
    surface.append(svg)
    svg.getBoundingClientRect = () =>
      ({
        left: 100,
        top: 200,
        width: 600,
        height: 300,
      }) as DOMRect

    expect(
      scenePointToClient(surface, { width: 300, height: 150 }, 75, 60),
    ).toEqual({
      x: 250,
      y: 320,
      focusElement: svg,
    })
  })

  it('rejects missing surfaces and invalid scene coordinates', () => {
    const surface = document.createElement('div')
    expect(
      scenePointToClient(surface, { width: 300, height: 150 }, 75, 60),
    ).toBeNull()

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.classList.add('ts-chart')
    surface.append(svg)
    expect(
      scenePointToClient(surface, { width: 0, height: 150 }, 75, 60),
    ).toBeNull()
    expect(
      scenePointToClient(surface, { width: 300, height: 150 }, Number.NaN, 60),
    ).toBeNull()
  })
})
