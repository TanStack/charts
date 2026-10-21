import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { disposeSceneGroups } from './scene-resources.js'
import { SelectionHighlight } from './selection-highlight.js'
import { REGIONS, metricFor } from './model.js'
import { buildTerrain } from '../three/terrain.js'
import { buildBuildings } from '../three/buildings.js'
import { buildTraffic, updateTraffic } from '../three/traffic.js'
import { buildEffects, updateEffects } from '../three/effects.js'
import { CityWeather } from '../three/weather.js'
import {
  advanceLighting,
  buildLighting,
  updateLighting,
} from '../three/lighting.js'

const ISO_POLAR = Math.acos(1 / Math.sqrt(3))
export class City {
  constructor(container, callbacks = {}) {
    this.container = container
    this.callbacks = callbacks
    this.palettes = new Map(
      REGIONS.map((r) => [r.mask, new THREE.Color(r.color)]),
    )
    this.active = new Set()
    this.life = true
    this.lightingMode = 'auto'
    this.effects = true
    this.autoRotate = false
    this.weather = 'none'
    this.running = true
    this.elapsed = 0
    this.previous = 0
    this.cameraRevision = 0
    this.animationId = null
    this.animate = this.animate.bind(this)
    this.reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color('#e9ede4')
    this.camera = new THREE.OrthographicCamera(-110, 110, 90, -90, 0.1, 800)
    this.camera.position.set(160, 160, 160)
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.22
    container.appendChild(this.renderer.domElement)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.075
    this.controls.minPolarAngle = ISO_POLAR
    this.controls.maxPolarAngle = ISO_POLAR
    this.controls.minZoom = 0.45
    this.controls.maxZoom = 12
    this.controls.zoomSpeed = 0.85
    this.controls.rotateSpeed = 0.5
    this.controls.autoRotateSpeed = -0.3 // Clockwise, one revolution in about 200 seconds.
    this.controls.screenSpacePanning = true
    this.controls.target.set(0, 0, 5)
    this.controls.update()
    buildLighting(this)
    this.terrain = new THREE.Group()
    this.scene.add(this.terrain)
    this.buildings = new THREE.Group()
    this.scene.add(this.buildings)
    this.raycaster = new THREE.Raycaster()
    this.pointer = new THREE.Vector2()
    this.selection = new SelectionHighlight()
    this.scene.add(this.selection)
    this.onCameraChange = () => {
      this.cameraRevision++
      this.invalidate()
    }
    this.controls.addEventListener('change', this.onCameraChange)
    this.observer = new ResizeObserver(() => this.resize())
    this.observer.observe(container)
    this.resize()
    this.onVisibility = () => {
      this.previous = 0
      this.refreshLighting()
      this.invalidate()
    }
    document.addEventListener('visibilitychange', this.onVisibility)
    this.syncLightingClock()
    this.invalidate()
  }
  resize() {
    const w = this.container.clientWidth,
      h = this.container.clientHeight
    if (!w || !h) return
    const sizeKey = `${w}:${h}:${this.homeHalf}`
    if (this.sizeKey === sizeKey) return
    this.sizeKey = sizeKey
    const aspect = w / h
    const half =
      aspect < 1 ? (this.homeHalf ?? 32) / aspect : (this.homeHalf ?? 32)
    this.camera.left = -half * aspect
    this.camera.right = half * aspect
    this.camera.top = half
    this.camera.bottom = -half
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
    this.cameraRevision++
    this.invalidate()
  }
  buildTerrain() {
    buildTerrain(this)
  }
  setCompanies(companies, layout, { colors } = {}) {
    if (colors)
      for (const [mask, color] of colors)
        this.palettes.set(mask, new THREE.Color(color))
    this.layout = layout
    this.homeHalf = Math.max(
      18,
      Math.max(
        layout.roadBounds.x2 - layout.roadBounds.x1,
        layout.roadBounds.z2 - layout.roadBounds.z1,
      ) *
        2.8 *
        0.7,
    )
    this.resize()
    disposeSceneGroups([this.terrain, this.traffic, this.buildings])
    if (this.traffic) this.scene.remove(this.traffic)
    this.renderer.renderLists.dispose()
    this.warningTexture = null
    this.plumes = null
    this.simulation = null
    this.body = null
    this.windows = null
    this.windowGlow = null
    this.warning = null
    this.criticalSurfaces = []
    this.cars = null
    this.carTops = null
    this.walkers = null
    this.heads = null
    this.signalLamps = null
    this.emitters = []
    this.warningSources = []
    this.lampItems = []
    this.companies = []
    this.buildTerrain()
    this.buildTraffic()
    this.companies = companies
    this.active = new Set(companies.map((c) => c.id))
    this.companiesById = new Map(companies.map((c) => [c.id, c]))
    buildBuildings(this, companies)
    this.weatherParticles?.setLayout(layout)
    this.buildEffects()
    this.selectedId = null
    this.selection.visible = false
    this.invalidate()
  }
  // Topology owns terrain/traffic. Metrics and health own only buildings/effects.
  // The caller supplies private rows, so Three.js never mutates ChartPoint.datum.
  updateCompanies(layout, colors) {
    const next = layout.companies
    const topologyChanged =
      !this.layout ||
      ['x1', 'x2', 'z1', 'z2'].some(
        (k) => this.layout.roadBounds[k] !== layout.roadBounds[k],
      ) ||
      next.length !== this.companies.length ||
      next.some((c, i) =>
        ['id', 'mask', 'x', 'z', 'col', 'row'].some(
          (k) => c[k] !== this.companies[i][k],
        ),
      )
    if (topologyChanged) {
      this.setCompanies(next, layout, { colors })
      return true
    }
    const buildingsChanged = next.some(
      (c, i) =>
        metricFor(c).value !== metricFor(this.companies[i]).value ||
        c.status !== this.companies[i].status,
    )
    for (const [mask, color] of colors)
      this.palettes.set(mask, new THREE.Color(color))
    if (buildingsChanged) {
      disposeSceneGroups([this.buildings])
      this.renderer.renderLists.dispose()
      this.warningTexture = null
      this.companies = next
      buildBuildings(this, next)
      this.buildEffects()
    } else {
      next.forEach((c, i) => Object.assign(this.companies[i], c))
      // Preserve per-building shading and the current critical blink phase.
      for (const item of this.body.userData.items) {
        const company = this.companiesById.get(item.company)
        item.color
          .copy(this.palettes.get(company.mask))
          .multiplyScalar(item.shade)
      }
      this.body.userData.items.forEach((item, i) =>
        this.body.setColorAt(i, item.color),
      )
      if (this.body.instanceColor) this.body.instanceColor.needsUpdate = true
      for (const surface of this.criticalSurfaces)
        for (const item of surface.items) {
          item.color.copy(this.body.userData.items[item.index].color)
          item.lastRed = undefined
        }
    }
    this.effectsKey = null
    this.layout = { ...layout, companies: this.companies }
    this.weatherParticles?.setLayout(this.layout)
    this.companiesById = new Map(this.companies.map((c) => [c.id, c]))
    this.select(this.companiesById.get(this.selectedId))
    this.invalidate()
    return false
  }
  buildEffects() {
    buildEffects(this)
  }
  updateEffects(t) {
    updateEffects(this, t)
  }
  buildTraffic() {
    buildTraffic(this)
  }
  updateTraffic(dt) {
    updateTraffic(this, dt)
  }
  pick(e) {
    if (!this.body) return null
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      (-(e.clientY - rect.top) / rect.height) * 2 + 1,
    )
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const hit = this.raycaster
      .intersectObject(this.body, false)
      .find(
        (h) =>
          h.instanceId !== undefined &&
          this.active.has(this.companies[h.instanceId].id),
      )
    return hit ? this.companies[hit.instanceId] : null
  }
  select(c) {
    this.selectedId = c?.id ?? null
    if (c) this.selection.select(c)
    else this.selection.visible = false
    this.invalidate()
  }
  focus(c, { maxZoom = false } = {}) {
    this.select(c)
    const direction = this.camera.position
      .clone()
      .sub(this.controls.target)
      .normalize()
    const target = new THREE.Vector3(c.x, c.height * 0.45, c.z)
    this.fly = {
      fromPosition: this.camera.position.clone(),
      toPosition: target.clone().add(direction.multiplyScalar(180)),
      fromTarget: this.controls.target.clone(),
      toTarget: target,
      fromZoom: this.camera.zoom,
      toZoom: maxZoom
        ? this.controls.maxZoom
        : Math.min(5, Math.max(1.8, this.homeHalf / 15)),
      start: performance.now(),
    }
    this.invalidate?.()
  }
  view(mode = 'iso', immediate = false) {
    // Flush pending drag damping so it cannot offset the restored view.
    const damping = this.controls.enableDamping
    this.controls.enableDamping = false
    this.controls.update()
    this.controls.enableDamping = damping
    const [x, z] = this.layout?.center ?? [0, 0]
    const target = new THREE.Vector3(x, 0, z),
      pos =
        mode === 'top'
          ? new THREE.Vector3(x, 230, z + 0.001)
          : new THREE.Vector3(x + 160, 160, z + 160)
    // Dragging changes azimuth only; the view buttons choose the fixed elevation.
    this.controls.minPolarAngle = this.controls.maxPolarAngle =
      mode === 'top' ? 1e-6 : ISO_POLAR
    if (immediate) {
      this.fly = null
      this.camera.position.copy(pos)
      this.camera.zoom = 1
      this.controls.target.copy(target)
      this.controls.update()
      this.camera.updateProjectionMatrix()
      this.camera.updateMatrixWorld()
      this.cameraRevision = (this.cameraRevision ?? 0) + 1
      this.invalidate?.()
      return
    }
    this.fly = {
      fromPosition: this.camera.position.clone(),
      toPosition: pos,
      fromTarget: this.controls.target.clone(),
      toTarget: target,
      fromZoom: this.camera.zoom,
      toZoom: 1,
      start: performance.now(),
    }
    this.invalidate?.()
  }
  zoom(factor) {
    this.fly = null
    this.camera.zoom = THREE.MathUtils.clamp(
      this.camera.zoom * factor,
      0.45,
      12,
    )
    this.camera.updateProjectionMatrix()
    this.cameraRevision++
    this.invalidate()
  }
  project(x, y, z) {
    return new THREE.Vector3(x, y, z).project(this.camera)
  }
  dispose() {
    this.running = false
    clearInterval(this.lightingTimer)
    cancelAnimationFrame(this.animationId)
    this.observer.disconnect()
    this.controls.removeEventListener('change', this.onCameraChange)
    this.controls.dispose()
    document.removeEventListener('visibilitychange', this.onVisibility)
    disposeSceneGroups([this.scene])
    this.renderer.renderLists.dispose()
    this.renderer.dispose()
    this.renderer.forceContextLoss()
    this.renderer.domElement.remove()
    this.callbacks = {}
  }
  // At most one pending frame. Static scenes sleep until an explicit change.
  invalidate() {
    if (!this.running) return
    this.dirty = true
    if (this.animationId === null && !document.hidden)
      this.animationId = requestAnimationFrame(this.animate)
  }
  setActivity({ life = this.life, effects = this.effects }) {
    if (this.life === life && this.effects === effects) return
    this.life = life
    this.effects = effects
    this.refreshLighting()
    this.syncLightingClock()
    if (this.traffic) this.traffic.visible = life
    this.previous = 0
    this.invalidate()
  }
  setAutoRotate(enabled) {
    if (this.autoRotate === enabled) return
    this.autoRotate = enabled
    this.previous = 0
    this.invalidate()
  }
  refreshLighting() {
    if (updateLighting(this)) this.invalidate()
  }
  setWeather(type = 'none') {
    if (!['none', 'rain', 'snow'].includes(type))
      throw new RangeError(`Unknown weather type: ${type}`)
    if (this.weather === type) return
    this.weather = type
    if (type !== 'none' && !this.weatherParticles) {
      this.weatherParticles = new CityWeather()
      this.scene.add(this.weatherParticles)
      if (this.layout) this.weatherParticles.setLayout(this.layout)
    }
    this.invalidate()
  }
  setLightingMode(mode = 'auto') {
    if (!['auto', 'day', 'twilight', 'night'].includes(mode))
      throw new RangeError(`Unknown lighting mode: ${mode}`)
    if (this.lightingMode === mode) return
    this.lightingMode = mode
    this.refreshLighting()
    this.syncLightingClock()
  }
  syncLightingClock() {
    clearInterval(this.lightingTimer)
    this.lightingTimer =
      this.life && this.lightingMode === 'auto'
        ? setInterval(() => {
            if (!document.hidden) this.refreshLighting()
          }, 60_000)
        : null
  }
  animate(now) {
    this.animationId = null
    if (!this.running) return
    if (document.hidden) {
      this.previous = now
      return
    }
    const dirty = this.dirty
    this.dirty = false
    const elapsedSeconds = (now - (this.previous || now)) / 1000
    const dt = Math.min(elapsedSeconds, 0.05)
    this.previous = now
    if (!this.reduceMotion) this.elapsed += dt
    const flying = Boolean(this.fly)
    if (this.fly) {
      const f = this.fly
      // A RAF timestamp can precede a transition created later in that frame.
      // Negative progress overshoots the easing curve, especially at 1 ms.
      let t = THREE.MathUtils.clamp(
        (now - f.start) / (this.reduceMotion ? 1 : 850),
        0,
        1,
      )
      t = t * t * (3 - 2 * t)
      this.camera.position.lerpVectors(f.fromPosition, f.toPosition, t)
      this.controls.target.lerpVectors(f.fromTarget, f.toTarget, t)
      this.camera.zoom = THREE.MathUtils.lerp(f.fromZoom, f.toZoom, t)
      this.camera.updateProjectionMatrix()
      this.cameraRevision++
      if (t >= 1) this.fly = null
    }
    // Explicit opt-in also works with reduced motion. OrbitControls pauses
    // while dragging; camera flights and pagination take precedence as well.
    this.controls.autoRotate = Boolean(
      this.autoRotate && !flying && this.controls.enabled,
    )
    const cameraMoved = this.controls.update(elapsedSeconds)
    this.controls.autoRotate = false
    const lightingChanged = advanceLighting(this, now)
    const trafficAnimated = !this.reduceMotion && this.life && this.simulation
    const weatherAnimated =
      !this.reduceMotion && this.life && this.weather !== 'none'
    this.weatherParticles?.update(
      this.elapsed,
      this.weather,
      weatherAnimated,
      this.scene.background,
    )
    const effectsAnimated =
      !this.reduceMotion &&
      this.effects &&
      (this.emitters?.length ||
        this.warningSources?.length ||
        this.criticalSurfaces?.some((s) => s.items.length))
    if (trafficAnimated) this.updateTraffic(dt)
    if (dirty || lightingChanged || effectsAnimated || cameraMoved)
      this.updateEffects(this.elapsed)
    this.camera.updateMatrixWorld()
    this.callbacks.frame?.(this)
    this.renderer.render(this.scene, this.camera)
    if (
      this.fly ||
      (this.autoRotate && this.controls.enabled) ||
      this.lightingTransition ||
      cameraMoved ||
      trafficAnimated ||
      weatherAnimated ||
      effectsAnimated
    )
      this.invalidate()
    else this.previous = 0
  }
}
