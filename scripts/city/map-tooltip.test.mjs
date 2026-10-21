import { test } from 'vitest'
import assert from 'node:assert/strict'
import { mapTooltipAnchor } from '../../packages/react-charts/src/city/engine/lib/map-tooltip.js'

test('the anchor keeps the roof projection inside the map', () => {
  assert.deepEqual(mapTooltipAnchor({ x: 0.5, y: -0.5 }, 800, 600), {
    x: 600,
    y: 450,
  })
})

test('roofs outside the view retain a visible anchor at the edges', () => {
  for (const point of [
    { x: 0, y: 2 },
    { x: 0, y: -2 },
    { x: -2, y: 0 },
    { x: 2, y: 0 },
    { x: 4, y: 4, z: 2 },
  ]) {
    const anchor = mapTooltipAnchor(point, 800, 600)
    assert.ok(anchor.x >= 18 && anchor.x <= 782)
    assert.ok(anchor.y >= 18 && anchor.y <= 582)
  }
})

test('transient dimensions do not produce invalid anchors', () => {
  assert.equal(mapTooltipAnchor({ x: 0, y: 0 }, 0, 600), null)
  assert.equal(mapTooltipAnchor({ x: NaN, y: 0 }, 800, 600), null)
  assert.deepEqual(mapTooltipAnchor({ x: 2, y: 2 }, 20, 10), { x: 10, y: 5 })
})
