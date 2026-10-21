import * as THREE from 'three'
import { STEP } from './primitives.js'
import { random } from '../engine/model.js'
import { SnowCover } from './snow-cover.js'

const COUNT = 800
// Keep small examples from receiving a full-size city's rain in less space.
// The usual 100-company city still reaches the existing 800-drop budget.
const RAIN_DROPS_PER_CELL = 1.2
const fraction = (value) => value - Math.floor(value)
const rainDay = new THREE.Color('#356b91')
const rainNight = new THREE.Color('#b5d4eb')

function snowTexture() {
  const size = 32
  const pixels = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const radius = Math.hypot(
        ((x + 0.5) / size) * 2 - 1,
        ((y + 0.5) / size) * 2 - 1,
      )
      // A white center with a blue-gray rim stays legible on bright ground
      // without turning the entire snowflake dark in the daytime.
      const core = THREE.MathUtils.clamp((0.7 - radius) * 5, 0, 1)
      pixels.set(
        [
          Math.round(94 + 161 * core),
          Math.round(116 + 139 * core),
          Math.round(135 + 120 * core),
          Math.round(255 * Math.max(0, Math.min(1, (1 - radius) * 6))),
        ],
        i,
      )
    }
  const texture = new THREE.DataTexture(pixels, size, size)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.magFilter = texture.minFilter = THREE.LinearFilter
  texture.needsUpdate = true
  return texture
}

