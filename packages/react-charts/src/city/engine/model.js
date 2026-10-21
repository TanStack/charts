import { normalizeCompanyDates } from './lib/company-dates.js'

export const REGIONS = [
  {
    mask: 1,
    label: 'Category A',
    shortLabel: 'A',
    color: '#4b91ef',
    name: 'Only Category A',
  },
  {
    mask: 2,
    label: 'Category B',
    shortLabel: 'B',
    color: '#e281af',
    name: 'Only Category B',
  },
  {
    mask: 4,
    label: 'Category C',
    shortLabel: 'C',
    color: '#ecc456',
    name: 'Only Category C',
  },
  {
    mask: 3,
    label: 'Category A + Category B',
    shortLabel: 'A + B',
    color: '#ab7cdd',
    name: 'Category A e Category B',
  },
  {
    mask: 5,
    label: 'Category A + Category C',
    shortLabel: 'A + C',
    color: '#47b8b2',
    name: 'Category A e Category C',
  },
  {
    mask: 6,
    label: 'Category B + Category C',
    shortLabel: 'B + C',
    color: '#e99b55',
    name: 'Category B e Category C',
  },
  {
    mask: 7,
    label: 'Category A + Category B + Category C',
    shortLabel: 'A + B + C',
    color: '#7777ca',
    name: 'Todos os sistemas',
  },
]
export const STATUS = {
  healthy: { label: 'Saudável', color: '#4c9878' },
  warning: { label: 'Risco médio', color: '#c28b29' },
  critical: { label: 'Alto risco', color: '#db654d' },
}
export function random(seed) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}
export function membership(x, z) {
  return (
    (x >= -18 && x <= 18 && z >= -23 && z <= 7 ? 1 : 0) |
    (x >= -29 && x <= 5 && z >= -6 && z <= 26 ? 2 : 0) |
    (x >= -5 && x <= 29 && z >= -6 && z <= 26 ? 4 : 0)
  )
}
export function isPark(x, z) {
  const n = Math.imul(x + 59, 7349) ^ Math.imul(z + 41, 9157)
  return (n >>> 0) % 100 < 9
}
export function lots() {
  const result = []
  for (let z = -23; z <= 26; z++)
    for (let x = -29; x <= 29; x++) {
      const mask = membership(x, z)
      if (mask && x % 6 !== 0 && z % 6 !== 0 && !isPark(x, z))
        result.push({ x: x * 2.8, z: z * 2.8, mask, col: x, row: z })
    }
  return result
}
const names = [
  'Aurora',
  'Horizonte',
  'Nexo',
  'Vértice',
  'Alameda',
  'Órbita',
  'Cedro',
  'Prisma',
  'Farol',
  'Solare',
  'Brisa',
  'Íris',
  'Ponte',
  'Lume',
  'Atlas',
  'Verde',
]
const sectors = [
  'Tecnologia',
  'Logística',
  'Educação',
  'Saúde',
  'Varejo',
  'Serviços',
  'Indústria',
  'Finanças',
]
export function demoCompanies(count = 1400) {
  const rng = random(8419)
  const pool = lots()
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  const chosen = pool.slice(0, Math.min(count, pool.length))
  return chosen.map((lot, i) => {
    const risk = rng()
    return {
      id: `empresa-${i + 1}`,
      name: `${names[i % names.length]} ${sectors[Math.floor(i / names.length) % sectors.length]} ${String(i + 1).padStart(4, '0')}`,
      users: Math.round(8 + Math.pow(rng(), 3) * 4200),
      status: risk < 0.024 ? 'critical' : risk < 0.1 ? 'warning' : 'healthy',
      ...lot,
    }
  })
}
export function sizeForValue(value) {
  return value < 90
    ? { height: 0.95, floors: 1, house: true }
    : value < 550
      ? { height: 2.4, floors: 2, house: false }
      : value < 1800
        ? { height: 4.3, floors: 4, house: false }
        : { height: 7.2, floors: 6, house: false }
}
// Compatibility for integrations using the previous helper name.
export const sizeForUsers = sizeForValue
export function filteredCompanies(
  companies,
  { region = 'all', status = 'all', query = '' } = {},
) {
  const q = query.trim().toLocaleLowerCase('pt-BR')
  // Keep single-status callers compatible; an empty selection means all.
  const statuses = Array.isArray(status)
    ? status
    : status === 'all'
      ? []
      : [status]
  return companies.filter(
    (c) =>
      (region === 'all' || c.mask === Number(region)) &&
      (!statuses.length || statuses.includes(c.status)) &&
      (!q || c.name.toLocaleLowerCase('pt-BR').includes(q)),
  )
}
// Legacy records remain readable; all visual consumers use the generic metric.
export function metricFor(record) {
  return record.metric ?? { label: 'Usuários', value: record.users }
}
export function categoryLabel(record) {
  return (
    record.categories?.map((category) => category.label).join(' + ') ??
    REGIONS.find((region) => region.mask === record.mask)?.label ??
    ''
  )
}
export function metricLabel(records) {
  const labels = new Set(records.map((record) => metricFor(record).label))
  return labels.size === 1 ? [...labels][0] : 'Valor'
}
export function regionsFor(records) {
  const labels = new Map()
  for (const record of records) {
    const bits = [1, 2, 4].filter((bit) => record.mask & bit)
    record.categories?.forEach((category, index) =>
      labels.set(bits[index], category.label),
    )
  }
  if (!labels.size) return records.length ? REGIONS : []
  return REGIONS.filter((region) =>
    [1, 2, 4].every((bit) => !(region.mask & bit) || labels.has(bit)),
  ).map((region) => {
    const label = [1, 2, 4]
      .filter((bit) => region.mask & bit)
      .map((bit) => labels.get(bit))
      .join(' + ')
    return { ...region, label, shortLabel: label, name: label }
  })
}
export function placeCompanies(records) {
  if (!Array.isArray(records) || !records.length)
    throw new Error('O arquivo deve conter uma lista de empresas.')
  const ids = new Set()
  const labels = new Map()
  let hasLegacy = false
  const normalized = records.map((r, i) => {
    if (!r || typeof r.name !== 'string' || !r.name.trim())
      throw new Error(`Empresa ${i + 1}: informe um nome.`)
    const metric = metricFor(r)
    if (
      typeof metric.label !== 'string' ||
      !metric.label.trim() ||
      !Number.isFinite(metric.value) ||
      metric.value < 0
    )
      throw new Error(
        `Empresa ${i + 1}: metric deve conter label e value numérico não negativo.`,
      )
    let categories = r.categories
    if (categories === undefined) {
      hasLegacy = true
      if (
        !Array.isArray(r.systems) ||
        !r.systems.length ||
        r.systems.some((value) => !['A', 'B', 'C'].includes(value))
      )
        throw new Error(`Empresa ${i + 1}: sistemas deve conter A, B ou C.`)
      categories = [...new Set(r.systems)].map((value) => ({
        value,
        label: REGIONS.find(
          (region) => region.mask === { A: 1, B: 2, C: 4 }[value],
        ).label,
      }))
    }
    if (!Array.isArray(categories) || !categories.length)
      throw new Error(`Empresa ${i + 1}: informe ao menos uma categoria.`)
    const unique = new Map()
    for (const category of categories) {
      if (
        !category ||
        typeof category.value !== 'string' ||
        !category.value.trim() ||
        typeof category.label !== 'string' ||
        !category.label.trim()
      )
        throw new Error(
          `Empresa ${i + 1}: cada categoria deve conter label e value textuais não vazios.`,
        )
      const value = category.value.trim(),
        label = category.label.trim()
      if (labels.has(value) && labels.get(value) !== label)
        throw new Error(`Categoria ${value}: use o mesmo label em toda a base.`)
      labels.set(value, label)
      unique.set(value, { value, label })
    }
    if (!Object.hasOwn(STATUS, r.status))
      throw new Error(`Empresa ${i + 1}: status inválido.`)
    const id = String(r.id ?? `importada-${i + 1}`)
    if (!id.trim() || ids.has(id))
      throw new Error('Há identificadores vazios ou repetidos no arquivo.')
    ids.add(id)
    return {
      id,
      name: r.name.trim(),
      metric: { label: metric.label.trim(), value: metric.value },
      categories: [...unique.values()],
      status: r.status,
      ...normalizeCompanyDates(r, i),
      ...(r.metric === undefined ? { users: r.users } : {}),
    }
  })
  const values = hasLegacy
    ? [...new Set(['A', 'B', 'C', ...labels.keys()])]
    : [...labels.keys()].sort()
  if (values.length > 3)
    throw new Error('O mapa aceita até três categorias distintas por base.')
  const bits = new Map(values.map((value, index) => [value, 1 << index]))
  return normalized.map((record) => ({
    ...record,
    categories: record.categories.sort(
      (a, b) => bits.get(a.value) - bits.get(b.value),
    ),
    mask: record.categories.reduce(
      (mask, category) => mask | bits.get(category.value),
      0,
    ),
  }))
}
export const PAGE_SIZE = 100
export const PAGE_SIZES = [100, 250, 500, 1000, 'all']
export const ROAD_EVERY = 4
export function paginateCompanies(
  companies,
  filters = {},
  page = 1,
  pageSize = PAGE_SIZE,
) {
  const matching = filteredCompanies(companies, filters),
    total = matching.length
  if (!PAGE_SIZES.includes(pageSize))
    throw new Error('Tamanho de página inválido.')
  const limit = pageSize === 'all' ? Math.max(1, total) : pageSize
  const pages = Math.max(1, Math.ceil(total / limit))
  const current = Math.max(1, Math.min(pages, Math.floor(page) || 1))
  return {
    companies: matching.slice((current - 1) * limit, current * limit),
    total,
    pages,
    page: current,
    pageSize,
    start: total ? (current - 1) * limit + 1 : 0,
    end: Math.min(current * limit, total),
  }
}
function boundsFor(p) {
  return {
    a: { x1: -p.cx - p.ab, x2: p.cx + p.ac, z1: -p.cz - p.a, z2: p.cz },
    b: { x1: -p.cx - p.ab - p.b, x2: p.cx, z1: -p.cz, z2: p.cz + p.bc },
    c: { x1: -p.cx, x2: p.cx + p.ac + p.c, z1: -p.cz, z2: p.cz + p.bc },
  }
}
export function layoutMembership(x, z, bounds) {
  const inRect = (r) => x >= r.x1 && x <= r.x2 && z >= r.z1 && z <= r.z2
  return (
    (inRect(bounds.a) ? 1 : 0) |
    (inRect(bounds.b) ? 2 : 0) |
    (inRect(bounds.c) ? 4 : 0)
  )
}
export function layoutCity(records) {
  const needed = new Map(
    REGIONS.map((r) => [
      r.mask,
      records.filter((c) => c.mask === r.mask).length,
    ]),
  )
  const core = Math.max(
    1,
    Math.ceil(Math.sqrt(Math.max(0, ...needed.values())) / 2),
  )
  const p = { cx: core, cz: core, a: 1, b: 1, c: 1, ab: 1, ac: 1, bc: 1 }
  let bounds, buckets
  for (let attempt = 0; attempt < 250; attempt++) {
    bounds = boundsFor(p)
    buckets = new Map(REGIONS.map((r) => [r.mask, []]))
    for (let z = bounds.a.z1; z <= bounds.b.z2; z++)
      for (let x = bounds.b.x1; x <= bounds.c.x2; x++) {
        const mask = layoutMembership(x, z, bounds)
        if (
          mask &&
          x % ROAD_EVERY !== 0 &&
          z % ROAD_EVERY !== 0 &&
          !isPark(x, z)
        )
          buckets
            .get(mask)
            .push({ x: x * 2.8, z: z * 2.8, col: x, row: z, mask })
      }
    const missing = REGIONS.filter(
      (r) => buckets.get(r.mask).length < needed.get(r.mask),
    )
    if (!missing.length) break
    for (const r of missing) {
      if (r.mask === 7) {
        p.cx++
        p.cz++
      } else p[{ 1: 'a', 2: 'b', 4: 'c', 3: 'ab', 5: 'ac', 6: 'bc' }[r.mask]]++
    }
  }
  // Within each exact intersection, populate the nearest free lots first.
  for (const pool of buckets.values())
    pool.sort(
      (a, b) =>
        a.col * a.col + a.row * a.row - (b.col * b.col + b.row * b.row) ||
        a.row - b.row ||
        a.col - b.col,
    )
  const placed = records.map((record) => {
    const lot = buckets.get(record.mask).shift()
    if (!lot) throw new Error('Não foi possível distribuir esta página.')
    return { ...record, ...lot }
  })
  const roadBounds = placed.length
    ? {
        x1:
          Math.floor((Math.min(...placed.map((c) => c.col)) - 2) / ROAD_EVERY) *
          ROAD_EVERY,
        x2:
          Math.ceil((Math.max(...placed.map((c) => c.col)) + 2) / ROAD_EVERY) *
          ROAD_EVERY,
        z1:
          Math.floor((Math.min(...placed.map((c) => c.row)) - 2) / ROAD_EVERY) *
          ROAD_EVERY,
        z2:
          Math.ceil((Math.max(...placed.map((c) => c.row)) + 2) / ROAD_EVERY) *
          ROAD_EVERY,
      }
    : { x1: -4, x2: 4, z1: -4, z2: 4 }
  const anchors = {}
  for (const r of REGIONS) {
    const group = placed.filter((c) => c.mask === r.mask)
    if (group.length)
      anchors[r.mask] = [
        group.reduce((v, c) => v + c.x, 0) / group.length,
        2,
        group.reduce((v, c) => v + c.z, 0) / group.length,
      ]
  }
  return {
    companies: placed,
    bounds,
    roadBounds,
    anchors,
    center: [
      (roadBounds.x1 + roadBounds.x2) * 1.4,
      (roadBounds.z1 + roadBounds.z2) * 1.4,
    ],
  }
}
