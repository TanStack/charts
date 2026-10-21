import { test } from 'vitest'
import assert from 'node:assert/strict'
import { greenLots } from './engine/landscape.js'
import {
  demoCompanies,
  layoutCity,
  paginateCompanies,
  PAGE_SIZES,
  ROAD_EVERY,
} from './engine/model.js'

test('every area without a company receives a garden without occupying streets for every filter and page', () => {
  const records = demoCompanies()
  for (const size of PAGE_SIZES)
    for (const filter of [
      {},
      { region: '7' },
      { status: 'warning' },
      { query: 'sem-resultados-xyz' },
    ]) {
      const first = paginateCompanies(records, filter, 1, size)
      for (const page of new Set([1, first.pages])) {
        const layout = layoutCity(
          paginateCompanies(records, filter, page, size).companies,
        )
        const lots = greenLots(layout),
          green = new Set(lots.map((p) => `${p.col},${p.row}`))
        const occupied = new Set(
          layout.companies.map((c) => `${c.col},${c.row}`),
        )
        assert.equal(green.size, lots.length)
        const b = layout.roadBounds
        for (let row = b.z1; row <= b.z2; row++)
          for (let col = b.x1; col <= b.x2; col++) {
            const key = `${col},${row}`,
              road = col % ROAD_EVERY === 0 || row % ROAD_EVERY === 0
            assert.equal(green.has(key), !road && !occupied.has(key))
          }
        for (const lot of lots) {
          assert.ok(lot.trees.length <= 3)
          for (const tree of lot.trees) {
            // Even the full canopy stays inside its lot and off sidewalks.
            assert.ok(Math.abs(tree.dx) + tree.scale < (2.8 - 0.12) / 2)
            assert.ok(Math.abs(tree.dz) + tree.scale < (2.8 - 0.12) / 2)
            for (const bench of lot.benches)
              assert.ok(
                Math.hypot(tree.dx - bench.dx, tree.dz - bench.dz) >=
                  tree.scale + 0.55,
              )
          }
          for (const bench of lot.benches) {
            // The entire rotated bench fits inside the lawn lot.
            const cos = Math.abs(Math.cos(bench.rotation)),
              sin = Math.abs(Math.sin(bench.rotation))
            assert.ok(Math.abs(bench.dx) + 0.24 * cos + 0.08 * sin < 1.34)
            assert.ok(Math.abs(bench.dz) + 0.24 * sin + 0.08 * cos < 1.34)
          }
        }
      }
    }
})

test('gardens vary between clearings and tree clusters with a few stable benches', () => {
  const layout = layoutCity(demoCompanies().slice(0, 100))
  const lots = greenLots(layout)
  assert.deepEqual(greenLots(layout), lots)
  assert.deepEqual(
    [...new Set(lots.map((lot) => lot.trees.length))].sort(),
    [0, 1, 2, 3],
  )
  const benches = lots.filter((lot) => lot.benches.length > 0)
  assert.ok(benches.length > 0 && benches.length < lots.length * 0.15)
  assert.ok(new Set(benches.map((lot) => lot.benches[0].rotation)).size > 1)
  for (const lot of lots)
    for (let i = 0; i < lot.trees.length; i++)
      for (const other of lot.trees.slice(i + 1)) {
        const tree = lot.trees[i]
        assert.ok(
          Math.hypot(tree.dx - other.dx, tree.dz - other.dz) >=
            tree.scale + other.scale + 0.08,
        )
      }
})

test('a freed lot becomes a garden and can receive a company again without overlapping vegetation', () => {
  const layout = layoutCity(demoCompanies().slice(0, 100)),
    removed = layout.companies[0]
  const before = greenLots(layout)
  const vacant = greenLots({ ...layout, companies: layout.companies.slice(1) })
  assert.ok(vacant.some((p) => p.col === removed.col && p.row === removed.row))
  assert.deepEqual(
    vacant.filter((p) => p.col !== removed.col || p.row !== removed.row),
    before,
  )
  assert.deepEqual(greenLots(layout), before)
})
