import { test } from 'vitest'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { City } from './engine/city.js'

test('isometric view keeps a fixed tilt when rotating, recentering and returning from the top view', () => {
  const camera = new THREE.OrthographicCamera(-100, 100, 100, -100, 0.1, 800)
  camera.position.set(160, 160, 160)
  const controls = new OrbitControls(camera, null),
    city = { camera, controls, layout: { center: [14, -8] } }
  const angle = Math.acos(1 / Math.sqrt(3))
  for (const previousMode of ['iso', 'top']) {
    City.prototype.view.call(city, previousMode, true)
    if (previousMode === 'top') assert.ok(controls.getPolarAngle() < 0.00001)
    City.prototype.view.call(city, 'iso', true)
    assert.deepEqual(controls.target.toArray(), [14, 0, -8])
    let azimuth
    for (const offset of [
      [150, 5, 10],
      [-150, 300, 10],
      [10, 500, -150],
    ]) {
      camera.position.copy(controls.target).add(new THREE.Vector3(...offset))
      controls.update()
      assert.ok(Math.abs(controls.getPolarAngle() - angle) < 1e-10)
      if (azimuth !== undefined)
        assert.notEqual(controls.getAzimuthalAngle(), azimuth)
      azimuth = controls.getAzimuthalAngle()
    }
    camera.zoom = 2
    camera.updateProjectionMatrix()
    controls.target.x += 5
    controls.update()
    assert.equal(camera.zoom, 2)
    assert.ok(Math.abs(controls.getPolarAngle() - angle) < 1e-10)
  }
})

test('a frame older than a reduced-motion transition cannot overshoot the camera target', () => {
  const previousDocument = globalThis.document
  globalThis.document = { hidden: false }
  try {
    const camera = new THREE.OrthographicCamera(-100, 100, 100, -100, 0.1, 800)
    camera.position.set(160, 160, 160)
    const controls = new OrbitControls(camera, null)
    const city = {
      camera,
      controls,
      layout: { center: [14, -8] },
      running: true,
      reduceMotion: true,
      elapsed: 0,
      callbacks: {},
      renderer: { render() {} },
      invalidate() {},
      updateEffects() {},
    }
    City.prototype.view.call(city, 'iso', true)
    City.prototype.view.call(city, 'top')
    const start = city.fly.start
    City.prototype.animate.call(city, start - 1)
    assert.ok(city.fly, 'an earlier RAF must not complete the transition')
    City.prototype.animate.call(city, start + 2)
    assert.equal(city.fly, null)
    assert.ok(Math.abs(controls.getAzimuthalAngle()) < 1e-9)
    assert.ok(controls.getPolarAngle() < 0.00001)
    assert.deepEqual(controls.target.toArray(), [14, 0, -8])
  } finally {
    if (previousDocument === undefined) delete globalThis.document
    else globalThis.document = previousDocument
  }
})

test('auto-rotation is opt-in, slow, frame-rate independent and pauses when controls are locked', () => {
  const previousDocument = globalThis.document
  globalThis.document = { hidden: false }
  try {
    const results = []
    for (const fps of [5, 30, 60, 120]) {
      const camera = new THREE.OrthographicCamera(
        -100,
        100,
        100,
        -100,
        0.1,
        800,
      )
      camera.position.set(160, 160, 160)
      const controls = new OrbitControls(camera, null)
      controls.autoRotateSpeed = -0.3
      controls.update()
      const city = {
        camera,
        controls,
        running: true,
        life: false,
        effects: false,
        reduceMotion: true,
        elapsed: 0,
        callbacks: {},
        renderer: { render() {} },
        invalidate() {},
        updateEffects() {},
      }
      const angle = controls.getAzimuthalAngle()
      City.prototype.animate.call(city, 1000)
      City.prototype.animate.call(city, 2000)
      assert.equal(controls.getAzimuthalAngle(), angle)
      City.prototype.setAutoRotate.call(city, true)
      City.prototype.animate.call(city, 3000)
      for (let frame = 1; frame <= fps * 10; frame++) {
        City.prototype.animate.call(city, 3000 + (frame * 1000) / fps)
      }
      const delta = controls.getAzimuthalAngle() - angle
      assert.ok(Math.abs(delta - Math.PI / 10) < 1e-9)
      results.push(delta)
      controls.enabled = false
      const paused = controls.getAzimuthalAngle()
      City.prototype.animate.call(city, 13100)
      assert.ok(Math.abs(controls.getAzimuthalAngle() - paused) < 1e-9)
      controls.enabled = true
      City.prototype.setAutoRotate.call(city, false)
      City.prototype.animate.call(city, 14000)
      City.prototype.animate.call(city, 14050)
      assert.ok(Math.abs(controls.getAzimuthalAngle() - paused) < 1e-9)
    }
    assert.ok(Math.max(...results) - Math.min(...results) < 1e-9)
  } finally {
    if (previousDocument === undefined) delete globalThis.document
    else globalThis.document = previousDocument
  }
})
