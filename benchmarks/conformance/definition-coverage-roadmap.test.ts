import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { loadTanStackSources } from './native-catalog'

interface RoadmapWork {
  kind: string
  stage: string
  owner: string
  coordinateSpace: string
  sources: string[]
  dependencies?: string[]
  summary: string
}

interface RoadmapCase {
  id: string
  coverage: string
  disposition: string
  phase: string
  status: string
  capabilities: string[]
  evidence?: string[]
  work: RoadmapWork[]
}

interface RoadmapCapability {
  id: string
  title: string
  kind: string
  tier: string
  phase: string
  status: string
  dependsOn: string[]
  frictionIds: string[]
  entryPoint?: string
  bundleFixture?: string
  reason?: string
  evidence?: string[]
}

interface Roadmap {
  schemaVersion: number
  audit: string
  plan: string
  overview: string
  phases: { id: string; order: number; title: string }[]
  capabilities: RoadmapCapability[]
  cases: RoadmapCase[]
}

const directory = dirname(fileURLToPath(import.meta.url))
const repositoryRoot = resolve(directory, '../..')
const roadmapPath = resolve(directory, 'definition-coverage-roadmap.json')
const roadmap = JSON.parse(readFileSync(roadmapPath, 'utf8')) as Roadmap
const audit = readFileSync(resolve(directory, roadmap.audit), 'utf8')
const overview = readFileSync(resolve(directory, roadmap.overview), 'utf8')
const frictionLog = readFileSync(
  resolve(repositoryRoot, 'API-FRICTION.md'),
  'utf8',
)

const allowedCoverage = new Set([
  'declarative',
  'prepared',
  'custom-render',
  'app-composed',
])
const allowedDispositions = new Set([
  'definition-now',
  'first-party-primitive',
  'optional-primitive',
  'application-boundary',
  'inline-custom-mark',
])
const allowedCapabilityStatuses = new Set([
  'planned',
  'active',
  'available',
  'verified',
  'deferred',
])
const allowedCaseStatuses = new Set([
  'planned',
  'active',
  'verified',
  'accepted-boundary',
])
const allowedOwners = new Set(['charts', 'd3', 'case', 'application'])
const allowedStages = new Set([
  'before-definition',
  'definition-builder',
  'resolved-layout',
  'mark-render',
  'post-render',
])
const allowedCoordinateSpaces = new Set([
  'none',
  'data',
  'outer-scene',
  'resolved-plot',
  'dom',
])
const allowedWorkKinds = new Set([
  'data-transform',
  'data-space-layout',
  'responsive-pixel-layout',
  'custom-mark',
  'application-overlay',
  'application-shell',
  'interaction-controller',
  'low-level-renderer',
  'definition-composition',
])
const dispositionByLabel: Record<string, string> = {
  'Definition now': 'definition-now',
  'First-party primitive': 'first-party-primitive',
  'Optional primitive': 'optional-primitive',
  'Application boundary': 'application-boundary',
  'Inline custom mark': 'inline-custom-mark',
}

