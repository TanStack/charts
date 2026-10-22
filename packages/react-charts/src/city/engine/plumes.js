const fract = (n) => n - Math.floor(n)
export const hash = (n) => fract(Math.sin(n * 127.1 + 311.7) * 43758.5453)

export function facadeWindows(company, size, width, depth) {
  const windows = []
  for (let floor = 0; floor < size.floors; floor++)
    for (let j = 0; j < 2; j++) {
      const offset = (j - 0.5) * 0.62,
        y = 0.52 + floor * (company.height / size.floors)
      windows.push({
        index: windows.length,
        x: company.x + offset,
        y,
        z: company.z + depth / 2,
        nx: 0,
        nz: 1,
        width: 0.25,
        height: 0.35,
      })
      windows.push({
        index: windows.length,
        x: company.x + width / 2,
        y,
        z: company.z + offset,
        nx: 1,
        nz: 0,
        width: 0.25,
        height: 0.35,
      })
    }
  return windows
}

export function windowEmitters(company, windows) {
  if (company.status === 'healthy') return []
  const critical = company.status === 'critical'
  const floors = new Set(windows.map((w) => w.y)).size
  const count = Math.min(
    windows.length,
    critical
      ? company.house
        ? 2
        : 6
      : company.house
        ? 1
        : Math.max(2, Math.ceil(floors * 0.75)),
  )
  return Array.from({ length: count }, (_, i) => {
    const index = critical
      ? Math.floor((i * windows.length) / count) + (i % 2)
      : Math.floor((i * (floors - 1)) / Math.max(1, count - 1)) * 4 + (i % 4)
    const aperture = windows[Math.min(windows.length - 1, index)]
    // Origin is behind the facade; the building depth test hides the interior.
    const seed =
      hash(company.x * 13 + company.z * 71 + aperture.index * 17) * 100
    return {
      ...aperture,
      company: company.id,
      critical,
      seed,
      depth: 0.075,
      flameLife: 1.25,
      smokeLife: critical ? 5.2 : 5.8,
      rate: aperture.width * aperture.height * (critical ? 225 : 34),
    }
  })
}

// An inexpensive buoyant jet approximation: pressure drives the initial outward
// velocity, drag dissipates it, buoyancy bends the stream upward. This is not CFD.
// All births fit the aperture; expansion starts only outside the opening.
export function samplePlume(emitter, age, seed, kind = 'flame') {
  const smoke = kind === 'smoke',
    critical = emitter.critical
  const life = smoke ? emitter.smokeLife : emitter.flameLife,
    t = Math.max(0, Math.min(age, life))
  const a = hash(seed + 11),
    b = hash(seed + 23),
    c = hash(seed + 37)
  const drag = smoke ? 0.75 : 1.15,
    velocity = (critical ? 1.05 : 0.55) * (0.8 + a * 0.4)
  const out = -emitter.depth + (velocity * (1 - Math.exp(-drag * t))) / drag
  const outside = Math.max(0, out)
  const force = smoke ? (critical ? 1.65 : 0.92) : 3.2
  const rise =
    0.07 * t + force * (t / drag - (1 - Math.exp(-drag * t)) / (drag * drag))
  const apertureRadius = Math.min(emitter.width, emitter.height) * 0.13
  const initialSide = (b - 0.5) * (emitter.width - 2 * apertureRadius) * 0.66
  const initialY = (c - 0.5) * (emitter.height - 2 * apertureRadius) * 0.55
  let tangent =
    initialSide +
    outside * Math.sin(t * (smoke ? 3.1 : 11) + seed) * (smoke ? 0.22 : 0.1)
  let y = initialY + rise
  if (out < 0.035) {
    tangent = Math.max(
      -emitter.width * 0.34,
      Math.min(emitter.width * 0.34, tangent),
    )
    y = Math.max(-emitter.height * 0.3, Math.min(emitter.height * 0.3, y))
  }
  const expansion = smoke
    ? outside * 0.27 + Math.max(0, t - 0.35) * 0.15
    : outside * 0.16 * Math.sin(Math.PI * Math.min(0.98, t / life))
  const radius = out < 0.035 ? apertureRadius : apertureRadius + expansion
  const wind = smoke ? Math.pow(Math.max(0, t - 0.15), 1.35) : 0
  const heat = Math.pow(Math.max(0, 1 - t / life), 0.65)
  const alpha =
    (smoke ? (critical ? 0.35 : 0.23) : 0.84) *
    Math.min(1, t / (smoke ? 0.18 : 0.055)) *
    Math.pow(Math.max(0, 1 - t / life), smoke ? 0.7 : 0.6)
  return {
    x: emitter.x + emitter.nx * out - emitter.nz * tangent + wind * 0.035,
    y: emitter.y + y,
    z: emitter.z + emitter.nz * out + emitter.nx * tangent + wind * 0.018,
    radius,
    length: out < 0.035 ? apertureRadius : radius * (smoke ? 1.1 : 2.4),
    alpha,
    heat,
    vx: emitter.nx * velocity * Math.exp(-drag * t),
    vy: 0.07 + (force * (1 - Math.exp(-drag * t))) / drag,
    vz: emitter.nz * velocity * Math.exp(-drag * t),
    outward: out,
  }
}

export function makeParticles(emitters, kind) {
  const smoke = kind === 'smoke',
    particles = []
  for (const source of emitters) {
    if (!smoke && !source.critical) continue
    const life = smoke ? source.smokeLife : source.flameLife
    const rate = smoke
      ? source.width * source.height * (source.critical ? 55 : 45)
      : source.rate
    const count = Math.max(8, Math.ceil(rate * life))
    for (let i = 0; i < count; i++)
      particles.push({
        source,
        seed: source.seed + i * 3.17,
        phase: (i / count) * life,
        life,
      })
  }
  return particles
}
