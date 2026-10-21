import * as THREE from 'three'

const periods = {
  day: {
    background: '#e9ede4',
    sky: '#fff8e9',
    ground: '#8b9d8b',
    ambient: 2.5,
    sun: '#fff6df',
    sunlight: 3.1,
    position: [-60, 100, 60],
    fill: '#d8eaff',
    fillLight: 0.75,
  },
  twilight: {
    background: '#b99086',
    sky: '#ffc58e',
    ground: '#655968',
    ambient: 1.25,
    sun: '#ffae64',
    sunlight: 2.2,
    position: [-100, 25, 60],
    fill: '#a4b8ef',
    fillLight: 0.45,
  },
  night: {
    background: '#141e35',
    sky: '#9ab6ed',
    ground: '#252d45',
    ambient: 0.65,
    sun: '#a8c7ff',
    sunlight: 0.45,
    position: [-60, 100, 60],
    fill: '#779bea',
    fillLight: 0.3,
  },
}

export const LIGHTING_TRANSITION_MS = 1800
const windowTint = new THREE.Color('#ffe0a3')
const profiles = Object.fromEntries(
  Object.entries(periods).map(([name, settings]) => [
    name,
    {
      ...settings,
      ...Object.fromEntries(
        ['background', 'sky', 'ground', 'sun', 'fill'].map((key) => [
          key,
          new THREE.Color(settings[key]),
        ]),
      ),
      position: new THREE.Vector3(...settings.position),
      windowLight: name === 'day' ? 0 : 1,
    },
  ]),
)

// Date#getHours uses the browser's local clock and timezone.
export function lightingPeriod(date = new Date(), life = true, mode = 'auto') {
  if (!life) return 'day'
  if (mode !== 'auto') return mode
  const hour = date.getHours()
  if (hour < 6 || hour >= 19) return 'night'
  if (hour < 8 || hour >= 17) return 'twilight'
  return 'day'
}

export function buildLighting(city) {
  city.lights = {
    hemisphere: new THREE.HemisphereLight(),
    sun: new THREE.DirectionalLight(),
    fill: new THREE.DirectionalLight(),
  }
  city.lights.fill.position.set(80, 40, -100)
  city.scene.add(...Object.values(city.lights))
  updateLighting(city)
}

export function updateWindowLighting(city) {
  if (!city.windows) return
  const light = city.windowLight ?? 0
  city.windows.material.color.set('#ffffff').lerp(windowTint, light)
  city.windows.material.emissive.set('#ffd28a')
  city.windows.material.emissiveIntensity = light * 1.15
}

function captureLighting(city) {
  const { hemisphere, sun, fill } = city.lights
  return {
    background: city.scene.background.clone(),
    sky: hemisphere.color.clone(),
    ground: hemisphere.groundColor.clone(),
    ambient: hemisphere.intensity,
    sun: sun.color.clone(),
    sunlight: sun.intensity,
    position: sun.position.clone(),
    fill: fill.color.clone(),
    fillLight: fill.intensity,
    windowLight: city.windowLight,
  }
}

function applyLighting(city, from, to, progress) {
  const { hemisphere, sun, fill } = city.lights
  city.scene.background.lerpColors(from.background, to.background, progress)
  hemisphere.color.lerpColors(from.sky, to.sky, progress)
  hemisphere.groundColor.lerpColors(from.ground, to.ground, progress)
  hemisphere.intensity = THREE.MathUtils.lerp(
    from.ambient,
    to.ambient,
    progress,
  )
  sun.color.lerpColors(from.sun, to.sun, progress)
  sun.intensity = THREE.MathUtils.lerp(from.sunlight, to.sunlight, progress)
  sun.position.lerpVectors(from.position, to.position, progress)
  fill.color.lerpColors(from.fill, to.fill, progress)
  fill.intensity = THREE.MathUtils.lerp(from.fillLight, to.fillLight, progress)
  city.windowLight = THREE.MathUtils.lerp(
    from.windowLight,
    to.windowLight,
    progress,
  )
  updateWindowLighting(city)
}

// Use the frame clock, independently of traffic/effects and reduced motion.
// A color fade does not move the camera or the city.
export function advanceLighting(city, now) {
  const transition = city.lightingTransition
  if (!transition) return false
  const progress = THREE.MathUtils.clamp(
    (now - transition.start) / LIGHTING_TRANSITION_MS,
    0,
    1,
  )
  const eased = progress * progress * (3 - 2 * progress)
  applyLighting(city, transition.from, transition.to, eased)
  if (progress === 1) city.lightingTransition = null
  return true
}

export function updateLighting(
  city,
  date = new Date(),
  now = performance.now(),
) {
  const period = lightingPeriod(date, city.life, city.lightingMode)
  if (city.lightingPeriod === period) return false
  const target = profiles[period]
  if (city.lightingPeriod === undefined) {
    // The first frame already starts at the correct local time.
    applyLighting(city, target, target, 1)
  } else {
    // Retarget from the current blend if the user changes modes mid-fade.
    advanceLighting(city, now)
    city.lightingTransition = {
      from: captureLighting(city),
      to: target,
      start: now,
    }
  }
  city.lightingPeriod = period
  return true
}