describe('definition coverage roadmap', () => {
  it('tracks every catalog directory exactly once with stable dispositions', () => {
    expect(roadmap.schemaVersion).toBe(1)
    expect(existsSync(resolve(directory, roadmap.plan))).toBe(true)
    expect(existsSync(resolve(directory, roadmap.overview))).toBe(true)

    const auditedIds = [...audit.matchAll(/\]\(\.\/cases\/([^/]+)\//gu)].map(
      (match) => match[1],
    )
    const roadmapIds = roadmap.cases.map((entry) => entry.id)
    const overviewIds = [
      ...overview.matchAll(/\]\(\.\/cases\/([^/]+)\//gu),
    ].map((match) => match[1])
    const catalogIds = readdirSync(resolve(directory, 'cases'), {
      withFileTypes: true,
    })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)

    expect(auditedIds).toHaveLength(188)
    expect(new Set(auditedIds).size).toBe(188)
    expect(roadmapIds).toHaveLength(188)
    expect(new Set(roadmapIds).size).toBe(188)
    expect(overviewIds).toHaveLength(188)
    expect(new Set(overviewIds).size).toBe(188)
    expect([...roadmapIds].sort()).toEqual([...auditedIds].sort())
    expect([...roadmapIds].sort()).toEqual([...overviewIds].sort())
    expect([...roadmapIds].sort()).toEqual([...catalogIds].sort())
    expect(roadmapIds).toContain('111-basic-sankey')
    expect(roadmapIds).toContain('111-sankey-flow')

    expect(countBy(roadmap.cases, 'disposition')).toEqual({
      'application-boundary': 2,
      'definition-now': 135,
      'first-party-primitive': 35,
      'inline-custom-mark': 1,
      'optional-primitive': 15,
    })
    expect(countBy(roadmap.cases, 'phase')).toEqual({
      'phase-0': 137,
      'phase-1': 2,
      'phase-2': 26,
      'phase-3': 11,
      'phase-4': 12,
    })

    const roadmapById = new Map(roadmap.cases.map((entry) => [entry.id, entry]))
    const auditRows = coverageRows(audit, false)
    const overviewRows = coverageRows(overview, true)
    expect(auditRows).toHaveLength(188)
    expect(overviewRows).toHaveLength(188)
    for (const row of auditRows) {
      expect(dispositionByLabel[row.disposition]).toBe(
        roadmapById.get(row.id)?.disposition,
      )
    }
    for (const row of overviewRows) {
      const entry = roadmapById.get(row.id)
      expect(dispositionByLabel[row.disposition]).toBe(entry?.disposition)
      expect([...row.capabilities].sort()).toEqual(
        [...(entry?.capabilities ?? [])].sort(),
      )
    }
  })

  it('keeps the capability graph valid and acyclic', () => {
    const phaseIds = roadmap.phases.map((phase) => phase.id)
    const phaseOrders = roadmap.phases.map((phase) => phase.order)
    const phaseOrder = new Map(
      roadmap.phases.map((phase) => [phase.id, phase.order]),
    )
    const capabilities = new Map(
      roadmap.capabilities.map((capability) => [capability.id, capability]),
    )

    expect(new Set(phaseIds).size).toBe(roadmap.phases.length)
    expect(new Set(phaseOrders).size).toBe(roadmap.phases.length)
    expect([...phaseOrders].sort((left, right) => left - right)).toEqual([
      0, 1, 2, 3, 4, 5,
    ])
    expect(capabilities.size).toBe(roadmap.capabilities.length)
    expect(countBy(roadmap.capabilities, 'status')).toEqual({ verified: 45 })

    const frictionIds = new Set(
      [...frictionLog.matchAll(/^### (F-\d{3}) —/gmu)].map((match) => match[1]),
    )

    for (const capability of roadmap.capabilities) {
      expect(capability.id).toMatch(/^[a-z][a-z0-9-]+$/u)
      expect(capability.title.trim()).not.toBe('')
      expect(phaseOrder.has(capability.phase)).toBe(true)
      expect(allowedCapabilityStatuses.has(capability.status)).toBe(true)
      expect(new Set(capability.dependsOn).size).toBe(
        capability.dependsOn.length,
      )
      for (const dependency of capability.dependsOn) {
        expect(capabilities.has(dependency)).toBe(true)
        expect(
          phaseOrder.get(capabilities.get(dependency)!.phase),
        ).toBeLessThanOrEqual(phaseOrder.get(capability.phase)!)
      }
      for (const frictionId of capability.frictionIds) {
        expect(frictionIds.has(frictionId)).toBe(true)
      }
      if (capability.tier === 'optional') {
        expect(capability.entryPoint).toMatch(/^@tanstack\/charts\//u)
        expect(capability.bundleFixture).toMatch(
          /^benchmarks\/entries\/.+\.ts$/u,
        )
      }
      if (capability.status === 'deferred') {
        expect(capability.reason?.trim()).not.toBe('')
      }
    }

    expect(() => assertAcyclic(capabilities)).not.toThrow()

    const usedCapabilities = new Set(
      roadmap.cases.flatMap((entry) => entry.capabilities),
    )
    expect(
      [...capabilities.keys()].filter((id) => !usedCapabilities.has(id)),
    ).toEqual([])

    for (const capability of roadmap.capabilities) {
      if (capability.status !== 'verified') continue
      expect(capability.evidence?.length).toBeGreaterThan(0)
      for (const evidence of capability.evidence ?? []) {
        expect(existsSync(resolve(directory, evidence))).toBe(true)
      }
      expect(
        roadmap.cases
          .filter((entry) => entry.capabilities.includes(capability.id))
          .every(
            (entry) =>
              entry.status === 'verified' ||
              entry.status === 'accepted-boundary',
          ),
      ).toBe(true)
    }
  })

  it('keeps work ownership and current source locations reviewable', async () => {
    const phases = new Map(
      roadmap.phases.map((phase) => [phase.id, phase.order]),
    )
    const capabilities = new Map(
      roadmap.capabilities.map((capability) => [capability.id, capability]),
    )
    const acceptedBoundaries = new Set([
      '85-scrollable-resource-lanes',
      '86-streaming-window-preservation',
      '116-geometry-morph',
    ])

    for (const entry of roadmap.cases) {
      const authoredClosure = new Set(
        (await loadTanStackSources(entry.id)).files.map((file) => file.path),
      )
      expect(allowedCoverage.has(entry.coverage)).toBe(true)
      expect(allowedDispositions.has(entry.disposition)).toBe(true)
      expect(allowedCaseStatuses.has(entry.status)).toBe(true)
      expect(phases.has(entry.phase)).toBe(true)
      expect(entry.capabilities.length).toBeGreaterThan(0)
      expect(new Set(entry.capabilities).size).toBe(entry.capabilities.length)
      expect(entry.work.length).toBeGreaterThan(0)
      expect(
        existsSync(resolve(directory, 'cases', entry.id, 'case.json')),
      ).toBe(true)

      for (const capabilityId of entry.capabilities) {
        const capability = capabilities.get(capabilityId)
        expect(capability).toBeDefined()
        expect(phases.get(capability!.phase)).toBeLessThanOrEqual(
          phases.get(entry.phase)!,
        )
      }

      for (const work of entry.work) {
        expect(allowedWorkKinds.has(work.kind)).toBe(true)
        expect(allowedStages.has(work.stage)).toBe(true)
        expect(allowedOwners.has(work.owner)).toBe(true)
        expect(allowedCoordinateSpaces.has(work.coordinateSpace)).toBe(true)
        expect(work.summary.trim()).not.toBe('')
        expect(work.sources.length).toBeGreaterThan(0)
        for (const source of work.sources) {
          expect(source).toMatch(
            /^(?:[a-zA-Z0-9][a-zA-Z0-9.-]*)(?:\/[a-zA-Z0-9][a-zA-Z0-9.-]*)*$/u,
          )
          const sourcePath = source.includes('/')
            ? resolve(repositoryRoot, source)
            : resolve(directory, 'cases', entry.id, source)
          if (source.includes('/')) {
            expect(source).toMatch(/^(?:benchmarks|docs|packages|scripts)\//u)
          } else {
            expect(
              authoredClosure.has(source),
              `${entry.id}: ${source} is not reachable from tanstack.ts`,
            ).toBe(true)
          }
          expect(existsSync(sourcePath)).toBe(true)
        }
      }

      if (entry.status === 'accepted-boundary') {
        expect(acceptedBoundaries.has(entry.id)).toBe(true)
        expect(
          entry.work.every(
            (work) => work.owner === 'application' || work.owner === 'case',
          ),
        ).toBe(true)
      } else {
        expect(acceptedBoundaries.has(entry.id)).toBe(false)
      }

      if (entry.status === 'verified' || entry.status === 'accepted-boundary') {
        expect(entry.evidence?.length).toBeGreaterThan(0)
        expect(
          entry.evidence?.some((evidence) =>
            evidence.startsWith(`cases/${entry.id}/`),
          ),
        ).toBe(true)
        for (const evidence of entry.evidence ?? []) {
          expect(existsSync(resolve(directory, evidence))).toBe(true)
        }
      }

      if (
        entry.disposition === 'first-party-primitive' ||
        entry.disposition === 'optional-primitive'
      ) {
        expect(entry.work.some((work) => work.owner === 'charts')).toBe(true)
      }
      if (entry.coverage === 'app-composed') {
        expect(entry.work.some((work) => work.owner === 'application')).toBe(
          true,
        )
      }
    }

    expect(
      roadmap.cases
        .filter((entry) => entry.status === 'accepted-boundary')
        .map((entry) => entry.id)
        .sort(),
    ).toEqual([...acceptedBoundaries].sort())
  })

  it('keeps local coverage-document links valid', () => {
    const documents = [
      roadmap.audit,
      roadmap.plan,
      roadmap.overview,
      'README.md',
    ]

    for (const document of documents) {
      const source = readFileSync(resolve(directory, document), 'utf8')
      const links = [...source.matchAll(/\]\((\.[^)#\s]+)(?:#[^)]*)?\)/gu)]
      for (const [, link] of links) {
        expect(existsSync(resolve(directory, link!))).toBe(true)
      }
    }
  })
})

function countBy<T extends Record<TKey, string>, TKey extends keyof T>(
  entries: readonly T[],
  key: TKey,
): Record<string, number> {
  return Object.fromEntries(
    [
      ...entries.reduce((counts, entry) => {
        const value = entry[key]
        counts.set(value, (counts.get(value) ?? 0) + 1)
        return counts
      }, new Map<string, number>()),
    ].sort(([left], [right]) => left.localeCompare(right)),
  )
}

function assertAcyclic(capabilities: Map<string, RoadmapCapability>) {
  const visited = new Set<string>()
  const active = new Set<string>()

  const visit = (id: string) => {
    if (visited.has(id)) return
    if (active.has(id)) throw new TypeError(`Capability cycle at ${id}`)
    active.add(id)
    for (const dependency of capabilities.get(id)?.dependsOn ?? []) {
      visit(dependency)
    }
    active.delete(id)
    visited.add(id)
  }

  for (const id of capabilities.keys()) visit(id)
}

function coverageRows(source: string, withCapabilities: boolean) {
  const rows = [
    ...source.matchAll(
      /^\| \[[^\]]+\]\(\.\/cases\/([^/]+)\/[^)]+\)\s+\| (Definition now|First-party primitive|Optional primitive|Application boundary|Inline custom mark)\s+\| ([^|\n]+)\|/gmu,
    ),
  ]
  return rows.map((match) => ({
    id: match[1]!,
    disposition: match[2]!,
    capabilities: withCapabilities
      ? [...match[3]!.matchAll(/`([^`]+)`/gu)].map((value) => value[1]!)
      : [],
  }))
}
