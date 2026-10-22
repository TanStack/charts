import { test } from 'vitest'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { metricDomainFor, sizeForValue, layoutCity } from './engine/model.js'
import { facadeWindows } from './engine/plumes.js'
import { City } from './engine/city.js'
import { disposeSceneGroups } from './engine/scene-resources.js'

const records = (values) =>
  values.map((value, i) => ({
    id: String(i),
    name: `Company ${i}`,
    mask: 1,
    status: 'healthy',
    metric: { label: 'Revenue', value },
  }))

test('adaptive heights distinguish values inside former bands at any magnitude', () => {
  for (const values of [
    [0, 0.25, 0.5],
    [2000, 3000, 4000],
    [2e9, 3e9, 4e9],
  ]) {
    const domain = metricDomainFor(records(values))
    const sizes = values.map((value) => sizeForValue(value, domain))
    assert.equal(sizes[0].height, 0.95)
    assert.equal(sizes[2].height, 16.8)
    assert.equal(sizes[2].floors, 14)
    assert.equal(sizes[0].floors, 1)
    assert.equal(sizes[1].height, 0.95 + Math.sqrt(0.5) * 15.85)
    assert.ok(sizes[1].height > (0.95 + 16.8) / 2)
    assert.ok(sizes[0].height < sizes[1].height)
    assert.ok(sizes[1].height < sizes[2].height)
  }
})

test('empty, single, equal, zero, duplicate and legacy metrics have defined heights', () => {
  assert.deepEqual(metricDomainFor([]), [0, 0])
  assert.deepEqual(metricDomainFor([{ users: 2 }, { users: 9 }]), [2, 9])
  for (const values of [[0], [25], [0, 0], [100, 100]]) {
    const domain = metricDomainFor(records(values))
    for (const value of values)
      assert.equal(sizeForValue(value, domain).height, 8.875)
  }
  const domain = metricDomainFor(records([1, 2, 2, 3]))
  assert.deepEqual(domain, [1, 3])
  assert.equal(sizeForValue(2, domain).height, 0.95 + Math.sqrt(0.5) * 15.85)
  assert.equal(sizeForValue(-1, domain).height, 0.95)
  assert.equal(sizeForValue(10, domain).height, 16.8)
})

test('square-root scaling gives intermediate values more presence and fits every facade', () => {
  const domain = [0, 100]
  assert.equal(sizeForValue(25, domain).height, 8.875)
  let previous = 0
  for (let value = 0; value <= 100; value += 0.25) {
    const size = sizeForValue(value, domain)
    assert.ok(size.height > previous)
    assert.ok(size.floors >= 1 && size.floors <= 14)
    previous = size.height
    const company = { x: 0, z: 0, height: size.height }
    const windows = facadeWindows(company, size, 1.5, 1.5)
    assert.equal(windows.length, size.floors * 4)
    for (const window of windows) {
      assert.ok(window.y - window.height / 2 > 0)
      assert.ok(window.y + window.height / 2 < size.height + 0.13)
    }
  }
})

test('rendered geometry rescales unchanged companies when the domain changes', () => {
  const city = Object.assign(Object.create(City.prototype), {
    scene: new THREE.Scene(),
    terrain: new THREE.Group(),
    buildings: new THREE.Group(),
    palettes: new Map([[1, new THREE.Color('#4b91ef')]]),
    renderer: { renderLists: { dispose() {} } },
    selection: { visible: false },
    resize() {},
    buildTerrain() {},
    buildTraffic() {},
    buildEffects() {},
    invalidate() {},
    select() {},
  })
  try {
    let layout = layoutCity(records([2000, 3000, 4000]))
    city.setCompanies(layout.companies, layout)
    const original = city.companies[1].height
    assert.equal(city.body.userData.items[1].h, original)
    layout = layoutCity(records([2000, 3000, 6000]))
    city.updateCompanies(layout, new Map())
    assert.ok(city.companies[1].height < original)
    assert.equal(city.body.userData.items[1].h, city.companies[1].height)
    // A full-data domain can change even when all companies on this page stay the same.
    layout = {
      ...layoutCity(records([2000, 3000, 6000])),
      metricDomain: [0, 10000],
    }
    city.updateCompanies(layout, new Map())
    assert.equal(
      city.companies[1].height,
      sizeForValue(3000, [0, 10000]).height,
    )
    assert.equal(city.body.userData.items[1].h, city.companies[1].height)
  } finally {
    disposeSceneGroups([city.scene, city.buildings])
  }
})