// Two shared buffers, reused across weather changes and city pagination.
export class CityWeather extends THREE.Group {
  constructor({ lightningRandom = Math.random } = {}) {
    super()
    this.weatherType = 'none'
    this.visible = false
    this.lightningRandom = lightningRandom
    const rng = random(98173)
    const clusters = Array.from({ length: 7 }, () => [rng(), rng()])
    this.flakes = Array.from({ length: COUNT }, (_, i) => {
      const cluster = clusters[i % clusters.length]
      const clustered = rng() < 0.55
      return {
        x: clustered ? fraction(cluster[0] + (rng() - 0.5) * 0.32) : rng(),
        z: clustered ? fraction(cluster[1] + (rng() - 0.5) * 0.32) : rng(),
        phase: rng(),
        speed: 1.3 + rng() * 2,
        sway: 0.15 + rng() * 0.65,
        frequency: 0.4 + rng() * 1.1,
        angle: rng() * Math.PI * 2,
      }
    })
    // Independent seeds break the diagonal bands produced by index-based
    // sequences. Keep them stable between frames without allocating particles.
    const rainRandom = random(61547)
    this.drops = Array.from({ length: COUNT }, () => ({
      x: rainRandom(),
      z: rainRandom(),
      phase: rainRandom(),
      speed: 18 + rainRandom() * 12,
      length: 0.65 + rainRandom() * 1.25,
      windX: 1.8 + rainRandom() * 1.4,
      windZ: 0.4 + rainRandom() * 0.8,
    }))
    const rainGeometry = new THREE.BufferGeometry()
    rainGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(COUNT * 6), 3).setUsage(
        THREE.DynamicDrawUsage,
      ),
    )
    const snowGeometry = new THREE.BufferGeometry()
    snowGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3).setUsage(
        THREE.DynamicDrawUsage,
      ),
    )
    this.rain = new THREE.LineSegments(
      rainGeometry,
      new THREE.LineBasicMaterial({
        color: '#b5d4eb',
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        toneMapped: false,
      }),
    )
    this.snow = new THREE.Points(
      snowGeometry,
      new THREE.PointsMaterial({
        color: '#ffffff',
        size: 3,
        sizeAttenuation: false,
        map: snowTexture(),
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        toneMapped: false,
      }),
    )
    this.rain.frustumCulled = this.snow.frustumCulled = false
    this.cover = new SnowCover()
    this.lightning = new THREE.DirectionalLight('#dceaff', 0)
    this.lightning.position.set(-60, 100, 40)
    this.add(this.rain, this.snow, this.cover, this.lightning)
  }

  setLayout(layout) {
    const { x1, x2, z1, z2 } = layout.roadBounds
    this.bounds = {
      x: (x1 - 2) * STEP,
      z: (z1 - 2) * STEP,
      width: (x2 - x1 + 4) * STEP,
      depth: (z2 - z1 + 4) * STEP,
    }
    this.rainCount = Math.min(
      COUNT,
      Math.max(
        1,
        Math.round((x2 - x1 + 4) * (z2 - z1 + 4) * RAIN_DROPS_PER_CELL),
      ),
    )
    this.rain.geometry.setDrawRange(0, this.rainCount * 2)
    this.height = Math.max(
      18,
      ...layout.companies.map((c) => (c.roofTop ?? c.height ?? 0) + 12),
    )
    this.cover.setLayout(layout)
  }

  updateLightning(time, enabled) {
    this.lightning.intensity = 0
    if (!enabled) {
      this.nextLightning = undefined
      this.lightningStart = undefined
      this.lightningStrokes = undefined
      return
    }
    if (this.nextLightning === undefined)
      this.nextLightning = time + 12 + this.lightningRandom() * 12
    if (time >= this.nextLightning) {
      this.lightningStart = time
      this.nextLightning = time + 18 + this.lightningRandom() * 20
      const angle = this.lightningRandom() * Math.PI * 2
      this.lightning.position.set(
        Math.cos(angle) * 80,
        100,
        Math.sin(angle) * 80,
      )
      const count = this.lightningRandom() < 0.35 ? 3 : 2
      const peak = 3.6 + this.lightningRandom() * 1.2
      let start = 0
      this.lightningStrokes = Array.from({ length: count }, (_, index) => {
        const duration = 0.08 + this.lightningRandom() * 0.06
        const stroke = {
          start,
          duration,
          peak:
            index === 0 ? peak : peak * (0.3 + this.lightningRandom() * 0.3),
        }
        start += duration + 0.06 + this.lightningRandom() * 0.16
        return stroke
      })
    }
    if (this.lightningStart === undefined) return
    const elapsed = time - this.lightningStart
    // An abrupt discharge, a brief bright hold, then rapid decay. Dark gaps
    // separate weaker return strokes; the sequence is fixed for this event.
    for (const stroke of this.lightningStrokes) {
      const age = elapsed - stroke.start
      if (age >= 0 && age < stroke.duration) {
        const decay = Math.max(0, age - 0.02) / (stroke.duration - 0.02)
        this.lightning.intensity = stroke.peak * Math.exp(-6 * decay)
        return
      }
    }
    const last = this.lightningStrokes.at(-1)
    if (elapsed >= last.start + last.duration) {
      this.lightningStart = undefined
      this.lightningStrokes = undefined
    }
  }

  update(time, type, enabled, background) {
    this.weatherType = type
    this.visible = Boolean(enabled && this.bounds && type !== 'none')
    this.rain.visible = type === 'rain'
    this.snow.visible = type === 'snow'
    this.cover.update(time, this.visible && type === 'snow')
    this.updateLightning(time, this.visible && type === 'rain')
    if (!this.visible) return
    const rain = type === 'rain'
    if (rain) {
      const luminance = background
        ? background.r * 0.2126 + background.g * 0.7152 + background.b * 0.0722
        : 1
      this.rain.material.color.lerpColors(
        rainNight,
        rainDay,
        THREE.MathUtils.clamp((luminance - 0.04) / 0.5, 0, 1),
      )
    }
    const attribute = (rain ? this.rain : this.snow).geometry.attributes
      .position
    const positions = attribute.array
    const { x, z, width, depth } = this.bounds
    for (let i = 0; i < (rain ? this.rainCount : COUNT); i++) {
      const flake = rain ? this.drops[i] : this.flakes[i]
      const px =
        x +
        fraction(flake.x + (time * (rain ? flake.windX : 0.3)) / width) * width
      const pz =
        z +
        fraction(flake.z + (time * (rain ? flake.windZ : 0.15)) / depth) * depth
      const py =
        0.25 +
        fraction(flake.phase - (time * flake.speed) / this.height) * this.height
      const offset = i * (rain ? 6 : 3)
      positions[offset] =
        px +
        (rain ? 0 : Math.sin(time * flake.frequency + flake.angle) * flake.sway)
      positions[offset + 1] = py
      positions[offset + 2] =
        pz +
        (rain
          ? 0
          : Math.cos(time * flake.frequency * 0.7 + flake.angle) * flake.sway)
      if (rain) {
        const trailTime = flake.length / flake.speed
        positions[offset + 3] = px - flake.windX * trailTime
        positions[offset + 4] = py + flake.length
        positions[offset + 5] = pz - flake.windZ * trailTime
      }
    }
    attribute.needsUpdate = true
  }
}
