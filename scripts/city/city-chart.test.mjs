import { test } from 'vitest'
import assert from 'node:assert/strict'
import { defineChart } from '@tanstack/charts'
import { createChartRuntime } from '@tanstack/charts/runtime'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import {
  cityMark,
  defineCityChart,
  createCityRenderer,
  cityFocus,
} from '../../packages/react-charts/src/city/index.js'
import { bindCityPoints } from '../../packages/react-charts/src/city/interaction.js'

import { readCityLayout } from '../../packages/react-charts/src/city/layout.js'
import { layoutCity } from '../../packages/react-charts/src/city/engine/model.js'

const data = Object.freeze([
  Object.freeze({
    id: 'one',
    name: 'Empresa saudável',
    users: 42,
    mask: 1,
    status: 'healthy',
  }),
  Object.freeze({
    id: 'two',
    name: 'Empresa em risco',
    users: 2400,
    mask: 3,
    status: 'critical',
  }),
])
const sceneFor = (definition, size = { width: 800, height: 450 }) => {
  const runtime = createChartRuntime()
  return runtime.render(definition, size)
}

test('cityMark composes a TanStack definition and preserves datum, indices, keys and colors', () => {
  const definition = defineChart({
    marks: [cityMark(data)],
    scales: { x: { scale: scaleLinear }, y: { scale: scaleLinear } },
    color: { domain: [1, 3], range: ['#123456', '#abcdef'] },
    guides: false,
  })
  const scene = sceneFor(definition)
  assert.equal(scene.points.length, data.length)
  scene.points.forEach((point, i) => {
    assert.equal(point.datum, data[i])
    assert.equal(point.datumIndex, i)
    assert.equal(point.key, `companies:${data[i].id}`)
    assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y))
  })
  assert.deepEqual(
    scene.points.map((p) => p.color),
    ['#123456', '#abcdef'],
  )
  assert.equal(data[0].x, undefined)
  assert.equal(data[0].height, undefined)
})

test('the definition is deterministic, responsive and accepts an empty dataset', () => {
  const definition = defineCityChart(data)
  const first = sceneFor(definition)
  const wide = sceneFor(definition, { width: 1200, height: 450 })
  assert.deepEqual(
    first.points.map((p) => p.key),
    wide.points.map((p) => p.key),
  )
  assert.deepEqual(
    first.points.map((p) => [p.xValue, p.yValue]),
    wide.points.map((p) => [p.xValue, p.yValue]),
  )
  assert.deepEqual(
    first.points.map((p) => [p.x, p.y]),
    sceneFor(definition).points.map((p) => [p.x, p.y]),
  )
  assert.equal(sceneFor(defineCityChart([])).points.length, 0)
})

test('focus uses each mount surface without mixing two cities', () => {
  const one = sceneFor(defineCityChart(data)).points
  const two = sceneFor(defineCityChart(data)).points
  bindCityPoints(one, () => [one[0]])
  bindCityPoints(two, () => [two[1]])
  assert.equal(cityFocus.resolve(one, { x: 0, y: 0 })[0], one[0])
  assert.equal(cityFocus.resolve(two, { x: 0, y: 0 })[0], two[1])
  assert.deepEqual(cityFocus.resolve([], { x: 0, y: 0 }), [])
})

test('the renderer generates an SSR shell without WebGL or a DOM and escapes the accessible name', () => {
  const renderer = createCityRenderer()
  const markup = renderer.prerender(sceneFor(defineCityChart(data)), {
    ariaLabel: 'Saúde <empresas> "A" & B',
  })
  assert.match(markup, /data-city-surface/)
  assert.match(markup, /Saúde &lt;empresas&gt; &quot;A&quot; &amp; B/)
  assert.doesNotMatch(markup, /<canvas/)
})

test('the mark rejects invalid inputs before attempting lot allocation', () => {
  for (const invalid of [
    null,
    [{}],
    [data[0], data[0]],
    [{ ...data[0], users: NaN }],
    [{ ...data[0], mask: 0 }],
    [{ ...data[0], status: 'unknown' }],
  ]) {
    assert.throws(() => cityMark(invalid), /cityMark:/)
  }
})

test('the layout follows the TanStack scene, including empty scenes, without recalculating positions', () => {
  for (const rows of [data, []]) {
    const layout = layoutCity(rows)
    if (rows.length) layout.companies[0].x += 0.4
    const scene = sceneFor(defineCityChart(rows, { layout }))
    assert.equal(readCityLayout(scene.nodes), layout)
    if (rows.length) assert.equal(scene.points[0].xValue, layout.companies[0].x)
  }
})

test('the mark accepts the generic contract without a mask and retains the original datum', () => {
  const rows = [
    {
      id: 'generic',
      name: 'Aurora',
      metric: { label: 'Receita', value: 2400.25 },
      categories: [{ label: 'Premium', value: 'premium' }],
      status: 'warning',
    },
  ]
  const scene = sceneFor(defineCityChart(rows))
  const layout = readCityLayout(scene.nodes)
  assert.equal(scene.points[0].datum, rows[0])
  assert.equal(scene.points[0].groupLabel, 'Premium')
  assert.equal(layout.companies[0].mask, 1)
  assert.equal(layout.companies[0].metric.value, 2400.25)
  assert.equal(rows[0].mask, undefined)
})

test('the mark retains numeric IDs in the generic contract and validates normalized categories', () => {
  const row = {
    id: 101,
    name: 'Aurora',
    metric: { label: 'Receita', value: 42 },
    categories: [{ label: 'Premium', value: 'premium' }],
    status: 'healthy',
  }
  const scene = sceneFor(defineCityChart([row]))
  assert.equal(readCityLayout(scene.nodes).companies[0].id, 101)
  assert.equal(scene.points[0].datum.id, 101)
  assert.throws(() => cityMark([{ ...row, id: undefined }]), /cityMark: id/)
  assert.throws(
    () => cityMark([{ ...row, mask: 1, categories: [] }]),
    /cityMark:/,
  )
})
