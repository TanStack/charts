import { test } from 'vitest'
import assert from 'node:assert/strict'
import { CitySlider } from '../../packages/react-charts/src/city/engine/city-slider.js'

function setup(t) {
  const originalWindow = globalThis.window,
    originalDocument = globalThis.document
  const animations = []
  class Element {
    children = []
    classList = { add() {}, remove() {} }
    append(...children) {
      this.children.push(...children)
      for (const child of children) child.parent = this
    }
    replaceChildren(...children) {
      this.children = []
      this.append(...children)
    }
    remove() {
      if (this.parent)
        this.parent.children = this.parent.children.filter((c) => c !== this)
    }
    setAttribute() {}
    removeAttribute() {}
    cloneNode() {
      return new Element()
    }
    getContext() {
      return { drawImage() {} }
    }
    animate(frames) {
      let resolve, reject
      const animation = {
        frames,
        finished: new Promise((a, b) => {
          resolve = a
          reject = b
        }),
        finish() {
          resolve()
        },
        cancel() {
          reject(new Error('cancelled'))
        },
      }
      animations.push(animation)
      return animation
    }
  }
  globalThis.window = { addEventListener() {} }
  globalThis.document = { createElement: () => new Element() }
  t.onTestFinished(() => {
    globalThis.window = originalWindow
    globalThis.document = originalDocument
  })
  const city = {
    reduceMotion: false,
    controls: { enabled: true },
    renderer: { domElement: new Element(), render() {} },
  }
  const panel = new Element(),
    labels = new Element(),
    slider = new CitySlider(city, panel, labels)
  return { city, panel, slider, animations }
}

test('next and previous move scenes in opposite directions and unlock the map on completion', async (t) => {
  const { city, panel, slider, animations } = setup(t)
  for (const direction of [1, -1]) {
    animations.length = 0
    slider.capture()
    const snapshot = slider.state.canvas
    assert.equal(city.controls.enabled, false)
    const done = slider.play(direction)
    assert.equal(
      animations[0].frames[1].transform,
      `translateX(${-direction * 100}%)`,
    )
    assert.equal(
      animations[1].frames[0].transform,
      `translateX(${direction * 100}%)`,
    )
    assert.deepEqual(animations[1].frames, animations[2].frames)
    for (const animation of animations) animation.finish()
    await done
    assert.equal(slider.active, false)
    assert.equal(city.controls.enabled, true)
    assert.equal(panel.children.length, 0)
    assert.equal(snapshot.width, 0)
    assert.equal(snapshot.height, 0)
  }
})

test('canceling during filtering removes the old scene without ending a subsequent transition', async (t) => {
  const { city, panel, slider, animations } = setup(t)
  slider.capture()
  const first = slider.play(1)
  slider.cancel()
  assert.equal(panel.children.length, 0)
  assert.equal(city.controls.enabled, true)
  slider.capture()
  const next = slider.play(-1)
  await first
  assert.equal(slider.active, true)
  assert.equal(panel.children.length, 1)
  for (const animation of animations.slice(3)) animation.finish()
  await next
  assert.equal(slider.active, false)
  assert.equal(panel.children.length, 0)
})

test('reduced motion switches the city without a snapshot or locking controls', async (t) => {
  const { city, panel, slider, animations } = setup(t)
  city.reduceMotion = true
  slider.capture()
  await slider.play(1)
  assert.equal(animations.length, 0)
  assert.equal(panel.children.length, 0)
  assert.equal(city.controls.enabled, true)
})

test('snapshots preserve label CSS positions without changing the incoming city', (t) => {
  const { panel, slider } = setup(t)
  const rule = {
    cssText:
      '[data-atlas-city-instance="one"] .atlas-city-label[data-region="1"] { left: 10px; top: 20px; }',
  }
  panel.querySelector = () => ({ sheet: { cssRules: [rule] } })
  slider.capture()
  const style = slider.state.overlay.children.at(-1)
  assert.match(style.textContent, /\.city-slide-labels \.atlas-city-label/)
  assert.match(style.textContent, /left: 10px/)
  rule.cssText = rule.cssText.replace('10px', '100px')
  assert.match(style.textContent, /left: 10px/)
  slider.cancel()
  assert.equal(panel.children.length, 0)
})
